-- Governance Agent System: Storage Bucket
-- Migration: Create private governance storage bucket for agent generated documents
--
-- Service role bypasses RLS, so no explicit upload policy is needed for n8n
-- workflows. Agents write documents via the Supabase service key.
--
-- Folder structure is virtual (created on first file upload):
--   governance/governance_scribe/{date}/
--   governance/compliance_sentinel/{date}/
--   governance/financial_analyst/{date}/
--   governance/document_drafter/{date}/

-- Step 1: Create the governance bucket (private, 10MB limit, PDF + DOCX only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'governance',
  'governance',
  false,
  10485760,
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

-- Step 2: Authenticated read policy for founder access via Trestle admin panel
CREATE POLICY "Governance Authenticated Read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'governance');
