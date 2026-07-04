#!/bin/bash
# Bulk enqueue outreach_drip for all new drone_leads
# Calls enqueue-drip edge function for each lead
#
# Requires SUPABASE_SERVICE_ROLE_KEY in the environment (or in .env
# alongside this script). Never commit the key to this file.

SUPABASE_URL="https://qjpujskwqaehxnqypxzu.supabase.co"

# Load .env from the repo root if present (gitignored)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "${SCRIPT_DIR}/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "${SCRIPT_DIR}/.env"
  set +a
fi

SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"
if [ -z "$SERVICE_KEY" ]; then
  echo "ERROR: SUPABASE_SERVICE_ROLE_KEY is not set." >&2
  echo "Export it or add it to ${SCRIPT_DIR}/.env (see .env.example)." >&2
  exit 1
fi

LEAD_IDS=(
  "f5b4d90c-82bc-4b0b-b3be-cab08277f208"
  "115efdce-f3fb-4517-acb6-a4a0d9b5d220"
  "93f4dea7-d215-40dc-bb11-18d4c433c6d7"
  "0c70e824-ae30-443c-8ef7-2a1e6790f8bb"
  "fde45ce3-3fc0-486a-ba4f-203ca689ee37"
  "f6c0ef1e-dc2a-4ccd-84f9-8d48d80416e0"
  "bc200b67-96d2-4d78-ba90-3013e04d1f4e"
  "d2f411da-c364-4f89-9fe0-2b0907226e1a"
  "19cf9370-85dc-4b47-8003-506f68263a25"
  "54c6b27c-8a87-4ea8-be08-6db318894303"
  "f674dbc0-d2df-4412-b3be-f0b65c4be988"
  "811c91ac-c5ce-4c5c-9ff7-1f3647c9ccec"
  "de57c8aa-d3e7-41b3-b57c-9f6f0dd1a0ef"
  "3a0157a8-522c-4481-87be-e9819acb9ec1"
  "0acd845a-c251-4f6a-beb9-3e98359917a6"
  "d7383369-0a49-4889-83f0-6edeff8f8542"
  "6200e419-5cac-4d9d-b544-fb0cb0c89e67"
  "6182d20c-fa76-446e-aadd-d8b03f85f550"
  "3933e7a5-291c-4753-bef2-32fa0e06da55"
  "969f2a3b-1139-4ded-935a-b05eba4e4c90"
  "a1b00aa4-ddb8-41bf-8d9e-dd06da57a38d"
  "061c7086-7cc4-4a91-856d-8c4d03a0a825"
  "805884f3-4cd7-48b8-a4f0-ba3bd7aa9a17"
  "023a38c1-25b6-4f96-8a25-4ffc69503265"
  "6db9f4f9-6427-47db-9b9f-e3761139a7c9"
  "4d39a3c2-7e04-44be-89a0-9e0d36f2fd24"
)

echo "Enqueueing outreach_drip for ${#LEAD_IDS[@]} leads..."
SUCCESS=0
FAIL=0

for LEAD_ID in "${LEAD_IDS[@]}"; do
  RESULT=$(curl -s -w "\n%{http_code}" -X POST \
    "${SUPABASE_URL}/functions/v1/enqueue-drip" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"lead_id\": \"${LEAD_ID}\", \"sequence_type\": \"outreach_drip\", \"context\": {\"service_focus\": \"aerial roof inspection\"}}")

  HTTP_CODE=$(echo "$RESULT" | tail -1)
  BODY=$(echo "$RESULT" | head -1)

  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    SUCCESS=$((SUCCESS + 1))
    echo "  ✓ ${LEAD_ID}"
  else
    FAIL=$((FAIL + 1))
    echo "  ✗ ${LEAD_ID} (HTTP ${HTTP_CODE}: ${BODY})"
  fi
done

echo ""
echo "Done. Success: ${SUCCESS}, Failed: ${FAIL}"
