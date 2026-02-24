# n8n Cloudflare Tunnel Setup

## Architecture

```
Browser/Vercel app
    |
    v
Supabase Edge Functions (pipeline-trigger, n8n-relay, etc.)
    |  <-- N8N_WEBHOOK_URL secret (server-side only)
    v
Cloudflare Tunnel (stable public URL)
    |
    v
n8n (self-hosted, Windows processing rig, port 5678)
    |
    v
Local scripts / WebODM / Lightroom
```

The Cloudflare Tunnel URL never reaches the browser. It lives only as a Supabase secret.

## One-Time Setup

### Step 1: Install cloudflared

Download from https://github.com/cloudflare/cloudflared/releases and install on the processing rig.

```powershell
# Verify install
cloudflared --version
```

### Step 2: Authenticate

```powershell
cloudflared tunnel login
```

Follow the browser prompt to authorize your Cloudflare account.

### Step 3: Create the tunnel

```powershell
cloudflared tunnel create sentinel-n8n
```

Note the tunnel UUID from the output.

### Step 4: Configure the tunnel

Create `C:\Users\<user>\.cloudflared\config.yml`:

```yaml
tunnel: <TUNNEL_UUID>
credentials-file: C:\Users\<user>\.cloudflared\<TUNNEL_UUID>.json

ingress:
  - hostname: n8n.your-domain.com  # or use a free trycloudflare.com URL
    service: http://localhost:5678
  - service: http_status:404
```

For a quick free tunnel without a domain (test only):

```powershell
cloudflared tunnel --url http://localhost:5678
```

### Step 5: Store the URL as a Supabase secret

```bash
supabase secrets set N8N_WEBHOOK_URL=https://your-tunnel.trycloudflare.com
# or for a custom domain:
supabase secrets set N8N_WEBHOOK_URL=https://n8n.your-domain.com
```

### Step 6: Configure n8n webhook nodes

On every n8n Webhook trigger node used by the pipeline:
- Set "Authentication" to "None" (the edge function authenticates callers)
- Enable "Respond Immediately" so the webhook returns before pipeline completes
  (prevents edge function timeout — P4 safeguard)

### Step 7: Run as Windows service (production)

```powershell
cloudflared service install
sc start cloudflared
```

## Verification

After setup, test the relay:

```bash
curl -X POST https://qjpujskwqaehxnqypxzu.supabase.co/functions/v1/n8n-relay \
  -H "Authorization: Bearer <your-admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"path": "test-ping", "payload": {"test": true}}'
```

A 200 or 502 response (not 503) confirms the tunnel URL is configured.

## Secrets Required

| Secret | Description |
|--------|-------------|
| N8N_WEBHOOK_URL | Cloudflare Tunnel base URL for n8n webhooks |
| N8N_RESUME_WEBHOOK_URL | (legacy) Specific resume webhook path |

Set with:

```bash
supabase secrets set N8N_WEBHOOK_URL=https://...
```
