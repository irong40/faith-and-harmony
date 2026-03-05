# Phase 7: Foundation and Quick Wins - Research

**Researched:** 2026-03-05
**Domain:** Admin CRUD UI (accessories), PWA branding, billing deposit fix
**Confidence:** HIGH

## Summary

Phase 7 covers three independent workstreams that share no dependencies between them. First, building an admin accessories management page with CRUD operations, aircraft compatibility assignment, and deletion protection when accessories are referenced by missions. Second, replacing placeholder PWA icons with Sentinel branded PNG icons. Third, fixing the deposit calculation from 25% to 50% across the QuoteBuilder UI and the create-deposit-invoice edge function.

All three workstreams build on existing, well-established patterns in the codebase. The accessories table, types, hooks (query and mutation), and even a form dialog already exist in the pilot portal. The PWA icon infrastructure is already configured in vite.config.ts with VitePWA plugin. The deposit fix is a targeted change to two known locations.

**Primary recommendation:** Reuse existing fleet management patterns (hooks, types, form dialog) and promote them to admin context rather than rebuilding from scratch.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEPLOY-01 | Production PWA icons with Sentinel branding replace SVG placeholders | PWA manifest config exists in vite.config.ts, PNG files at public/pwa-*.png need replacement with branded versions |
| EQUIP-01 | Admin can create, edit, and delete accessories with type, name, serial number, and status | accessories table, Accessory type, useCreateAccessory/useUpdateAccessory/useDeleteAccessory hooks all exist. AccessoryFormDialog exists in pilot portal. Need admin page + deletion guard |
| EQUIP-02 | Admin can assign compatible aircraft to each accessory | compatible_aircraft TEXT[] column exists on accessories table. AccessoryFormDialog already supports comma-separated model names. Need to upgrade to multi-select with actual aircraft from DB |
| EQUIP-03 | Mission equipment selection filters accessories by selected aircraft compatibility | Already implemented in EquipmentSelector.tsx lines 111-116. Filters by matching selectedAircraft.model against acc.compatible_aircraft array |
| BILL-01 | Deposit amount is fixed at 50% of package price in quote creation | Currently hardcoded at 25% in QuoteBuilder.tsx (line 51) and create-deposit-invoice edge function (lines 148, 151). Change to 50% |
</phase_requirements>

## Standard Stack

### Core (Already In Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x | UI framework | Project standard |
| @tanstack/react-query | 5.x | Data fetching and cache | Used across all admin pages |
| @supabase/supabase-js | 2.x | Database client | Project standard |
| shadcn/ui | latest | Component library | Every admin page uses these components |
| vite-plugin-pwa | 0.x | PWA manifest and service worker | Already configured in vite.config.ts |
| lucide-react | latest | Icons | Used throughout admin nav and pages |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | latest | Date formatting | Already used in admin pages (Leads, CallLogs) |

### No New Dependencies Required

This phase requires zero new packages. Everything builds on existing infrastructure.

## Architecture Patterns

### Existing Pattern: Admin CRUD Page

Every admin page follows this structure:

```
src/pages/admin/
  SomeEntity.tsx          # Main page with list, filters, actions
  components/
    SomeEntityForm.tsx    # Dialog or inline form for create/edit
```

Key conventions observed across Leads.tsx, CallLogs.tsx, QuoteRequests.tsx:
1. Import AdminNav and render it at the top
2. Use `useQuery` from @tanstack/react-query with Supabase client
3. Table layout using shadcn Table components
4. useState for filters and pagination
5. Badge components for status display
6. Inline actions (edit, delete) per row

### Existing Pattern: Fleet Mutation Hooks

All fleet CRUD is in `src/hooks/useFleetMutations.ts` with this pattern:
- `useCreateAccessory()` / `useUpdateAccessory()` / `useDeleteAccessory()` already exist
- Each mutation invalidates `fleet-accessories-all` query key
- Offline fallback via `enqueueOffline()` to IndexedDB sync queue
- Input types already defined (AccessoryInput interface)

### Existing Pattern: AccessoryFormDialog

`src/components/pilot/AccessoryFormDialog.tsx` already has:
- Create and edit modes
- All field inputs (name, type select, serial number, compatible aircraft, status, notes)
- Uses comma-separated text input for compatible_aircraft
- Wired to useCreateAccessory/useUpdateAccessory hooks

### Pattern for Admin Accessories Page

The new admin page should:
1. Live at `src/pages/admin/Accessories.tsx`
2. Route at `/admin/accessories`
3. Be added to AdminNav under "Missions" category (fleet equipment is mission-related)
4. Reuse or import AccessoryFormDialog from pilot components
5. Add deletion confirmation with reference check

### Recommended Approach for Aircraft Compatibility (EQUIP-02)

The current `compatible_aircraft` column stores TEXT[] of model names (not UUIDs). The AccessoryFormDialog already accepts comma-separated model names. The EquipmentSelector already filters by matching `selectedAircraft.model` against this array.

Two options:
1. **Keep text array, add multi-select UI** using aircraft models from the aircraft table. This preserves compatibility with existing EquipmentSelector filtering logic.
2. **Migrate to UUID array with join table.** More normalized but breaks existing filtering in EquipmentSelector and requires a migration.

**Recommendation:** Option 1. The text array approach works, the filtering logic exists, and only 3 aircraft are in the fleet. A multi-select dropdown populated from the aircraft table gives the same UX benefit without schema changes.

### Deletion Guard Pattern (EQUIP-01)

The `mission_equipment.accessory_ids` column is a UUID[] that references accessories by ID. Since this is an array column (not a foreign key), Postgres will NOT enforce referential integrity automatically.

The deletion guard must be implemented in application code:
1. Before deleting an accessory, query `mission_equipment` where `accessory_ids @> ARRAY[accessory_id]::uuid[]`
2. If any rows exist, block deletion with a user-facing error message
3. Alternative: Create a Supabase database function that checks and returns an error

**Recommendation:** Database function approach is safer. Create a `delete_accessory_safe(p_id UUID)` function that checks for references and raises an exception if found. This prevents deletion from any client, not just the admin UI.

### PWA Icon Replacement (DEPLOY-01)

Current state:
- `public/pwa-192x192.png` (2,164 bytes) and `public/pwa-512x512.png` (9,074 bytes) exist
- SVG versions also exist but are not referenced in the manifest
- vite.config.ts manifest references only the PNG files
- Manifest names: "Trestle Field Operations" / "Trestle" with theme_color "#5B2C6F" (F&H purple)

The fix: Replace the two PNG files with Sentinel branded versions at the same dimensions (192x192 and 512x512). Same filenames means no config changes needed.

Icon requirements for PWA:
- 192x192: Used for install prompt and home screen on Android
- 512x512: Used for splash screen on Android, also declared as maskable
- Must be PNG format
- The maskable version should have safe zone padding (inner 80% circle contains the logo)

### Deposit Amount Fix (BILL-01)

Two locations need updating:

1. **QuoteBuilder.tsx line 51:** `Math.round(total * 0.25 * 100) / 100` changes to `0.5`
2. **QuoteBuilder.tsx line 228-233:** Placeholder text and suggestion text say "25%", change to "50%"
3. **create-deposit-invoice/index.ts line 148:** Description says "25% deposit", change to "50%"
4. **create-deposit-invoice/index.ts line 151:** Line item name says "Deposit (25%)", change to "Deposit (50%)"

The deposit_amount column on the quotes table stores an absolute dollar value, not a percentage. The percentage only appears in the UI suggestion and in the Square invoice description text. The actual calculation happens in QuoteBuilder (suggestedDeposit) and the deposit_amount value flows through to the edge function unchanged.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accessory CRUD hooks | New mutation/query hooks | Existing useFleetMutations.ts hooks | All CRUD operations already implemented |
| Accessory form | New form component | Existing AccessoryFormDialog (or clone) | Form already handles all fields |
| PWA manifest config | Manual manifest.json | vite-plugin-pwa config in vite.config.ts | Already configured, just swap icon files |
| Deletion cascade | ON DELETE CASCADE | Application-level check | accessory_ids is UUID[] not FK, cascade won't work |

## Common Pitfalls

### Pitfall 1: Deletion Without Reference Check
**What goes wrong:** Admin deletes an accessory that is referenced in mission_equipment.accessory_ids. The UUID[] array still contains the deleted ID, causing phantom references.
**Why it happens:** The array column has no foreign key constraint.
**How to avoid:** Check for references before allowing deletion. Show a clear error message listing which missions reference the accessory.
**Warning signs:** Orphaned UUIDs in accessory_ids arrays, "accessory not found" errors in EquipmentSelector.

### Pitfall 2: PWA Cache Stale Icons
**What goes wrong:** After replacing PWA icons, users still see old icons.
**Why it happens:** Service worker caches the old icons. The workbox config caches `**/*.png`.
**How to avoid:** Increment the service worker version or ensure VitePWA generates new cache-busting hashes on build. Since filenames stay the same but content changes, Vite's content hashing in the precache manifest handles this automatically.
**Warning signs:** Old icon visible after clearing browser cache.

### Pitfall 3: Deposit Percentage Inconsistency
**What goes wrong:** QuoteBuilder suggests 50% but the edge function invoice description still says 25%.
**Why it happens:** Two separate codebases (React frontend and Deno edge function) both hardcode the percentage string.
**How to avoid:** Update ALL four locations identified in the Architecture Patterns section. Grep for "25%" across the entire codebase before considering the fix complete.
**Warning signs:** Square invoice showing "25% deposit" when the amount is actually 50%.

### Pitfall 4: Compatible Aircraft Text Mismatch
**What goes wrong:** Admin types "M4E" instead of "DJI Matrice 4E" and the accessory never shows up in EquipmentSelector filtering.
**Why it happens:** compatible_aircraft is a freeform text array matched against aircraft.model.
**How to avoid:** Use a multi-select dropdown populated from the aircraft table so model names are always consistent.
**Warning signs:** Accessories not appearing in mission equipment selection despite being set as compatible.

## Code Examples

### Existing CRUD Hook Pattern (from useFleetMutations.ts)
```typescript
// Source: src/hooks/useFleetMutations.ts lines 266-291
export function useCreateAccessory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AccessoryInput) => {
      const payload = {
        name: input.name,
        type: input.type,
        serial_number: input.serial_number || null,
        compatible_aircraft: input.compatible_aircraft || [],
        status: input.status || 'active',
        purchase_date: input.purchase_date || null,
        notes: input.notes || null,
      };
      if (!navigator.onLine) {
        await enqueueOffline('insert_record', 'accessories', payload);
        return payload as unknown as Accessory;
      }
      const { data, error } = await supabase.from('accessories').insert(payload).select().single();
      if (error) throw error;
      return data as Accessory;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fleet-accessories-all'] });
    },
  });
}
```

### Existing EquipmentSelector Filtering (EQUIP-03 already done)
```typescript
// Source: src/components/pilot/EquipmentSelector.tsx lines 110-116
const selectedAircraft = filteredAircraft.find(a => a.id === selectedAircraftId);
const availableAccessories = (accessories || []).filter(acc => {
  if (acc.status !== 'active') return false;
  if (!acc.compatible_aircraft || acc.compatible_aircraft.length === 0) return true;
  if (!selectedAircraft) return true;
  return acc.compatible_aircraft.includes(selectedAircraft.model);
});
```

### Proposed Deletion Guard (Database Function)
```sql
-- Check if accessory is referenced by any mission before deleting
CREATE OR REPLACE FUNCTION public.delete_accessory_safe(p_accessory_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_ref_count
  FROM mission_equipment
  WHERE p_accessory_id = ANY(accessory_ids);

  IF v_ref_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete accessory: referenced by % mission(s)', v_ref_count
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  DELETE FROM accessories WHERE id = p_accessory_id;
END;
$$;
```

### PWA Manifest (already configured, no changes needed)
```typescript
// Source: vite.config.ts lines 17-48
VitePWA({
  registerType: "prompt",
  includeAssets: ["favicon.ico", "pwa-192x192.png", "pwa-512x512.png"],
  manifest: {
    name: "Trestle Field Operations",
    short_name: "Trestle",
    theme_color: "#5B2C6F",
    icons: [
      { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
      { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  },
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual manifest.json | vite-plugin-pwa generates manifest | Project inception | No manifest.json needed in public/ |
| navigator.onLine for offline detection | Already used in fleet mutations | v1.1 | Offline queue handles fleet CRUD |
| compatible_aircraft as freeform text | Multi-select from DB (proposed) | Phase 7 | Prevents model name mismatches |

## Open Questions

1. **Who creates the Sentinel branded PNG icon files?**
   - What we know: Two PNGs need replacement at 192x192 and 512x512. The 512x512 is also used as maskable (needs safe zone padding).
   - What is unclear: Whether design assets exist or need to be created. The project uses F&H purple (#5B2C6F) and gold (#C9A227).
   - Recommendation: Check if Sentinel logo files exist in the Obsidian vault or project assets. If not, this becomes a manual design task outside code scope. The planner should flag this as a prerequisite.

2. **Should compatible_aircraft store aircraft IDs instead of model names?**
   - What we know: Current schema uses TEXT[], EquipmentSelector matches on model name string. Only 3 aircraft exist.
   - What is unclear: Whether the model name approach will cause issues at scale.
   - Recommendation: Keep TEXT[] for Phase 7. Revisit if fleet grows beyond 5 aircraft (v2.x scope).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (configured in vite.config.ts) |
| Config file | vite.config.ts (test section, lines 109-113) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EQUIP-01 | Create/edit/delete accessories | unit | `npx vitest run src/pages/admin/Accessories.spec.tsx` | No, Wave 0 |
| EQUIP-01 | Deletion blocked when referenced | unit | `npx vitest run src/hooks/useFleetMutations.spec.ts` | No, Wave 0 |
| EQUIP-02 | Aircraft compatibility assignment | unit | `npx vitest run src/components/admin/AccessoryFormDialog.spec.tsx` | No, Wave 0 |
| EQUIP-03 | Filter accessories by aircraft | unit | `npx vitest run src/components/pilot/EquipmentSelector.spec.tsx` | No, Wave 0 |
| BILL-01 | Deposit calculates at 50% | unit | `npx vitest run src/pages/admin/components/QuoteBuilder.spec.tsx` | No, Wave 0 |
| DEPLOY-01 | PWA icons are production PNGs | manual-only | Visual inspection on device | N/A |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before verification

### Wave 0 Gaps
- [ ] `src/pages/admin/components/QuoteBuilder.spec.tsx` covers BILL-01
- [ ] `src/hooks/useFleetMutations.spec.ts` covers EQUIP-01 deletion guard
- [ ] `src/components/pilot/EquipmentSelector.spec.tsx` covers EQUIP-03 filtering

## Sources

### Primary (HIGH confidence)
- Project codebase: `supabase/migrations/20260210120100_fleet_management.sql` (accessories table schema, RLS policies, seed data)
- Project codebase: `src/hooks/useFleetMutations.ts` (all CRUD hooks exist)
- Project codebase: `src/hooks/useFleet.ts` (all query hooks exist)
- Project codebase: `src/components/pilot/AccessoryFormDialog.tsx` (form already exists)
- Project codebase: `src/components/pilot/EquipmentSelector.tsx` (aircraft filtering already implemented)
- Project codebase: `src/pages/admin/components/QuoteBuilder.tsx` (deposit at 25%, line 51)
- Project codebase: `supabase/functions/create-deposit-invoice/index.ts` (deposit labeled "25%", lines 148,151)
- Project codebase: `vite.config.ts` (VitePWA configuration)

### Secondary (MEDIUM confidence)
- None needed. All findings from direct codebase analysis.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH (all libraries already in project, zero new dependencies)
- Architecture: HIGH (patterns documented from actual codebase files)
- Pitfalls: HIGH (identified from real schema constraints and code analysis)

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable, no external dependencies)
