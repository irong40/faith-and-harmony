# Trestle Tools (internal admin, Python)

Back-office Python tooling for Trestle (Sentinel Aerial). Separate from the pilot
SvelteKit PWA and from this repo's React/Vite app — these are internal admin tools
that talk to the same Supabase project (`qjpujskwqaehxnqypxzu`).

## Modules
| File | Role | Needs Flet? |
|------|------|-------------|
| `pricing_core.py` | Flet-free: pricing constants, cost-plus/hybrid engine, Supabase helpers | No |
| `mission_costing_engine.py` | Flet UI: hybrid value-based costing/quoting engine | Yes |
| `proposal_editor.py` | Flet UI: OPORD proposal editor (list + 5 editable paragraphs + live pricing) | Yes |
| `opord_intake.py` | Headless: local Ollama parse + deterministic pricing + PDF/Storage finalize + webhook server | No |

## Design
- **Pricing is deterministic Python** (`pricing_core`), never the LLM.
- **Intake AI runs on local Ollama** (`mistral:7b` default; `qwen3:14b`/`qwen3:32b` available).
  No cloud / Claude dependency in the job path.
- Supabase writes use the **service-role key**, read from
  `../processing-server/.env` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) — internal use only,
  never bundled into a client build. Override the env path with `TRESTLE_SUPABASE_ENV`.

## Run
```bash
pip install flet supabase reportlab
python proposal_editor.py            # OPORD editor UI
python mission_costing_engine.py     # costing engine UI
python opord_intake.py "Client needs a 250-acre roof thermal scan near Norfolk base next Tuesday"
python opord_intake.py serve         # webhook for n8n / web form / Vapi (POST {raw_intake, source}, :8787)
```

## Backend tables (Supabase `qjpujskwqaehxnqypxzu`)
- `mission_costings` — extended with hybrid value-based columns (internal costing).
- `opord_proposals` — OPORD draft proposals (distinct from the client-facing `proposals` table).

See `Trestle_Costing_Engine_PRD_v2_1.md` for the pricing spec.
