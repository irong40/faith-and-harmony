import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, DollarSign, Camera, Video } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

interface EngagementFormModalProps {
  leadId: string;
  open: boolean;
  onClose: () => void;
}

export default function EngagementFormModal({ leadId, open, onClose }: EngagementFormModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    engagement_date: new Date().toISOString().split('T')[0],
    property_address: '',
    engagement_type: 'turnover',
    status: 'scheduled',
    quoted_price: '',
    actual_revenue: '',
    cost: '',
    photo_count: '',
    video_count: '',
    satisfaction_score: '',
    notes: '',
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('drone_engagements')
        .insert({
          lead_id: leadId,
          engagement_date: formData.engagement_date,
          property_address: formData.property_address || null,
          engagement_type: formData.engagement_type as Database["public"]["Enums"]["engagement_type"],
          status: formData.status as Database["public"]["Enums"]["engagement_status"],
          quoted_price: formData.quoted_price ? parseFloat(formData.quoted_price) : null,
          actual_revenue: formData.actual_revenue ? parseFloat(formData.actual_revenue) : null,
          cost: formData.cost ? parseFloat(formData.cost) : null,
          photo_count: formData.photo_count ? parseInt(formData.photo_count) : 0,
          video_count: formData.video_count ? parseInt(formData.video_count) : 0,
          satisfaction_score: formData.satisfaction_score ? parseInt(formData.satisfaction_score) : null,
          notes: formData.notes || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drone-clients'] });
      queryClient.invalidateQueries({ queryKey: ['engagement-stats'] });
      toast({ title: "Engagement created" });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Failed to create engagement",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Add Engagement
          </DialogTitle>
        </DialogHeader>

        <form 
          onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.engagement_date}
                onChange={(e) => setFormData(prev => ({ ...prev, engagement_date: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.engagement_type}
                onValueChange={(v) => setFormData(prev => ({ ...prev, engagement_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="turnover">Turnover</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="storm">Storm</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Property Address</Label>
            <Input
              value={formData.property_address}
              onChange={(e) => setFormData(prev => ({ ...prev, property_address: e.target.value }))}
              placeholder="123 Main St, City, VA"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Satisfaction (1-5)</Label>
              <Select
                value={formData.satisfaction_score}
                onValueChange={(v) => setFormData(prev => ({ ...prev, satisfaction_score: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Rate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Poor</SelectItem>
                  <SelectItem value="2">2 - Fair</SelectItem>
                  <SelectItem value="3">3 - Good</SelectItem>
                  <SelectItem value="4">4 - Great</SelectItem>
                  <SelectItem value="5">5 - Excellent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Quoted
              </Label>
              <Input
                type="number"
                step="0.01"
                value={formData.quoted_price}
                onChange={(e) => setFormData(prev => ({ ...prev, quoted_price: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Revenue
              </Label>
              <Input
                type="number"
                step="0.01"
                value={formData.actual_revenue}
                onChange={(e) => setFormData(prev => ({ ...prev, actual_revenue: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Cost
              </Label>
              <Input
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Camera className="h-3 w-3" /> Photos
              </Label>
              <Input
                type="number"
                value={formData.photo_count}
                onChange={(e) => setFormData(prev => ({ ...prev, photo_count: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Video className="h-3 w-3" /> Videos
              </Label>
              <Input
                type="number"
                value={formData.video_count}
                onChange={(e) => setFormData(prev => ({ ...prev, video_count: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending} className="flex-1">
              {createMutation.isPending ? 'Creating...' : 'Create Engagement'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
