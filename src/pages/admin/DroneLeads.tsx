import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { supabase } from "@/integrations/supabase/client";
import AdminNav from "./components/AdminNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Users, Mail, Phone, Zap, Plus, Building2, MapPin, Star } from "lucide-react";
import LeadDetailModal from "./components/LeadDetailModal";
import LeadGenModal from "./components/LeadGenModal";

type LeadStatus = 'new' | 'contacted' | 'responded' | 'qualified' | 'client';

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
  status: LeadStatus;
  priority: string | null;
  notes: string | null;
  internal_notes: string | null;
  created_at: string;
}

const statusColumns: { id: LeadStatus; label: string; color: string }[] = [
  { id: 'new', label: 'New', color: 'bg-purple-500' },
  { id: 'contacted', label: 'Contacted', color: 'bg-gray-500' },
  { id: 'responded', label: 'Responded', color: 'bg-blue-500' },
  { id: 'qualified', label: 'Qualified', color: 'bg-green-500' },
  { id: 'client', label: 'Client', color: 'bg-amber-500' },
];

export default function DroneLeads() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadGen, setShowLeadGen] = useState(false);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['drone-leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drone_leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
  });

  const { data: pipelineStats } = useQuery({
    queryKey: ['pipeline-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drone_pipeline_summary')
        .select('*');
      if (error) throw error;
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LeadStatus }) => {
      const { error } = await supabase
        .from('drone_leads')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drone-leads'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update lead status",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const leadId = result.draggableId;
    const newStatus = result.destination.droppableId as LeadStatus;
    
    updateStatusMutation.mutate({ id: leadId, status: newStatus });
  };

  const getLeadsByStatus = (status: LeadStatus) => 
    leads.filter(lead => lead.status === status);

  const totalLeads = leads.length;
  const withEmail = leads.filter(l => l.email).length;
  const newThisWeek = leads.filter(l => {
    const created = new Date(l.created_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return created > weekAgo;
  }).length;

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Drone Leads Pipeline</h1>
            <p className="text-muted-foreground">Manage and track your drone service leads</p>
          </div>
          <Button onClick={() => setShowLeadGen(true)} className="gap-2">
            <Zap className="h-4 w-4" />
            Run Lead Gen
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalLeads}</p>
                  <p className="text-sm text-muted-foreground">Total Leads</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Plus className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{newThisWeek}</p>
                  <p className="text-sm text-muted-foreground">New This Week</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Mail className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{withEmail}</p>
                  <p className="text-sm text-muted-foreground">With Email</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Phone className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{leads.filter(l => l.phone).length}</p>
                  <p className="text-sm text-muted-foreground">With Phone</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Kanban Board */}
        {isLoading ? (
          <div className="grid grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-96" />
            ))}
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto">
              {statusColumns.map(column => (
                <div key={column.id} className="min-w-[250px]">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-3 h-3 rounded-full ${column.color}`} />
                    <h3 className="font-semibold">{column.label}</h3>
                    <Badge variant="secondary" className="ml-auto">
                      {getLeadsByStatus(column.id).length}
                    </Badge>
                  </div>
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-2 min-h-[400px] p-2 rounded-lg transition-colors ${
                          snapshot.isDraggingOver ? 'bg-accent' : 'bg-muted/50'
                        }`}
                      >
                        {getLeadsByStatus(column.id).map((lead, index) => (
                          <Draggable key={lead.id} draggableId={lead.id} index={index}>
                            {(provided, snapshot) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`cursor-pointer hover:shadow-md transition-shadow ${
                                  snapshot.isDragging ? 'shadow-lg rotate-2' : ''
                                }`}
                                onClick={() => setSelectedLead(lead)}
                              >
                                <CardContent className="p-3">
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <h4 className="font-medium text-sm line-clamp-2">
                                      {lead.company_name}
                                    </h4>
                                    {lead.priority === 'high' && (
                                      <Badge variant="destructive" className="shrink-0 text-xs">
                                        High
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  {lead.portfolio_type && (
                                    <Badge variant="outline" className="mb-2 text-xs">
                                      {lead.portfolio_type}
                                    </Badge>
                                  )}
                                  
                                  <div className="space-y-1 text-xs text-muted-foreground">
                                    {lead.city && (
                                      <div className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        <span>{lead.city}, {lead.state}</span>
                                      </div>
                                    )}
                                    {lead.email && (
                                      <div className="flex items-center gap-1">
                                        <Mail className="h-3 w-3 text-green-500" />
                                        <span className="truncate">{lead.email}</span>
                                      </div>
                                    )}
                                    {lead.google_rating && (
                                      <div className="flex items-center gap-1">
                                        <Star className="h-3 w-3 text-amber-500" />
                                        <span>{lead.google_rating} ({lead.review_count} reviews)</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {lead.hunter_io_score && (
                                    <div className="mt-2 flex items-center gap-1">
                                      <div className="text-xs text-muted-foreground">Hunter:</div>
                                      <Badge 
                                        variant={lead.hunter_io_score >= 80 ? "default" : "secondary"}
                                        className="text-xs"
                                      >
                                        {lead.hunter_io_score}%
                                      </Badge>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        )}

        {selectedLead && (
          <LeadDetailModal
            lead={selectedLead}
            open={!!selectedLead}
            onClose={() => setSelectedLead(null)}
          />
        )}

        <LeadGenModal 
          open={showLeadGen} 
          onClose={() => setShowLeadGen(false)} 
        />
      </main>
    </div>
  );
}
