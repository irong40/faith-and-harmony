import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkItem } from "@/types/command-center";
import WorkItemDrawer from "./WorkItemDrawer";

const mutations = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  comment: vi.fn(),
  createError: null as Error | null,
  updateError: null as Error | null,
}));

vi.mock("@/hooks/useWorkItems", () => ({
  useCreateWorkItem: () => ({
    mutateAsync: mutations.create,
    isPending: false,
    error: mutations.createError,
  }),
  useUpdateWorkItem: () => ({
    mutateAsync: mutations.update,
    isPending: false,
    error: mutations.updateError,
  }),
  useAddWorkItemComment: () => ({
    mutateAsync: mutations.comment,
    isPending: false,
  }),
  useWorkItemActivity: () => ({ data: [], isLoading: false }),
}));

const approvalItem: WorkItem = {
  id: "work-1",
  title: "Approve crane inspection quote",
  description: "Confirm scope and margin.",
  item_type: "approval",
  department: "revenue",
  status: "needs_approval",
  priority: "urgent",
  owner_id: null,
  created_by: "user-1",
  due_at: null,
  completed_at: null,
  source_system: "crm",
  source_ref: "/admin/quote-requests?quote=quote-1",
  parent_id: null,
  version: 3,
  created_at: "2026-07-27T12:00:00.000Z",
  updated_at: "2026-07-27T12:00:00.000Z",
};

describe("WorkItemDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutations.createError = null;
    mutations.updateError = null;
    mutations.create.mockResolvedValue({ id: "new-work" });
    mutations.update.mockResolvedValue({ ...approvalItem, status: "done" });
    mutations.comment.mockResolvedValue({ id: "comment-1" });
  });

  it("validates and creates a work item", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<WorkItemDrawer open onOpenChange={onOpenChange} item={null} />);

    await user.click(screen.getByRole("button", { name: "Create work item" }));
    expect(await screen.findByText("Enter a title")).toBeInTheDocument();
    expect(mutations.create).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Title"), "Review FAA renewal");
    await user.selectOptions(screen.getByLabelText("Department"), "compliance");
    await user.click(screen.getByRole("button", { name: "Create work item" }));

    await waitFor(() => expect(mutations.create).toHaveBeenCalledWith(expect.objectContaining({
      title: "Review FAA renewal",
      department: "compliance",
      status: "inbox",
    })));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("approves an item with its current optimistic version", async () => {
    const user = userEvent.setup();
    render(<WorkItemDrawer open onOpenChange={vi.fn()} item={approvalItem} />);

    await user.click(screen.getByRole("button", { name: "Approve and complete" }));

    expect(mutations.update).toHaveBeenCalledWith({
      id: approvalItem.id,
      input: { status: "done", version: approvalItem.version },
    });
  });

  it("adds a comment and exposes the linked CRM record", async () => {
    const user = userEvent.setup();
    render(<WorkItemDrawer open onOpenChange={vi.fn()} item={approvalItem} />);

    expect(screen.getByRole("link", { name: "Open related CRM record" }))
      .toHaveAttribute("href", approvalItem.source_ref);
    await user.type(screen.getByLabelText("Add comment"), "Approved after margin review");
    await user.click(screen.getByRole("button", { name: "Post comment" }));

    expect(mutations.comment).toHaveBeenCalledWith("Approved after margin review");
  });

  it("keeps form input visible when save fails", async () => {
    const user = userEvent.setup();
    mutations.create.mockRejectedValue(new Error("Save failed"));
    render(<WorkItemDrawer open onOpenChange={vi.fn()} item={null} />);

    const title = screen.getByLabelText("Title");
    await user.type(title, "Keep this draft");
    await user.click(screen.getByRole("button", { name: "Create work item" }));

    expect(await screen.findByText("Could not save work item")).toBeInTheDocument();
    expect(title).toHaveValue("Keep this draft");
  });
});
