import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Mail, Phone, Globe, MapPin, Star, Copy, Check,
  ExternalLink, Plus, Building2, Clock, Send, Eye, MousePointer
} from "lucide-react";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

interface Lead {
  id: string;
  company_name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  portfolio_type: string | null;
  google_rating: number | null;
  review_count: number | null;
  hunter_io_score: number | null;
  email_status: string | null;
  ai_email_subject: string | null;
  ai_email_body: string | null;
  status: string;
  priority: string | null;
  notes: string | null;
  internal_notes: string | null;
  created_at: string;
}

interface OutreachLog {
  id: string;
  contact_method: string;
  outcome: string | null;
  notes: string | null;
  created_at: string;
}

interface EmailTracking {
  id: string;
  tracking_id: string;
  subject: string;
  sent_at: string;
  opened_at: string | null;
  open_count: number;
  clicked_at: string | null;
  click_count: number;
  status: string;
}

interface LeadDetailModalProps {
  lead: Lead;
  open: boolean;
  onClose: () => void;
}

export default function LeadDetailModal({ lead, open, onClose }: LeadDetailModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [notes, setNotes] = useState(lead.notes || '');
  const [status, setStatus] = useState(lead.status);
  const [priority, setPriority] = useState(lead.priority || 'medium');
  const [showOutreachForm, setShowOutreachForm] = useState(false);
  const [outreachMethod, setOutreachMethod] = useState('email');
  const [outreachOutcome, setOutreachOutcome] = useState('email_sent');
  const [outreachNotes, setOutreachNotes] = useState('');
  const [isSending, setIsSending] = useState(false);

  const { data: outreachLogs = [] } = useQuery({
    queryKey: ['outreach-logs', lead.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outreach_log')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as OutreachLog[];
    },
  });

  const { data: emailTracking = [], refetch: refetchTracking } = useQuery({
    queryKey: ['email-tracking', lead.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_tracking')
        .select('*')
        .eq('lead_id', lead.id)
        .order('sent_at', { ascending: false });
      if (error) throw error;
      return data as EmailTracking[];
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: async (updates: { status?: Database["public"]["Enums"]["lead_status"]; priority?: string; notes?: string }) => {
      const { error } = await supabase
        .from('drone_leads')
        .update(updates)
        .eq('id', lead.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drone-leads'] });
      toast({ title: "Lead updated" });
    },
  });

  const addOutreachMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('outreach_log')
        .insert({
          lead_id: lead.id,
          contact_method: outreachMethod as Database["public"]["Enums"]["outreach_contact_method"],
          outcome: outreachOutcome as Database["public"]["Enums"]["outreach_outcome"],
          notes: outreachNotes,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outreach-logs', lead.id] });
      setShowOutreachForm(false);
      setOutreachNotes('');
      toast({ title: "Outreach logged" });
    },
  });

  const copyEmail = async () => {
    const emailContent = `Subject: ${lead.ai_email_subject}\n\n${lead.ai_email_body}`;
    await navigator.clipboard.writeText(emailContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendTrackedEmail = async () => {
    if (!lead.email || !lead.ai_email_subject || !lead.ai_email_body) {
      toast({ title: "Missing email data", variant: "destructive" });
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-tracked-email', {
        body: {
          leadId: lead.id,
          recipientEmail: lead.email,
          subject: lead.ai_email_subject,
          body: lead.ai_email_body,
        },
      });

      if (error) throw error;

      toast({ title: "Email sent successfully!" });
      refetchTracking();
      queryClient.invalidateQueries({ queryKey: ['outreach-logs', lead.id] });

      // Update lead status if still new
      if (lead.status === 'new') {
        updateLeadMutation.mutate({ status: 'contacted' });
      }
    } catch (error: unknown) {
      console.error('Failed to send email:', error);
      const message = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Failed to send email",
        description: message,
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSave = () => {
    updateLeadMutation.mutate({ status, priority, notes });
  };

  const handleConvertToClient = () => {
    updateLeadMutation.mutate({ status: 'client' });
    onClose();
  };

  // Calculate email stats
  const emailStats = {
    totalSent: emailTracking.length,
    totalOpens: emailTracking.reduce((sum, e) => sum + e.open_count, 0),
    uniqueOpens: emailTracking.filter(e => e.opened_at).length,
    totalClicks: emailTracking.reduce((sum, e) => sum + e.click_count, 0),
    openRate: emailTracking.length > 0
      ? Math.round((emailTracking.filter(e => e.opened_at).length / emailTracking.length) * 100)
      : 0,
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {lead.company_name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="email">AI Email</TabsTrigger>
            <TabsTrigger value="tracking">Tracking</TabsTrigger>
            <TabsTrigger value="outreach">Outreach</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                {lead.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${lead.email}`} className="hover:underline">
                      {lead.email}
                    </a>
                    {lead.hunter_io_score && (
                      <Badge variant="outline" className="text-xs">
                        Hunter: {lead.hunter_io_score}%
                      </Badge>
                    )}
                  </div>
                )}
                {lead.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${lead.phone}`} className="hover:underline">
                      {lead.phone}
                    </a>
                  </div>
                )}
                {lead.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline flex items-center gap-1"
                    >
                      {new URL(lead.website).hostname}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                {(lead.city || lead.address) && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{lead.address || `${lead.city}, ${lead.state}`}</span>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                {lead.portfolio_type && (
                  <Badge variant="secondary">{lead.portfolio_type}</Badge>
                )}
                {lead.google_rating && (
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 text-amber-500" />
                    <span>{lead.google_rating} ({lead.review_count} reviews)</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Added {format(new Date(lead.created_at), 'MMM d, yyyy')}</span>
                </div>
              </div>
            </div>

            {/* Status & Priority */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="responded">Responded</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this lead..."
                rows={4}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} disabled={updateLeadMutation.isPending}>
                Save Changes
              </Button>
              {status !== 'client' && (
                <Button variant="outline" onClick={handleConvertToClient}>
                  Convert to Client
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-4 mt-4">
            {lead.ai_email_subject && lead.ai_email_body ? (
              <>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input value={lead.ai_email_subject} readOnly className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Body</Label>
                  <Textarea
                    value={lead.ai_email_body}
                    readOnly
                    rows={10}
                    className="bg-muted font-mono text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={copyEmail} variant="outline" className="gap-2">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copied!' : 'Copy Email'}
                  </Button>
                  <Button
                    onClick={sendTrackedEmail}
                    disabled={isSending || !lead.email}
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {isSending ? 'Sending...' : 'Send with Tracking'}
                  </Button>
                </div>
                {!lead.email && (
                  <p className="text-sm text-amber-600">
                    No email address available. Cannot send tracked email.
                  </p>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No AI email draft available for this lead.</p>
                <p className="text-sm">Email drafts are generated when a valid email is found.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="tracking" className="space-y-4 mt-4">
            {/* Email Stats Summary */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-muted rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{emailStats.totalSent}</div>
                <div className="text-xs text-muted-foreground">Emails Sent</div>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-600">{emailStats.uniqueOpens}</div>
                <div className="text-xs text-muted-foreground">Unique Opens</div>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">{emailStats.openRate}%</div>
                <div className="text-xs text-muted-foreground">Open Rate</div>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-purple-600">{emailStats.totalClicks}</div>
                <div className="text-xs text-muted-foreground">Link Clicks</div>
              </div>
            </div>

            {/* Email History */}
            <div className="space-y-2">
              <h4 className="font-medium">Email History</h4>
              {emailTracking.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Send className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No tracked emails sent yet.</p>
                  <p className="text-sm">Send an email from the AI Email tab to start tracking.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {emailTracking.map((email) => (
                    <div key={email.id} className="border rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium truncate flex-1 mr-2">{email.subject}</span>
                        <Badge
                          variant={email.opened_at ? "default" : "secondary"}
                          className={email.opened_at ? "bg-green-600" : ""}
                        >
                          {email.opened_at ? 'Opened' : 'Sent'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Send className="h-3 w-3" />
                          {format(new Date(email.sent_at), 'MMM d, h:mm a')}
                        </span>
                        {email.opened_at && (
                          <span className="flex items-center gap-1 text-green-600">
                            <Eye className="h-3 w-3" />
                            {email.open_count}x ({format(new Date(email.opened_at), 'MMM d, h:mm a')})
                          </span>
                        )}
                        {email.clicked_at && (
                          <span className="flex items-center gap-1 text-purple-600">
                            <MousePointer className="h-3 w-3" />
                            {email.click_count}x
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="outreach" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Outreach History</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOutreachForm(!showOutreachForm)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Outreach
              </Button>
            </div>

            {showOutreachForm && (
              <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Method</Label>
                    <Select value={outreachMethod} onValueChange={setOutreachMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="call">Call</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Outcome</Label>
                    <Select value={outreachOutcome} onValueChange={setOutreachOutcome}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email_sent">Email Sent</SelectItem>
                        <SelectItem value="no_answer">No Answer</SelectItem>
                        <SelectItem value="voicemail">Voicemail</SelectItem>
                        <SelectItem value="spoke">Spoke</SelectItem>
                        <SelectItem value="meeting_scheduled">Meeting Scheduled</SelectItem>
                        <SelectItem value="not_interested">Not Interested</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={outreachNotes}
                    onChange={(e) => setOutreachNotes(e.target.value)}
                    placeholder="Add notes about this outreach..."
                    rows={3}
                  />
                </div>
                <Button
                  onClick={() => addOutreachMutation.mutate()}
                  disabled={addOutreachMutation.isPending}
                >
                  Log Outreach
                </Button>
              </div>
            )}

            <div className="space-y-2">
              {outreachLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No outreach logged yet.
                </p>
              ) : (
                outreachLogs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{log.contact_method}</Badge>
                        {log.outcome && (
                          <Badge variant="secondary">{log.outcome.replace('_', ' ')}</Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    {log.notes && (
                      <p className="text-muted-foreground mt-1">{log.notes}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
