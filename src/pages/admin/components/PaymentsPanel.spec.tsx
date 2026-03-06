import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PaymentsPanel from "./PaymentsPanel";

// Mock Supabase client
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockFrom = vi.fn();

let mockPayments: Array<Record<string, unknown>> = [];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => {
      mockFrom(...args);
      return {
        select: (...sArgs: unknown[]) => {
          mockSelect(...sArgs);
          return {
            eq: (...eArgs: unknown[]) => {
              mockEq(...eArgs);
              return {
                order: (...oArgs: unknown[]) => {
                  mockOrder(...oArgs);
                  return Promise.resolve({ data: mockPayments, error: null });
                },
              };
            },
          };
        },
      };
    },
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("PaymentsPanel", () => {
  beforeEach(() => {
    mockPayments = [];
    vi.clearAllMocks();
  });

  it("renders 'No payments found' when payments array is empty", async () => {
    render(<PaymentsPanel jobId="job-1" />, { wrapper: createWrapper() });
    expect(await screen.findByText("No payments found")).toBeTruthy();
  });

  it("renders deposit and balance rows with correct amounts when both exist", async () => {
    mockPayments = [
      {
        id: "p1",
        payment_type: "deposit",
        status: "paid",
        amount: 22500,
        square_invoice_url: null,
        customer_email: "test@example.com",
        due_date: null,
        paid_at: "2026-03-01T12:00:00Z",
        created_at: "2026-02-28T12:00:00Z",
      },
      {
        id: "p2",
        payment_type: "balance",
        status: "pending",
        amount: 22500,
        square_invoice_url: null,
        customer_email: "test@example.com",
        due_date: "2026-03-15",
        paid_at: null,
        created_at: "2026-03-05T12:00:00Z",
      },
    ];

    render(<PaymentsPanel jobId="job-1" />, { wrapper: createWrapper() });

    expect(await screen.findByText("Deposit")).toBeTruthy();
    expect(screen.getByText("Balance")).toBeTruthy();
    expect(screen.getAllByText("$225.00").length).toBe(2);
  });

  it("shows 'Paid' badge for status === 'paid'", async () => {
    mockPayments = [
      {
        id: "p1",
        payment_type: "deposit",
        status: "paid",
        amount: 10000,
        square_invoice_url: null,
        customer_email: null,
        due_date: null,
        paid_at: "2026-03-01T12:00:00Z",
        created_at: "2026-02-28T12:00:00Z",
      },
    ];

    render(<PaymentsPanel jobId="job-1" />, { wrapper: createWrapper() });
    const badge = await screen.findByText("Paid");
    expect(badge).toBeTruthy();
  });

  it("shows 'Pending' badge for status === 'pending'", async () => {
    mockPayments = [
      {
        id: "p1",
        payment_type: "deposit",
        status: "pending",
        amount: 10000,
        square_invoice_url: null,
        customer_email: null,
        due_date: null,
        paid_at: null,
        created_at: "2026-02-28T12:00:00Z",
      },
    ];

    render(<PaymentsPanel jobId="job-1" />, { wrapper: createWrapper() });
    const badge = await screen.findByText("Pending");
    expect(badge).toBeTruthy();
  });

  it("shows 'Overdue' badge for status === 'overdue'", async () => {
    mockPayments = [
      {
        id: "p1",
        payment_type: "balance",
        status: "overdue",
        amount: 30000,
        square_invoice_url: null,
        customer_email: null,
        due_date: "2026-02-20",
        paid_at: null,
        created_at: "2026-02-10T12:00:00Z",
      },
    ];

    render(<PaymentsPanel jobId="job-1" />, { wrapper: createWrapper() });
    const badge = await screen.findByText("Overdue");
    expect(badge).toBeTruthy();
  });

  it("shows Square invoice link when square_invoice_url is present", async () => {
    mockPayments = [
      {
        id: "p1",
        payment_type: "deposit",
        status: "paid",
        amount: 10000,
        square_invoice_url: "https://squareup.com/invoice/123",
        customer_email: null,
        due_date: null,
        paid_at: "2026-03-01T12:00:00Z",
        created_at: "2026-02-28T12:00:00Z",
      },
    ];

    render(<PaymentsPanel jobId="job-1" />, { wrapper: createWrapper() });
    await screen.findByText("Deposit");
    const link = screen.getByRole("link", { name: /square/i });
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toBe("https://squareup.com/invoice/123");
  });

  it("renders paid_at date when payment is paid", async () => {
    mockPayments = [
      {
        id: "p1",
        payment_type: "deposit",
        status: "paid",
        amount: 10000,
        square_invoice_url: null,
        customer_email: null,
        due_date: null,
        paid_at: "2026-03-01T12:00:00Z",
        created_at: "2026-02-28T12:00:00Z",
      },
    ];

    render(<PaymentsPanel jobId="job-1" />, { wrapper: createWrapper() });
    await screen.findByText("Deposit");
    expect(screen.getByText(/Mar 1/)).toBeTruthy();
  });
});
