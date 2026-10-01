import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { OfficeMessage, OfficeMessageKind, OfficeSnapshot } from "@/lib/office";

// `office_snapshot` and `office_inbox` are not in the generated Database type
// (they were created for the agent office, outside the CRM schema), so the
// typed client rejects their names. This untyped view of the same client is
// confined to this file.
const db = supabase as unknown as SupabaseClient;

const MESSAGE_COLUMNS = "id, created_at, kind, digest_date, item, body, picked_up_at, ledger_line";

export interface OfficeData {
  snapshot: OfficeSnapshot | null;
  /** When the desktop last pushed. Null until the first push. */
  updatedAt: string | null;
  /** Newest first. */
  messages: OfficeMessage[];
}

export const OFFICE_QUERY_KEY = ["office"] as const;

export async function fetchOffice(): Promise<OfficeData> {
  const [snap, inbox] = await Promise.all([
    db.from("office_snapshot").select("payload, updated_at").eq("id", "current").maybeSingle(),
    db.from("office_inbox").select(MESSAGE_COLUMNS).order("created_at", { ascending: false }).limit(20),
  ]);
  if (snap.error) throw snap.error;
  if (inbox.error) throw inbox.error;
  return {
    snapshot: (snap.data?.payload as OfficeSnapshot | undefined) ?? null,
    updatedAt: (snap.data?.updated_at as string | undefined) ?? null,
    messages: (inbox.data ?? []) as OfficeMessage[],
  };
}

/**
 * The desktop pushes every 5 minutes, so polling faster than 2 buys nothing.
 * Refetch on focus is switched back ON for this one query (the app default is
 * off): coming back to the tab is exactly when stale office status misleads.
 */
export function useOffice() {
  return useQuery({
    queryKey: OFFICE_QUERY_KEY,
    queryFn: fetchOffice,
    staleTime: 60_000,
    refetchInterval: 120_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

export interface OfficeMessageInput {
  kind: OfficeMessageKind;
  body: string;
  /** Answers only: the Outbrief date and item number being answered. */
  digestDate?: string | null;
  item?: number | null;
}

/**
 * Sends one message to the office. Only these four columns are ever written:
 * `picked_up_at` and `ledger_line` belong to the desktop sync, and the database
 * grant does not let a browser set them.
 */
export function useSendOfficeMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: OfficeMessageInput): Promise<OfficeMessage> => {
      const body = input.body.trim();
      if (!body) throw new Error("Nothing to send.");
      const { data, error } = await db
        .from("office_inbox")
        .insert({
          kind: input.kind,
          body,
          digest_date: input.kind === "answer" ? input.digestDate ?? null : null,
          item: input.kind === "answer" ? input.item ?? null : null,
        })
        .select(MESSAGE_COLUMNS)
        .single();
      if (error) throw error;
      return data as OfficeMessage;
    },
    onSuccess: (sent) => {
      // Show it at once. The decision it answers closes on this render instead
      // of waiting for the next poll, which is what stops a second tap.
      queryClient.setQueryData<OfficeData>(OFFICE_QUERY_KEY, (old) =>
        old ? { ...old, messages: [sent, ...old.messages.filter((m) => m.id !== sent.id)] } : old
      );
    },
  });
}
