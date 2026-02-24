import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminNav from "./components/AdminNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, MessageSquare, Send, X, User, Clock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Message {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_name: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

interface Conversation {
  id: string;
  customer_email: string;
  customer_name: string;
  subject: string;
  status: string;
  last_message_at: string;
  created_at: string;
  messages: Message[];
}

export default function Messages() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          *,
          messages (*)
        `)
        .order("last_message_at", { ascending: false });

      if (error) throw error;
      return data as Conversation[];
    },
  });

  const sendReplyMutation = useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      // Insert the admin reply
      const { data: message, error: msgError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_type: "admin",
          sender_name: "Sentinel Aerial Inspections",
          content,
        })
        .select()
        .single();

      if (msgError) throw msgError;

      // Get conversation details for email
      const conversation = conversations.find((c) => c.id === conversationId);
      if (conversation) {
        // Trigger email notification to user
        await supabase.functions.invoke("send-message-notification", {
          body: {
            type: "admin_reply",
            conversation_id: conversationId,
            sender_name: conversation.customer_name,
            sender_email: conversation.customer_email,
            recipient_email: conversation.customer_email,
            content,
            subject: conversation.subject,
          },
        });
      }

      return message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setReplyContent("");
      toast.success("Reply sent successfully");
    },
    onError: (error) => {
      toast.error("Failed to send reply: " + error.message);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("conversations")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Status updated");
    },
  });

  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch =
      conv.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.customer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.subject.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || conv.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getUnreadCount = (conv: Conversation) => {
    return conv.messages.filter((m) => m.sender_type === "user" && !m.read_at).length;
  };

  const handleSendReply = () => {
    if (!selectedConversation || !replyContent.trim()) return;
    sendReplyMutation.mutate({
      conversationId: selectedConversation.id,
      content: replyContent.trim(),
    });
  };

  const markMessagesAsRead = async (conversationId: string) => {
    const conv = conversations.find((c) => c.id === conversationId);
    if (!conv) return;

    const unreadIds = conv.messages
      .filter((m) => m.sender_type === "user" && !m.read_at)
      .map((m) => m.id);

    if (unreadIds.length > 0) {
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .in("id", unreadIds);

      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Messages</h1>
            <p className="text-muted-foreground">Manage customer conversations</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {["all", "open", "closed"].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(status)}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Conversations List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filteredConversations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No conversations yet</h3>
              <p className="text-muted-foreground">
                Messages from customers will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredConversations.map((conv) => {
              const unreadCount = getUnreadCount(conv);
              const lastMessage = conv.messages[conv.messages.length - 1];

              return (
                <Card
                  key={conv.id}
                  className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                    unreadCount > 0 ? "border-primary" : ""
                  }`}
                  onClick={() => {
                    setSelectedConversation(conv);
                    markMessagesAsRead(conv.id);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{conv.customer_name}</span>
                          {unreadCount > 0 && (
                            <Badge variant="default" className="text-xs">
                              {unreadCount} new
                            </Badge>
                          )}
                          <Badge
                            variant={conv.status === "open" ? "outline" : "secondary"}
                          >
                            {conv.status}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-foreground mb-1">
                          {conv.subject}
                        </p>
                        {lastMessage && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {lastMessage.sender_type === "admin" ? "You: " : ""}
                            {lastMessage.content}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(conv.last_message_at), "MMM d, h:mm a")}
                        </div>
                        <div className="text-xs">{conv.customer_email}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Conversation Detail Dialog */}
        <Dialog
          open={!!selectedConversation}
          onOpenChange={(open) => !open && setSelectedConversation(null)}
        >
          <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle>{selectedConversation?.subject}</DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    {selectedConversation?.customer_name} ({selectedConversation?.customer_email})
                  </p>
                </div>
                {selectedConversation && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateStatusMutation.mutate({
                        id: selectedConversation.id,
                        status: selectedConversation.status === "open" ? "closed" : "open",
                      })
                    }
                  >
                    {selectedConversation.status === "open" ? "Close" : "Reopen"}
                  </Button>
                )}
              </div>
            </DialogHeader>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto space-y-4 py-4 min-h-[300px]">
              {selectedConversation?.messages
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                .map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_type === "admin" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        msg.sender_type === "admin"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-3 w-3" />
                        <span className="text-xs font-medium">{msg.sender_name}</span>
                        <span className="text-xs opacity-70">
                          {format(new Date(msg.created_at), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
            </div>

            {/* Reply Form */}
            {selectedConversation?.status === "open" && (
              <div className="flex gap-2 pt-4 border-t">
                <Textarea
                  placeholder="Type your reply..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="min-h-[80px]"
                />
                <Button
                  onClick={handleSendReply}
                  disabled={!replyContent.trim() || sendReplyMutation.isPending}
                  className="self-end"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
