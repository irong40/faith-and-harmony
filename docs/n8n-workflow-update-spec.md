# n8n Workflow Update — Construction Progress Deliverable

Manual changes to `drone-processing-pipeline` to ship the new per-visit
deliverable. Apply in the n8n UI; do not edit nodes the existing flow needs
for non-construction jobs.

## 1. Detect a construction visit

After the existing "Construction? → Run Photoshop labeling action" step,
add a **Supabase** node:

- **Operation:** Get rows
- **Table:** `site_visits`
- **Filter:** `job_id = {{ $json.job_id }}`
- **Return:** single row, allow empty

Name the node `Lookup site_visit`. The downstream branch only runs if a row
was returned.

## 2. Branch on site_visit presence

Add an **IF** node `Is construction visit?`:

- Condition: `{{ $node["Lookup site_visit"].json["id"] }}` is not empty

True branch → call the local agent.
False branch → continue to the existing delivery email (unchanged).

## 3. Call the local agent

Add an **HTTP Request** node `Build deliverable`:

- **Method:** POST
- **URL:** `http://<local-agent-host>:<port>/build-deliverable`
- **Body:**
  ```json
  {
    "site_id": "{{ $node['Lookup site_visit'].json['site_id'] }}",
    "visit_id": "{{ $node['Lookup site_visit'].json['id'] }}",
    "job_id": "{{ $json.job_id }}",
    "video_path": "{{ $json.video_path }}"
  }
  ```
- `video_path` is optional; pass it through only if a video was captured.

This call is fire-and-forget — it returns immediately with `{ job_id,
status: "started" }`.

## 4. Poll for completion

Add a **Wait** node (60s) followed by an **HTTP Request** `Poll status`:

- **URL:** `http://<local-agent-host>:<port>/status/{{ $json.job_id }}`
- Loop the Wait → Poll pair until `status === "completed"` or `"failed"`
  (use the existing polling pattern from the labeling step).

The deliverable build runs **after** labeling is complete so the comparison
grid uses the labeled photos already present in storage.

## 5. Re-read the deliverable URL

Add a **Supabase** node `Get deliverable URL`:

- **Operation:** Get rows
- **Table:** `site_visits`
- **Filter:** `id = {{ $node['Lookup site_visit'].json['id'] }}`
- **Select:** `id,site_id,deliverable_url,change_summary,visit_number,visit_date`

The 30-day signed URL is in `deliverable_url`.

## 6. Construction-variant delivery email

Clone the existing delivery email node as `Email — construction progress`.

Template additions:

- **Subject:** `Site progress update — {{ site.name }} (Visit {{ visit.visit_number }})`
- **Body:** prepend a "What changed since your last visit" block that lists
  `change_summary.bullets` as a `<ul>`.
- **Download link:** point to `deliverable_url` (the signed ZIP), not the
  legacy raw-photos ZIP.

Suggested HTML snippet:

```html
<h2>Progress update — {{ site.name }}</h2>
<p>Visit {{ visit.visit_number }} on {{ visit.visit_date }}.</p>

<h3>What changed since your last visit</h3>
<ul>
  {{#each change_summary.bullets}}
    <li>{{ this }}</li>
  {{/each}}
</ul>

<p>
  <a href="{{ deliverable_url }}"
     style="background:#0a2540;color:#fff;padding:12px 18px;
            text-decoration:none;border-radius:6px;">
    Download progress package
  </a>
</p>
<p style="color:#666;font-size:12px;">
  Link valid for 30 days. Includes comparison grid, progress video,
  change summary, flight log, and compliance packet.
</p>
```

Route the True branch from step 2 through `Email — construction progress`.
Route the False branch through the existing email node.

## 7. Failure handling

If `Poll status` returns `status: "failed"`, route to the existing
Slack/Email error notifier with `manifest` and `stderr` payloads. Do not
swallow — Adam's pipeline-failure-alert rule requires same-day visibility.

## Smoke test

1. Insert a `construction_sites` row and two `site_visits` rows (visit 1
   baseline, visit 2 current) linked to two test `drone_jobs`.
2. Tag four `drone_assets` per job with `cardinal_direction_tag` N/E/S/W.
3. Replay the webhook with the visit-2 `job_id`.
4. Confirm `site_visits.deliverable_url` is populated and the email arrives
   with the bullets inline.
