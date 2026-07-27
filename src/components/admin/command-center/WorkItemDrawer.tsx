import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ExternalLink, Loader2, MessageSquareText, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  useAddWorkItemComment,
  useCreateWorkItem,
  useUpdateWorkItem,
  useWorkItemActivity,
} from "@/hooks/useWorkItems";
import {
  DEPARTMENTS,
  WORK_ITEM_PRIORITIES,
  WORK_ITEM_STATUSES,
  WORK_ITEM_TYPES,
  type WorkItem,
} from "@/types/command-center";

const workItemSchema = z.object({
  title: z.string().trim().min(1, "Enter a title").max(240),
  description: z.string().max(10000),
  item_type: z.enum(WORK_ITEM_TYPES),
  department: z.enum(DEPARTMENTS),
  status: z.enum(WORK_ITEM_STATUSES),
  priority: z.enum(WORK_ITEM_PRIORITIES),
  due_at: z.string(),
});

type WorkItemForm = z.infer<typeof workItemSchema>;

interface WorkItemDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: WorkItem | null;
}

function toLocalDateTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function defaults(item: WorkItem | null): WorkItemForm {
  return {
    title: item?.title ?? "",
    description: item?.description ?? "",
    item_type: item?.item_type ?? "task",
    department: item?.department ?? "executive",
    status: item?.status ?? "inbox",
    priority: item?.priority ?? "normal",
    due_at: toLocalDateTime(item?.due_at ?? null),
  };
}

const selectClassName = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export default function WorkItemDrawer({ open, onOpenChange, item }: WorkItemDrawerProps) {
  const createMutation = useCreateWorkItem();
  const updateMutation = useUpdateWorkItem();
  const commentMutation = useAddWorkItemComment(item?.id ?? "");
  const activity = useWorkItemActivity(item?.id ?? "");
  const [saveError, setSaveError] = useState<Error | null>(null);
  const [comment, setComment] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WorkItemForm>({
    resolver: zodResolver(workItemSchema),
    defaultValues: defaults(item),
  });

  useEffect(() => {
    reset(defaults(item));
    setSaveError(null);
    setComment("");
  }, [item, open, reset]);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const save = handleSubmit(async (values) => {
    setSaveError(null);
    const dueAt = values.due_at ? new Date(values.due_at).toISOString() : null;

    try {
      if (item) {
        await updateMutation.mutateAsync({
          id: item.id,
          input: {
            title: values.title,
            description: values.description || null,
            item_type: values.item_type,
            department: values.department,
            status: values.status,
            priority: values.priority,
            due_at: dueAt,
            version: item.version,
          },
        });
      } else {
        await createMutation.mutateAsync({
          title: values.title,
          description: values.description || null,
          item_type: values.item_type,
          department: values.department,
          status: values.status,
          priority: values.priority,
          due_at: dueAt,
        });
      }
      onOpenChange(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error : new Error("Save failed"));
    }
  });

  const approve = async () => {
    if (!item) return;
    setSaveError(null);
    try {
      await updateMutation.mutateAsync({
        id: item.id,
        input: { status: "done", version: item.version },
      });
      onOpenChange(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error : new Error("Update failed"));
    }
  };

  const postComment = async () => {
    if (!comment.trim()) return;
    await commentMutation.mutateAsync(comment.trim());
    setComment("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <SheetHeader className="border-b bg-card px-6 py-5 pr-14">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {item ? `Work ${item.id.slice(0, 8)}` : "New company work"}
          </p>
          <SheetTitle className="text-xl">
            {item ? item.title : "New work item"}
          </SheetTitle>
          <SheetDescription>
            {item
              ? "Update the operational record. Changes become part of its lifecycle history."
              : "Create a task, approval, decision, risk, or blocker for the company."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {item?.status === "needs_approval" && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-5 text-amber-800" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-950">Your approval is required</p>
                  <p className="mt-1 text-sm text-amber-800">Approve this item to complete the decision.</p>
                  <Button size="sm" className="mt-3" onClick={approve} disabled={isSaving}>
                    Approve and complete
                  </Button>
                </div>
              </div>
            </div>
          )}

          {saveError && (
            <Alert variant="destructive" className="mb-6">
              <AlertTitle>Could not save work item</AlertTitle>
              <AlertDescription>Your entries are still here. Check the connection and try again.</AlertDescription>
            </Alert>
          )}

          <form id="work-item-form" onSubmit={save} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="work-title">Title</Label>
              <Input id="work-title" {...register("title")} aria-invalid={Boolean(errors.title)} />
              {errors.title && <p className="text-xs font-medium text-destructive">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="work-description">Description</Label>
              <Textarea id="work-description" rows={4} {...register("description")} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="work-type">Type</Label>
                <select id="work-type" className={selectClassName} {...register("item_type")}>
                  {WORK_ITEM_TYPES.map((type) => <option key={type} value={type}>{type.replace("_", " ")}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="work-department">Department</Label>
                <select id="work-department" className={selectClassName} {...register("department")}>
                  {DEPARTMENTS.map((department) => <option key={department} value={department}>{department}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="work-status">Status</Label>
                <select id="work-status" className={selectClassName} {...register("status")}>
                  {WORK_ITEM_STATUSES.map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="work-priority">Priority</Label>
                <select id="work-priority" className={selectClassName} {...register("priority")}>
                  {WORK_ITEM_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="work-due-at">Due date</Label>
              <Input id="work-due-at" type="datetime-local" {...register("due_at")} />
            </div>
          </form>

          {item?.source_system === "crm" && item.source_ref && (
            <a
              href={item.source_ref}
              className="mt-6 flex items-center justify-between rounded-xl border bg-muted/20 p-4 text-sm font-medium outline-none ring-ring transition-colors hover:bg-muted/40 focus-visible:ring-2"
              aria-label="Open related CRM record"
            >
              <span>Related CRM record</span>
              <ExternalLink className="size-4" />
            </a>
          )}

          {item && (
            <section className="mt-8 border-t pt-6">
              <div className="mb-4 flex items-center gap-2">
                <MessageSquareText className="size-4" />
                <h3 className="text-sm font-semibold">Discussion and activity</h3>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="work-comment" className="sr-only">Add comment</Label>
                  <Input
                    id="work-comment"
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Add context or a decision note"
                  />
                </div>
                <Button type="button" variant="outline" onClick={postComment} disabled={!comment.trim() || commentMutation.isPending}>
                  Post comment
                </Button>
              </div>
              <div className="mt-4 space-y-2">
                {activity.isLoading && <p className="text-sm text-muted-foreground">Loading activity</p>}
                {!activity.isLoading && !activity.data?.length && (
                  <p className="rounded-lg bg-muted/20 p-3 text-sm text-muted-foreground">No lifecycle events yet.</p>
                )}
                {activity.data?.map((event) => (
                  <div key={event.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                    <span className="capitalize">{event.event_type.replace("_", " ")}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {new Date(event.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t bg-card px-6 py-4">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="work-item-form" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
            {item ? "Save changes" : "Create work item"}
          </Button>
        </footer>
      </SheetContent>
    </Sheet>
  );
}
