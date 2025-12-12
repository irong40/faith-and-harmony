import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Send, X, Minimize2, Maximize2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Message {
  id: string;
  sender_type: string;
  sender_name: string;
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  subject: string;
  status: string;
  messages: Message[];
}

interface MessageWidgetProps {
  userEmail: string;
  userName: string;
  appCode?: string;
}

export default function MessageWidget({ userEmail, userName, appCode }: MessageWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [isNewConversation, setIsNewConversation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const unreadCount = conversations.reduce((count, conv) => {
    return count + conv.messages.filter((m) => m.sender_type === "admin").length;
  }, 0);

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("message-api/get-messages", {
        body: { user_email: userEmail },
      });

      if (error) throw error;
      setConversations(data.conversations || []);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  useEffect(() => {
    if (isOpen && userEmail) {
      fetchConversations();
    }
  }, [isOpen, userEmail]);

  // Set up realtime subscription
  useEffect(() => {
    if (!isOpen) return;

    const channel = supabase
      .channel("messages-widget")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, userEmail]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("message-api/submit-message", {
        body: {
          conversation_id: selectedConversation?.id,
          customer_email: userEmail,
          customer_name: userName,
          subject: isNewConversation ? newSubject : selectedConversation?.subject,
          content: newMessage.trim(),
          app_code: appCode,
        },
      });

      if (error) throw error;

      setNewMessage("");
      setNewSubject("");
      setIsNewConversation(false);

      // Refresh conversations
      await fetchConversations();

      // Select the conversation we just messaged
      if (data.conversation_id) {
        const updatedConv = conversations.find((c) => c.id === data.conversation_id);
        if (updatedConv) {
          setSelectedConversation(updatedConv);
        }
      }

      toast.success("Message sent!");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
        size="icon"
      >
        <MessageSquare className="h-6 w-6" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount}
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <Card
      className={`fixed bottom-6 right-6 shadow-2xl transition-all duration-200 ${
        isMinimized ? "w-72 h-14" : "w-96 h-[500px]"
      }`}
    >
      <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Messages</CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="p-0 flex flex-col h-[calc(100%-56px)]">
          {/* Conversation List or Thread View */}
          {selectedConversation || isNewConversation ? (
            <>
              {/* Thread Header */}
              <div className="px-4 py-2 border-b bg-muted/50">
                <Button
                  variant="ghost"
                  size="sm"
                  className="mb-1 -ml-2 text-xs"
                  onClick={() => {
                    setSelectedConversation(null);
                    setIsNewConversation(false);
                  }}
                >
                  ← Back
                </Button>
                <p className="font-medium text-sm">
                  {isNewConversation ? "New Conversation" : selectedConversation?.subject}
                </p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isNewConversation ? (
                  <div className="space-y-3">
                    <Input
                      placeholder="Subject"
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                    />
                  </div>
                ) : (
                  selectedConversation?.messages
                    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                    .map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_type === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                            msg.sender_type === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {format(new Date(msg.created_at), "h:mm a")}
                          </p>
                        </div>
                      </div>
                    ))
                )}
              </div>

              {/* Reply Input */}
              <div className="p-3 border-t">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="min-h-[60px] text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    onClick={handleSendMessage}
                    disabled={isLoading || !newMessage.trim() || (isNewConversation && !newSubject.trim())}
                    className="self-end"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Conversation List */}
              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No messages yet</p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setIsNewConversation(true)}
                    >
                      Start a conversation
                    </Button>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className="px-4 py-3 border-b hover:bg-accent/50 cursor-pointer"
                      onClick={() => setSelectedConversation(conv)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{conv.subject}</span>
                        <Badge variant={conv.status === "open" ? "outline" : "secondary"} className="text-xs">
                          {conv.status}
                        </Badge>
                      </div>
                      {conv.messages.length > 0 && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {conv.messages[conv.messages.length - 1].content}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* New Conversation Button */}
              <div className="p-3 border-t">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => setIsNewConversation(true)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  New Message
                </Button>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
