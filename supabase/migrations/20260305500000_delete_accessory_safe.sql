-- Safe deletion function for accessories
-- Checks if accessory is referenced by any mission_equipment before deleting
CREATE OR REPLACE FUNCTION delete_accessory_safe(p_accessory_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO ref_count
  FROM mission_equipment
  WHERE p_accessory_id = ANY(accessory_ids);

  IF ref_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete: accessory is referenced by % mission(s). Remove it from mission equipment first.', ref_count;
  END IF;

  DELETE FROM accessories WHERE id = p_accessory_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Accessory not found with id %', p_accessory_id;
  END IF;
END;
$$;
