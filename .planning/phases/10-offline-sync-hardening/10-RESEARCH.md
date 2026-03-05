# Phase 10: Offline Sync Hardening - Research

**Researched:** 2026-03-05
**Domain:** IndexedDB offline queue, dead letter pattern, connectivity detection, React PWA sync UI
**Confidence:** HIGH

## Summary

Phase 10 hardens the existing sync infrastructure in the Trestle PWA. The codebase already has a functional sync engine (`src/lib/sync/sync-engine.ts`) with an IndexedDB queue (`src/lib/sync/db.ts`), a React hook (`src/hooks/useOfflineSync.ts`), and a status indicator component (`src/components/pilot/SyncStatusIndicator.tsx`). The sync engine uses `navigator.onLine` for connectivity detection and silently deletes items after 5 retries. Both of these behaviors must change.

The existing code is well structured and the changes are surgical. There is no need for new libraries. The `idb` package exists in `node_modules` but the project uses raw IndexedDB APIs directly. The work is about adding a dead letter store to the IndexedDB schema, replacing `navigator.onLine` guards with try/catch network probe, adding a dead letter warning banner, and ensuring the flight log offline path works end to end.

**Primary recommendation:** Keep the existing raw IndexedDB approach (no migration to `idb` wrapper). Add a `DEAD_LETTER` object store in a DB version bump, move the retry exhaustion logic from `removeSyncItem` to `moveToDeadLetter`, replace all `navigator.onLine` checks with a try/catch probe function, and add a dead letter banner component.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SYNC-01 | Failed sync items move to dead letter store after max retries instead of being deleted | Add DEAD_LETTER object store, change retry exhaustion from `removeSyncItem` to `moveToDeadLetter` |
| SYNC-02 | Pilot sees persistent warning when dead letter items exist | New `DeadLetterBanner` component, `useDeadLetterCount` hook, rendered in pilot layout |
| SYNC-03 | Offline flight log queueing works end to end (log offline, auto sync on reconnect, data appears in Supabase) | Already partially implemented in PilotMissionDetail.tsx. Needs the `navigator.onLine` guard removed so offline items always queue, then the sync engine processes them on reconnect |
| SYNC-04 | Sync engine uses try/catch fallback pattern instead of navigator.onLine checks | Replace `navigator.onLine` checks in `processQueue`, `pullMissions`, `pullFleet`, `useOfflineSync` hook, and `PilotMissionDetail.tsx` with a network probe function |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Raw IndexedDB API | Browser native | Offline data store and sync queue | Already used in project, no wrapper needed for this scope |
| vite-plugin-pwa | 1.2.0 | Service worker generation via Workbox | Already configured in vite.config.ts |
| Workbox | (bundled with vite-plugin-pwa) | Runtime caching, precaching | NetworkFirst strategy already configured for Supabase API |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 4.0.18 | Unit testing | Already configured, use for sync engine tests |
| jsdom | 28.1.0 | DOM simulation in tests | Already configured as test environment |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw IndexedDB | idb (wrapper) | idb is already in node_modules but unused in source. Migrating adds risk for no benefit in this phase. Raw API is working fine. |
| Custom sync engine | workbox-background-sync | Workbox BackgroundSync handles retry/queue at the service worker level, but the existing engine runs in the main thread with direct Supabase client access. Switching architectures is out of scope. |

## Architecture Patterns

### Current Project Structure (sync related)
```
src/
  lib/sync/
    db.ts              # IndexedDB wrapper (openDB, CRUD, sync queue helpers)
    sync-engine.ts     # processQueue, executeAction, pullMissions, pullFleet, auto sync
  hooks/
    useOfflineSync.ts  # React hook for sync status, enqueue, syncNow
  components/pilot/
    SyncStatusIndicator.tsx  # Status badge + manual sync button
  pages/pilot/
    PilotMissionDetail.tsx   # Flight log submission with offline queueing
```

### Pattern 1: Dead Letter Store (DB Version Bump)
**What:** Add a `dead_letter` object store to IndexedDB by incrementing DB_VERSION from 1 to 2
**When to use:** When the sync queue schema needs a new store
**Example:**
```typescript
// db.ts - bump version and add store
const DB_VERSION = 2;

export const STORES = {
  SYNC_QUEUE: 'sync_queue',
  MISSIONS: 'missions_cache',
  FLEET: 'fleet_cache',
  DEAD_LETTER: 'dead_letter',
} as const;

// In onupgradeneeded handler:
if (!db.objectStoreNames.contains(STORES.DEAD_LETTER)) {
  const store = db.createObjectStore(STORES.DEAD_LETTER, {
    keyPath: 'id',
    autoIncrement: true,
  });
  store.createIndex('moved_at', 'moved_at', { unique: false });
}
```

### Pattern 2: Network Probe (Try/Catch Fallback)
**What:** Replace `navigator.onLine` with an actual network request to detect connectivity
**When to use:** Every place that currently checks `navigator.onLine` before deciding to queue vs send
**Example:**
```typescript
// lib/sync/network-probe.ts
export async function isNetworkAvailable(): Promise<boolean> {
  try {
    // Use a lightweight Supabase health check or HEAD request
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`,
      {
        method: 'HEAD',
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        // Short timeout to fail fast
        signal: AbortSignal.timeout(5000),
      },
    );
    return response.ok;
  } catch {
    return false;
  }
}
```

### Pattern 3: Always Queue, Sync Immediately
**What:** Instead of branching on online/offline at the call site, always write to IndexedDB queue first, then trigger processQueue immediately
**When to use:** Simplifies the flight log submission and any future offline write paths
**Example:**
```typescript
// PilotMissionDetail.tsx - simplified approach
// Always queue to IndexedDB first
await enqueue('insert_flight_log', 'flight_logs', flightLogPayload);
await enqueue('update_mission_status', 'drone_jobs', { id: mission.id, status: 'complete' });
// processQueue runs automatically (startAutoSync + immediate trigger in enqueue)
```

This "always queue first" pattern is cleaner but changes existing behavior. The current code calls Supabase directly when online and only queues when offline. Switching to always queuing ensures no data loss even if the direct call fails mid request. This is the recommended approach for SYNC-03 and SYNC-04.

### Anti-Patterns to Avoid
- **navigator.onLine as sole connectivity check:** Returns true on captive portals, VPNs, and flaky connections. The browser only checks for network interface presence, not actual internet access. This is the root problem SYNC-04 addresses.
- **Silent deletion after max retries:** Current behavior on line 122 of sync-engine.ts. Data loss is unacceptable for flight logs.
- **Reopening DB on every operation:** The current `openDB()` creates a new connection per call. For this phase, keep this pattern (it works), but do not add more overhead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IndexedDB schema migration | Custom migration framework | IndexedDB `onupgradeneeded` with version check | Built into the IndexedDB spec, handles version bumps automatically |
| Service worker caching | Custom fetch interceptor | vite-plugin-pwa / Workbox (already configured) | Already working, Workbox handles cache invalidation, precaching, and runtime caching |
| Retry with backoff | Custom retry loop from scratch | Keep existing linear retry with max limit | The sync engine already retries 5 times. Adding exponential backoff is a future enhancement (not required by SYNC-01 through SYNC-04) |

## Common Pitfalls

### Pitfall 1: IndexedDB Version Bump Breaks Existing Data
**What goes wrong:** Incrementing DB_VERSION triggers `onupgradeneeded`. If the handler only creates stores when they don't exist (which is already the case), existing data is preserved. But if someone calls `deleteDatabase` or the handler is wrong, all data is lost.
**Why it happens:** Misunderstanding of IndexedDB versioning.
**How to avoid:** The existing `onupgradeneeded` handler already checks `db.objectStoreNames.contains()` before creating stores. Just add the new `dead_letter` store the same way. Existing stores and data remain untouched.
**Warning signs:** Console errors about "version change transaction" or "blocked" events.

### Pitfall 2: navigator.onLine False Positives
**What goes wrong:** `navigator.onLine` returns `true` when connected to WiFi but with no internet (common in field conditions for a drone pilot). Code thinks it can sync but requests fail.
**Why it happens:** The browser checks network interface status, not actual connectivity.
**How to avoid:** Use the try/catch probe pattern. Attempt the actual Supabase request. If it fails with a network error, treat as offline.
**Warning signs:** Sync status shows "syncing" but items never leave the queue.

### Pitfall 3: Dead Letter Items Invisible to User
**What goes wrong:** Items move to dead letter but the pilot never sees the warning. They assume everything synced.
**Why it happens:** The banner component is not rendered in the right layout, or the dead letter count query runs infrequently.
**How to avoid:** Render the `DeadLetterBanner` in the pilot layout shell (the layout that wraps all /pilot/* routes). Query dead letter count on every sync cycle completion.
**Warning signs:** Dead letter store has items but pilot dashboard shows "Synced."

### Pitfall 4: Race Condition in processQueue
**What goes wrong:** Two concurrent `processQueue` calls process the same items, causing duplicate inserts in Supabase.
**Why it happens:** The `online` event fires at the same time as the periodic interval. Both call `processQueue`.
**How to avoid:** Add a simple mutex/lock flag. If `processQueue` is already running, skip.
**Warning signs:** Duplicate flight logs in Supabase, "unique constraint" errors.

### Pitfall 5: AbortSignal.timeout Browser Support
**What goes wrong:** `AbortSignal.timeout()` is not available in older browsers.
**Why it happens:** It shipped in Chrome 103, Safari 16.4, Firefox 100. Most modern browsers support it, but to be safe, verify target browser matrix.
**How to avoid:** The Trestle PWA targets modern Android Chrome and iOS Safari (pilot's mobile device). Both support `AbortSignal.timeout()`. If concerned, use a manual `AbortController` with `setTimeout`.

## Code Examples

### Moving Failed Items to Dead Letter Store
```typescript
// In sync-engine.ts processQueue, replace the max retries block:

// BEFORE (current - silent deletion):
if (retries >= MAX_RETRIES) {
  console.error(`Sync item ${item.id} exceeded max retries, removing:`, error.message);
  await removeSyncItem(item.id);
}

// AFTER (dead letter):
if (retries >= MAX_RETRIES) {
  console.error(`Sync item ${item.id} exceeded max retries, moving to dead letter`);
  await moveToDeadLetter(item, error.message);
  await removeSyncItem(item.id);
}
```

### Dead Letter Banner Component
```typescript
// components/pilot/DeadLetterBanner.tsx
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DeadLetterBannerProps {
  count: number;
}

export function DeadLetterBanner({ count }: DeadLetterBannerProps) {
  if (count === 0) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        {count} item{count > 1 ? 's' : ''} failed to sync after multiple attempts.
        Contact admin or retry manually.
      </AlertDescription>
    </Alert>
  );
}
```

### Network Probe Function
```typescript
// lib/sync/network-probe.ts
const PROBE_TIMEOUT_MS = 5000;

export async function isNetworkAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`,
      {
        method: 'HEAD',
        headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
        signal: controller.signal,
      },
    );

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| navigator.onLine for connectivity | Try/catch with actual fetch probe | Standard practice since ~2020 | Eliminates false positives on captive portals and flaky connections |
| Silent failure on max retries | Dead letter queue pattern | Common in message queue systems, adapted for client side | No data loss, user visibility into stuck items |
| Branch on online/offline at call site | Always queue first, sync engine handles delivery | "Offline first" pattern | Simplifies call sites, prevents data loss during mid-request failures |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | vite.config.ts (test block) |
| Quick run command | `npm run test` |
| Full suite command | `npm run test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SYNC-01 | Failed items move to dead letter after max retries | unit | `npx vitest run src/lib/sync/sync-engine.spec.ts` | No, Wave 0 |
| SYNC-02 | Dead letter banner renders with count | unit | `npx vitest run src/components/pilot/DeadLetterBanner.spec.tsx` | No, Wave 0 |
| SYNC-03 | Flight log queues offline and syncs on reconnect | unit | `npx vitest run src/lib/sync/sync-engine.spec.ts` | No, Wave 0 |
| SYNC-04 | Network probe replaces navigator.onLine | unit | `npx vitest run src/lib/sync/network-probe.spec.ts` | No, Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test`
- **Per wave merge:** `npm run test && npm run typecheck`
- **Phase gate:** Full suite green before verification

### Wave 0 Gaps
- [ ] `src/lib/sync/sync-engine.spec.ts` covers SYNC-01, SYNC-03
- [ ] `src/lib/sync/network-probe.spec.ts` covers SYNC-04
- [ ] `src/components/pilot/DeadLetterBanner.spec.tsx` covers SYNC-02
- [ ] `src/lib/sync/db.spec.ts` covers dead letter store CRUD operations
- [ ] IndexedDB mock strategy needed (fake-indexeddb or manual mock)

## Open Questions

1. **Should the "always queue first" pattern replace the current online/offline branch?**
   - What we know: The current code in PilotMissionDetail.tsx branches on `navigator.onLine` to decide whether to call Supabase directly or queue. The "always queue" approach is simpler and more resilient.
   - What's unclear: Whether the product owner wants the slight delay of queue then sync vs direct call when online.
   - Recommendation: Adopt "always queue first" for flight log writes. The sync engine triggers immediately after enqueue when online, so the delay is negligible. This eliminates an entire class of edge cases (mid-request failures, false online detection).

2. **Should dead letter items have a manual retry button?**
   - What we know: SYNC-02 requires a persistent warning with count. It does not explicitly require a retry mechanism.
   - What's unclear: Whether the pilot should be able to retry dead letter items or if admin intervention is needed.
   - Recommendation: Add a "Retry All" button on the dead letter banner. Moving items back to the sync queue with retries reset to 0 is trivial and improves pilot autonomy. This exceeds the minimum requirement but is low effort.

3. **IndexedDB test mocking strategy**
   - What we know: Vitest runs in jsdom which does not have IndexedDB. The `fake-indexeddb` npm package provides a standards compliant polyfill.
   - What's unclear: Whether the project has a preferred mocking approach.
   - Recommendation: Install `fake-indexeddb` as a dev dependency and import it in test setup. This is the standard approach for testing IndexedDB code.

## Sources

### Primary (HIGH confidence)
- Project source code: `src/lib/sync/db.ts`, `src/lib/sync/sync-engine.ts`, `src/hooks/useOfflineSync.ts`, `src/components/pilot/SyncStatusIndicator.tsx`, `src/pages/pilot/PilotMissionDetail.tsx`
- Project config: `vite.config.ts` (PWA config, test config), `package.json` (dependencies)
- MDN IndexedDB API: Version change transactions, `onupgradeneeded` handler behavior

### Secondary (MEDIUM confidence)
- navigator.onLine unreliability: Well documented across MDN, Chrome DevRel, and community posts. The property reflects network interface status, not actual connectivity.
- Dead letter queue pattern: Standard pattern from message queue systems (RabbitMQ, SQS), adapted here for client side IndexedDB.

### Tertiary (LOW confidence)
- `fake-indexeddb` package: Recommended based on training data knowledge. Verify package still maintained and compatible with Vitest 4.x before installing.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH. All libraries already exist in the project. No new dependencies required (except possibly fake-indexeddb for testing).
- Architecture: HIGH. The existing sync infrastructure is well structured. Changes are additive, not architectural rewrites.
- Pitfalls: HIGH. navigator.onLine unreliability is well documented. IndexedDB version bump behavior is well understood. Race condition in processQueue is visible in the current code.

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable domain, no fast-moving dependencies)
