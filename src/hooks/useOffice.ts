import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  applyPresenceChange,
  PRESENCE_LOG_LIMIT,
  type OfficeMessage,
  type OfficeMessageKind,
  type OfficePresence,
  type OfficePresenceData,
  type OfficePresenceEvent,
  type OfficeSnapshot,
} from "@/lib/office";

export type { OfficePresenceData } from "@/lib/office";

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
    // 50, not 20: interest messages hold a sent mission out of Open until the snapshot
    // reports it; a short window could drop that hold during a failed push (Codex 2026-10-17).
    // The page still shows only the newest 8.
    db.from("office_inbox").select(MESSAGE_COLUMNS).order("created_at", { ascending: false }).limit(50),
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

// ---------------------------------------------------------------------------
// The office floor: live presence. Unlike the snapshot (pushed every 5
// minutes), these rows change the moment an agent checks in, so the page reads
// them once and then follows Realtime. Both tables are admin-read under RLS.
// ---------------------------------------------------------------------------

export const OFFICE_PRESENCE_KEY = ["office-presence"] as const;

export async function fetchOfficePresence(): Promise<OfficePresenceData> {
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const [rows, log] = await Promise.all([
    db.from("office_presence").select("*"),
    db
      .from("office_presence_log")
      .select("id, at, agent, event, job_id, text")
      .gte("at", since)
      .order("at", { ascending: false })
      .limit(PRESENCE_LOG_LIMIT),
  ]);
  if (rows.error) throw rows.error;
  if (log.error) throw log.error;
  return {
    presence: (rows.data ?? []) as OfficePresence[],
    events: ((log.data ?? []) as OfficePresenceEvent[]).reverse(),
  };
}

let channelSeq = 0;

/** "office-presence-<uuid>", unique per call even where crypto.randomUUID is missing. */
export function presenceChannelName(): string {
  channelSeq += 1;
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `office-presence-${id}-${channelSeq}`;
}

export function useOfficePresence() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: OFFICE_PRESENCE_KEY,
    queryFn: fetchOfficePresence,
    staleTime: 60_000,
    // Realtime carries the changes; this poll only repairs a dropped socket.
    refetchInterval: 300_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  useEffect(() => {
    const onChange = (table: "office_presence" | "office_presence_log") => (payload: {
      eventType: string;
      new: Record<string, unknown>;
      old: Record<string, unknown>;
    }) => {
      queryClient.setQueryData<OfficePresenceData>(OFFICE_PRESENCE_KEY, (old) =>
        old ? applyPresenceChange(old, table, payload.eventType, payload.new, payload.old) : old
      );
    };
    // A fresh name per subscription: a remount (or StrictMode's double effect)
    // must never join a channel that is still leaving (QA 2026-10-17).
    const channel = db
      .channel(presenceChannelName())
      .on("postgres_changes", { event: "*", schema: "public", table: "office_presence" }, onChange("office_presence"))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "office_presence_log" }, onChange("office_presence_log"))
      .subscribe();
    return () => {
      db.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}
