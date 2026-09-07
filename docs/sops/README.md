# Sentinel Aerial Inspections — Shoot SOPs

Standard Operating Procedures for all drone mission types.

## Mission Types

| # | Mission Type | SOP | Typical Duration | Key Equipment |
|---|-------------|-----|-----------------|---------------|
| 1 | [Construction Update](construction-update.md) | Progress documentation | 20-35 min | Mini 4 Pro / Matrice 4E |
| 2 | [Roof Inspection](roof-inspection.md) | Condition assessment | 10-20 min | Mini 4 Pro + optional thermal |
| 3 | [Real Estate](real-estate.md) | Property marketing | 15-30 min | Mini 4 Pro, ND filters |
| 4 | [Land Survey & Mapping](land-survey-mapping.md) | Photogrammetry / orthomosaic | 20-60 min | Matrice 4E (RTK), GCPs |
| 5 | [Insurance Documentation](insurance-documentation.md) | Damage claims evidence | 15-25 min | Mini 4 Pro + thermal, RAW mode |
| 6 | [Solar Panel Inspection](solar-panel-inspection.md) | Array thermal assessment | 15-30 min | Matrice 4E + thermal (required) |
| 7 | [Pavement Condition](pavement-condition.md) | ASTM D6433 distress documentation | 40-90 min (two passes) | Matrice 4E (RTK), wide + medium tele |
| 8 | [Cemetery Documentation](cemetery-documentation.md) | Marker inventory + site map | 45-120 min | Matrice 4E (RTK), medium tele |

Steeple and spire work is covered inside [Roof Inspection](roof-inspection.md),
since it is the roof SOP plus one zone set and one added deliverable.

## Quick Reference — Pricing Ranges

| Mission Type | Entry | Mid | Premium |
|-------------|-------|-----|---------|
| Construction Update | $200 | $350-500 | $1,200-1,800/mo retainer |
| Roof Inspection | $150 | $250-400 | $400-800 commercial |
| Real Estate | $150 | $300-450 | $650-1,200 luxury |
| Land Survey & Mapping | $250 | $400-700 | $700-1,500+ large site |
| Insurance Documentation | $250 | $400-600 | $600-1,000 litigation |
| Solar Panel Inspection | $200 | $350-500 | $900-1,500+ commercial |
| Pavement Condition | not set | not set | not set |
| Cemetery Documentation | not set | not set | not set |

## Scope Exclusions (added 2026-07-25)

**SAI flies outdoors.** The following are declined, and declined on the first
call rather than quoted to buy time:

| Excluded | Examples |
|---|---|
| Indoor flight | Warehouses, plants, arenas, hangars, any roofed interior |
| GPS-denied environments | Anywhere GNSS is unavailable or unreliable |
| Confined space | Tanks, silos, vessels, ducts, tunnels |
| Close-quarters work around large steel structure | Overhead cranes and rails, gantries, tight bridge undersides |

Why: without GNSS the aircraft cannot be relied on to hold position, and vision
positioning degrades against repetitive steel and low light. A large steel mass
makes heading unpredictable. Inside a structure there is usually no safe abort
direction. This work is served by collision-tolerant or caged aircraft built for
it, which SAI does not operate. Insurance coverage for indoor operation has also
never been confirmed.

Precedent: a 50-ton overhead crane inspection was declined on 2026-07-25 for
exactly these reasons.

Lifting the exclusion needs all four of: a caged or collision-tolerant aircraft,
written insurance confirmation, logged GPS-denied practice hours, and a published
indoor SOP. Every SOP in this folder assumes outdoor flight with GNSS.

## Universal Pre-Flight (All Mission Types)

1. Weather check (wind, precipitation, visibility, cloud cover)
2. Airspace check (TFRs, controlled airspace, LAANC authorization)
3. Battery status (minimum 2 charged, 3+ for mapping)
4. Memory card formatted and verified
5. Client communication confirmed
6. Equipment checklist per mission type
7. SOP Gatekeeper completed in Trestle app

## Next Steps

- [ ] Implement as selectable mission types in Trestle with auto-loaded checklists
- [ ] Add shot list templates that pilots can check off during missions
- [ ] Build deliverable tracking per mission type
- [ ] Create client-facing versions (stripped of pricing) for proposals
