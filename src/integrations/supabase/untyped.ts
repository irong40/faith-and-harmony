import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./client";

/**
 * The single sanctioned escape hatch for PostgREST calls against relations that
 * are not in the generated `Database` type yet (a brand-new table, or a view
 * added since the last `supabase gen types` run).
 *
 * Why this exists at all: the codebase had grown a habit of writing
 * `.from("some_table" as never)` and `.insert(payload as never)`. That cast is
 * worse than useless — `never` has no members, so every chained `.eq()` /
 * `.insert()` becomes a type error of its own, and the compiler stops checking
 * the payload entirely. Eighteen of the repo's type errors came from that one
 * idiom. Almost every table it was applied to was already in types.ts.
 *
 * Rules of use:
 *   1. If the relation IS in `types.ts`, use `supabase.from(...)` directly and
 *      get real column checking. Do not reach for this.
 *   2. Only use `untypedFrom` for a relation that genuinely is not generated
 *      yet, and regenerate types.ts at the first opportunity.
 *
 * Unlike `as never`, the loose schema below keeps the query builder's own API
 * intact: `.select()`, `.eq()`, `.insert()` and friends still exist and still
 * return sensible builders — only the column names go unchecked.
 */

type UntypedRow = Record<string, unknown>;

interface UntypedDatabase {
  public: {
    Tables: Record<
      string,
      { Row: UntypedRow; Insert: UntypedRow; Update: UntypedRow; Relationships: [] }
    >;
    Views: Record<string, { Row: UntypedRow; Relationships: [] }>;
    Functions: Record<string, { Args: UntypedRow; Returns: unknown }>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

/** Same connection and session as `supabase`, with the schema types relaxed. */
export const untypedClient = supabase as unknown as SupabaseClient<UntypedDatabase>;

/** `untypedFrom("brand_new_table").select("*")` */
export function untypedFrom(table: string) {
  return untypedClient.from(table);
}

/** Return type of {@link untypedFrom}, for helpers that pass a builder around. */
export type UntypedTable = ReturnType<typeof untypedFrom>;
