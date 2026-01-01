import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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

interface ManualLeadFormProps {
  open: boolean;
  onClose: () => void;
}

export default function ManualLeadForm({ open, onClose }: ManualLeadFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    company_name: "",
    email: "",
    phone: "",
    website: "",
    city: "",
    state: "VA",
    portfolio_type: "",
    priority: "medium",
    notes: "",
  });

  const createLeadMutation = useMutation({
    mutationFn: async () => {
      if (!formData.company_name.trim()) {
        throw new Error("Company name is required");
      }
      
      const { error } = await supabase
        .from('drone_leads')
        .insert({
          company_name: formData.company_name.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          website: formData.website.trim() || null,
          city: formData.city.trim() || null,
          state: formData.state || null,
          portfolio_type: formData.portfolio_type || null,
          priority: formData.priority,
          notes: formData.notes.trim() || null,
          status: 'new',
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drone-leads'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] });
      toast({ title: "Lead created successfully" });
      handleClose();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to create lead", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleClose = () => {
    setFormData({
      company_name: "",
      email: "",
      phone: "",
      website: "",
      city: "",
      state: "VA",
      portfolio_type: "",
      priority: "medium",
      notes: "",
    });
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createLeadMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Lead Manually</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company_name">Company Name *</Label>
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              placeholder="ABC Property Management"
              maxLength={200}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contact@company.com"
                maxLength={255}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(555) 123-4567"
                maxLength={20}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://company.com"
              maxLength={500}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Richmond"
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Select 
                value={formData.state} 
                onValueChange={(value) => setFormData({ ...formData, state: value })}
              >
                <SelectTrigger id="state">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VA">Virginia</SelectItem>
                  <SelectItem value="MD">Maryland</SelectItem>
                  <SelectItem value="DC">D.C.</SelectItem>
                  <SelectItem value="NC">North Carolina</SelectItem>
                  <SelectItem value="WV">West Virginia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="portfolio_type">Portfolio Type</Label>
              <Select 
                value={formData.portfolio_type} 
                onValueChange={(value) => setFormData({ ...formData, portfolio_type: value })}
              >
                <SelectTrigger id="portfolio_type">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="mixed">Mixed Use</SelectItem>
                  <SelectItem value="hoa">HOA</SelectItem>
                  <SelectItem value="construction">Construction</SelectItem>
                  <SelectItem value="real_estate">Real Estate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger id="priority">
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

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="How did you find this lead? Any relevant context..."
              rows={3}
              maxLength={1000}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createLeadMutation.isPending}>
              {createLeadMutation.isPending ? "Creating..." : "Create Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
