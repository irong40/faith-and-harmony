import { z } from "zod";
import { PROPERTY_TYPES, DEFAULT_PROPERTY_TYPE } from "@/lib/property-type";

// Client schema
export const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().default("VA"),
  zip: z.string().optional(),
  notes: z.string().optional(),
});

export type ClientFormValues = z.infer<typeof clientSchema>;

/**
 * drone_jobs.job_price is plain dollars (no cents, no minor units). It is the
 * value slice 4's M2 billing trigger keys off — a null price means the trigger
 * skips the job entirely, so the field is optional but never silently coerced.
 */
const JOB_PRICE_MAX = 1_000_000;

/** "" | "1,250" | "$1250" -> 1250 | null. Returns null for anything unparseable. */
export function parseJobPrice(input: string | null | undefined): number | null {
  if (input == null) return null;
  const cleaned = input.replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  if (!/^\d+$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value > JOB_PRICE_MAX) return null;
  return value;
}

export function isValidJobPriceInput(input: string | null | undefined): boolean {
  if (input == null) return true;
  const cleaned = input.replace(/[$,\s]/g, "");
  if (cleaned === "") return true;
  return /^\d+$/.test(cleaned) && Number(cleaned) <= JOB_PRICE_MAX;
}

// Job intake schema
export const jobIntakeSchema = z.object({
  client_id: z.string().uuid("Select a client"),
  processing_template_id: z.string().uuid("Select a job type"),
  site_address: z.string().min(1, "Site address is required"),
  // Populated by Places Autocomplete; cleared whenever the address is edited by
  // hand, so coordinates can never belong to a different address than the one
  // stored. Feeds nearest_weather_station, weather_hold and airspace checks.
  latitude: z.number().nullable().default(null),
  longitude: z.number().nullable().default(null),
  property_city: z.string().nullable().default(null),
  property_state: z.string().nullable().default(null),
  property_zip: z.string().nullable().default(null),
  property_type: z.enum(PROPERTY_TYPES).default(DEFAULT_PROPERTY_TYPE),
  job_price: z
    .string()
    .optional()
    .refine(isValidJobPriceInput, "Whole dollars only, e.g. 450"),
  is_rush: z.boolean().default(false),
  video_addon: z.boolean().default(false),
  vegetation_analysis: z.boolean().default(false),
  scheduled_date: z.string().min(1, "Scheduled date is required"),
  scheduled_time: z.string().optional(),
  pilot_id: z.string().uuid().optional().or(z.literal("")),
  aircraft_id: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().optional(),
});

export type JobIntakeFormValues = z.infer<typeof jobIntakeSchema>;
