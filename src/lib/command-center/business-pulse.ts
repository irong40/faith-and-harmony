import { supabase } from "@/integrations/supabase/client";

export interface LeadSignal { qualification_status: string }
export interface QuoteSignal { status: string }
export interface JobSignal { status: string; delivery_status: string | null; is_test: boolean }
export interface InvoiceSignal { status: string; balance_due: number | null }
export interface ObligationSignal { status: string; due_date: string }

export interface BusinessPulseSourceData {
  leads: readonly LeadSignal[];
  quotes: readonly QuoteSignal[];
  jobs: readonly JobSignal[];
  invoices: readonly InvoiceSignal[];
  obligations: readonly ObligationSignal[];
}

export interface BusinessPulseMetrics {
  openLeads: number;
  openQuotes: number;
  activeJobs: number;
  pendingDeliveries: number;
  outstandingRevenue: number;
  overdueCompliance: number;
}

export interface PulseMetric {
  value: number | null;
  error: string | null;
}

export interface BusinessPulseSnapshot {
  metrics: Record<keyof BusinessPulseMetrics, PulseMetric>;
  capturedAt: string;
}

export interface BusinessPulseLoaders {
  leads: () => Promise<readonly LeadSignal[]>;
  quotes: () => Promise<readonly QuoteSignal[]>;
  jobs: () => Promise<readonly JobSignal[]>;
  invoices: () => Promise<readonly InvoiceSignal[]>;
  obligations: () => Promise<readonly ObligationSignal[]>;
}

interface PulseQueryResult {
  data: unknown[] | null;
  error: unknown | null;
}

interface PulseQuery extends PromiseLike<PulseQueryResult> {
  select(columns: string): PulseQuery;
}

interface PulseClient {
  from(table: string): PulseQuery;
}

const pulseClient = supabase as unknown as PulseClient;

async function selectRows<T>(table: string, columns: string): Promise<T[]> {
  const { data, error } = await pulseClient.from(table).select(columns);
  if (error) throw error;
  return (data ?? []) as T[];
}

const defaultLoaders: BusinessPulseLoaders = {
  leads: () => selectRows<LeadSignal>("leads", "qualification_status"),
  quotes: () => selectRows<QuoteSignal>("quotes", "status"),
  jobs: () => selectRows<JobSignal>("drone_jobs", "status, delivery_status, is_test"),
  invoices: () => selectRows<InvoiceSignal>("invoices", "status, balance_due"),
  obligations: () => selectRows<ObligationSignal>("compliance_obligations", "status, due_date"),
};

export function aggregateBusinessPulse(
  data: BusinessPulseSourceData,
  now = new Date(),
): BusinessPulseMetrics {
  const today = now.toISOString().slice(0, 10);
  const leadTerminal = new Set(["converted", "disqualified", "closed"]);
  const quoteTerminal = new Set(["accepted", "declined", "expired", "cancelled"]);
  const jobTerminal = new Set(["delivered", "cancelled"]);
  const invoiceTerminal = new Set(["paid", "cancelled"]);
  const obligationTerminal = new Set(["complete", "waived"]);

  return {
    openLeads: data.leads.filter((lead) => !leadTerminal.has(lead.qualification_status)).length,
    openQuotes: data.quotes.filter((quote) => !quoteTerminal.has(quote.status)).length,
    activeJobs: data.jobs.filter((job) => !job.is_test && !jobTerminal.has(job.status)).length,
    pendingDeliveries: data.jobs.filter((job) => !job.is_test && job.delivery_status === "ready").length,
    outstandingRevenue: data.invoices
      .filter((invoice) => !invoiceTerminal.has(invoice.status))
      .reduce((sum, invoice) => sum + (invoice.balance_due ?? 0), 0),
    overdueCompliance: data.obligations.filter((obligation) => (
      obligation.status === "overdue"
      || (!obligationTerminal.has(obligation.status) && obligation.due_date < today)
    )).length,
  };
}

function errorMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === "object" && reason && "message" in reason) return String(reason.message);
  return "Source unavailable";
}

export async function loadBusinessPulse(
  loaders: BusinessPulseLoaders = defaultLoaders,
  now = new Date(),
): Promise<BusinessPulseSnapshot> {
  const [leads, quotes, jobs, invoices, obligations] = await Promise.allSettled([
    loaders.leads(),
    loaders.quotes(),
    loaders.jobs(),
    loaders.invoices(),
    loaders.obligations(),
  ]);

  const values = aggregateBusinessPulse({
    leads: leads.status === "fulfilled" ? leads.value : [],
    quotes: quotes.status === "fulfilled" ? quotes.value : [],
    jobs: jobs.status === "fulfilled" ? jobs.value : [],
    invoices: invoices.status === "fulfilled" ? invoices.value : [],
    obligations: obligations.status === "fulfilled" ? obligations.value : [],
  }, now);

  const metric = (value: number, result: PromiseSettledResult<unknown>): PulseMetric => (
    result.status === "fulfilled"
      ? { value, error: null }
      : { value: null, error: errorMessage(result.reason) }
  );

  return {
    metrics: {
      openLeads: metric(values.openLeads, leads),
      openQuotes: metric(values.openQuotes, quotes),
      activeJobs: metric(values.activeJobs, jobs),
      pendingDeliveries: metric(values.pendingDeliveries, jobs),
      outstandingRevenue: metric(values.outstandingRevenue, invoices),
      overdueCompliance: metric(values.overdueCompliance, obligations),
    },
    capturedAt: now.toISOString(),
  };
}
