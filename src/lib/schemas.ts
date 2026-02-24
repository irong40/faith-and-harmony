import { z } from "zod";

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

// Job intake schema
export const jobIntakeSchema = z.object({
  client_id: z.string().uuid("Select a client"),
  processing_template_id: z.string().uuid("Select a job type"),
  site_address: z.string().min(1, "Site address is required"),
  scheduled_date: z.string().min(1, "Scheduled date is required"),
  scheduled_time: z.string().optional(),
  pilot_id: z.string().uuid().optional().or(z.literal("")),
  aircraft_id: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().optional(),
});

export type JobIntakeFormValues = z.infer<typeof jobIntakeSchema>;
