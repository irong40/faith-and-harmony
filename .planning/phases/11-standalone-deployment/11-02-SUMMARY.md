---
phase: 11
plan: 02
status: complete
completed: 2026-03-05
---

# Plan 11-02 Summary: Square Production Configuration

## What Was Done
- Registered Square production webhook pointing to square-webhook edge function
- Set production environment variables (SQUARE_ACCESS_TOKEN, SQUARE_WEBHOOK_SIGNATURE_KEY) on Supabase
- square-webhook edge function uses environment-driven credentials (no sandbox/production toggle in code)
- config.toml entry with verify_jwt = false already in place for webhook endpoint

## Artifacts
- supabase/functions/square-webhook/index.ts (production ready, signature validation)
- supabase/functions/create-deposit-invoice/index.ts (SQUARE_ENVIRONMENT toggle)
- supabase/config.toml (square-webhook verify_jwt = false)

## Notes
- Webhook signature validation uses HMAC-SHA256 with SQUARE_WEBHOOK_SIGNATURE_KEY
- Production credentials configured via Supabase secrets dashboard
