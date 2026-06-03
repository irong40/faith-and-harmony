import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  decision_date: z.string().min(1, "Decision date is required"),
  title: z.string().min(1, "Title is required").max(200),
  context: z.string().optional(),
  outcome: z.string().min(1, "Outcome is required"),
  action_items: z.string().optional(),
  participants: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function DecisionLoggerDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      decision_date: new Date().toISOString().split("T")[0],
      title: "",
      context: "",
      outcome: "",
      action_items: "",
      participants: "D. Pierce (Founder/Managing Member)",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const actionItems = values.action_items
        ? values.action_items.split("\n").filter(Boolean)
        : [];

      let participantsList = values.participants
        ? values.participants.split("\n").filter(Boolean)
        : [];

      if (participantsList.length === 0) {
        participantsList = ["D. Pierce (Founder/Managing Member)"];
      }

      const month = new Date(values.decision_date).getMonth() + 1;
      const quarter = `Q${Math.ceil(month / 3)}`;
      const fiscalYear = new Date(values.decision_date).getFullYear();

      const { error } = await supabase
        .from("governance_decisions" as never)
        .insert({
          decision_date: values.decision_date,
          title: values.title,
          context: values.context || null,
          outcome: values.outcome,
          action_items: actionItems,
          participants: participantsList,
          quarter,
          fiscal_year: fiscalYear,
        } as never);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Decision logged");
      queryClient.invalidateQueries({ queryKey: ["governance-decisions"] });
      setOpen(false);
      reset();
    },
    onError: () => {
      toast.error("Failed to log decision");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Log Decision
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Log Governance Decision</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="decision_date">Decision Date</Label>
            <Input type="date" id="decision_date" {...register("decision_date")} />
            {errors.decision_date && (
              <p className="text-xs text-destructive">{errors.decision_date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" placeholder="Brief decision title" {...register("title")} />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">Context (optional)</Label>
            <Textarea
              id="context"
              placeholder="Background or reasoning"
              {...register("context")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="outcome">Outcome</Label>
            <Textarea
              id="outcome"
              placeholder="What was decided"
              {...register("outcome")}
            />
            {errors.outcome && (
              <p className="text-xs text-destructive">{errors.outcome.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="action_items">Action Items (one per line)</Label>
            <Textarea
              id="action_items"
              placeholder="One action item per line"
              {...register("action_items")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="participants">Participants (one per line)</Label>
            <Textarea
              id="participants"
              placeholder="One participant per line"
              {...register("participants")}
            />
          </div>

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Decision"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
