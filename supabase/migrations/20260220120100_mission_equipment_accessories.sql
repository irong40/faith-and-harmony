-- Add accessory_ids to mission_equipment for accessory selection during mission prep
ALTER TABLE public.mission_equipment
  ADD COLUMN accessory_ids UUID[] DEFAULT '{}';
