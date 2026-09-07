# SOP: Pavement Condition Shoot

Parking lot and pavement condition documentation following **ASTM D6433**, the
Pavement Condition Index method. Added 2026-07-25.

**The rule that makes this SOP different: a pavement condition job is two
passes, not one.** A single mapping pass cannot resolve crack severity.

## Pre-Shoot Checklist

- [ ] Weather check. Dry pavement. Wet or damp surfaces hide fine cracking and create false bleeding calls
- [ ] Sun angle. Mid-day is best. Low sun throws long shadows from light poles and curbs across the surface
- [ ] Airspace check, LAANC if required
- [ ] Lot use confirmed with client. An empty lot is worth scheduling for. Parked cars hide the pavement under them
- [ ] Batteries: 3+ minimum, two flight profiles
- [ ] Confirm at quote time whether pass 2 is **full coverage** or **targeted**
- [ ] SOP Gatekeeper completed in Trestle

## Equipment

- **Matrice 4E (required).** The two-camera capability is the reason this SOP works
- RTK enabled
- Crack comparator card, for ground truth on a sample of cracks
- Tape measure, for a scale check
- Safety vest. These are active commercial lots

## Flight Planning

### Pass 1, mapping, wide camera

- Standard SOP-002 mapping mission
- 75 to 80 percent overlap, RTK on
- Produces the orthomosaic and DSM

### Pass 2, detail, medium tele camera

- **Target GSD: 3.3 mm/px or finer.** Roughly 50 m on the medium tele
- This is the pass severity is read from

**Why 3.3 mm.** D6433 sets crack severity by width. The Low to Medium boundary
is **3/8 in (10 mm)**; Medium to High is **3 in (75 mm)**. Measuring a 10 mm
feature reliably wants about 3 pixels across it.

**Why the wide camera will not do.** At normal mapping altitude the wide camera
lands near 13.7 mm/px, roughly 4× too coarse. Reaching 3.3 mm on the wide lens
means flying at about 12 m, which is not a sane altitude over a commercial lot
with light poles and traffic.

> ⚠️ These GSD figures are computed from sensor specifications, not measured.
> The first job on this SOP includes hand-measured crack ground truth so the
> numbers can be corrected. See the vault SOP-002B.

## Shot List

### Mapping flight, automated
- [ ] Full lot at planned overlap, nadir
- [ ] Extend the boundary one full pass beyond the pavement edge

### Detail flight
- [ ] Full coverage or flagged areas, per the quote
- [ ] Note which areas received detail coverage. This goes in the report

### Supplemental manual
- [ ] Low oblique of each recorded distress cluster
- [ ] Drainage features: inlets, swales, low points
- [ ] Existing striping condition, for a restriping upsell
- [ ] Context shot of the lot in its surroundings

### Ground truth (first several jobs, and any job where severity is contested)
- [ ] 10+ cracks measured with the comparator card and photographed in place
- [ ] Record the location so the measurement can be matched to the imagery

## Distresses Recorded

v1 scope is the five that are reliably visible from overhead:

| D6433 code | Distress | Measured in |
|---|---|---|
| 01 | Alligator cracking | sq ft |
| 03 | Block cracking | sq ft |
| 10 | Longitudinal and transverse cracking | lin ft |
| 11 | Patching and utility cut patching | sq ft |
| 13 | Potholes | count |

**Elevation distresses are not an imaging problem.** Rutting, depression, swell,
shoving, and corrugation come from the **DSM via surface deviation**, not from
photographs. Do not call them from imagery, and do not promise them without the
DSM.

Texture distresses (bleeding, polished aggregate, weathering and raveling) are
out of scope. Sun angle and pavement age confound them and the false-positive
rate is high.

## Severity

Crack severity, from the standard:

| Severity | Longitudinal and transverse cracking |
|---|---|
| **L** | Non-filled width **< 3/8 in (10 mm)**, or a filled crack of any width with filler in satisfactory condition |
| **M** | Non-filled width **≥ 10 mm and < 3 in (75 mm)**, or with light secondary cracking |
| **H** | Non-filled **> 75 mm**, any crack with medium or high secondary cracking, or any width where ~4 in of surrounding pavement is severely broken |

Alligator cracking severity has **no width numbers**. It is textural: L is fine
hairline cracks, largely parallel, not spalled. M is a developed network, lightly
spalled. H is well-defined pieces, spalled at the edges.

## Deliverables

- [ ] Georeferenced distress map over the orthomosaic
- [ ] Distress inventory: type, severity, quantity, photo reference, per sample unit
- [ ] Photographs of each recorded distress
- [ ] Drainage and ponding assessment from the DSM
- [ ] Deliverables index and full flight log
- [ ] Accuracy statement per the mapping SOP

> **PCI scoring is a separate matter.** A numerical PCI score needs the licensed
> ASTM D6433 deduct value curves, which SAI buys when a contract requires the
> score. Without them, deliver the inventory and do not publish a PCI number or a
> rating band. The free Corps of Engineers PAVER manuals cover identification and
> severity but contain no deduct curves.

## Pricing Reference

Not yet set. Price the two passes separately, because the detail pass is the
main driver of flight time. Decide full coverage versus targeted at quote time.

## Safety Notes

- Active commercial lots have moving vehicles. Coordinate with the property manager and consider early morning
- Light poles, sign posts, and cart corrals are the obstacles that matter at low altitude
- The detail pass flies lower than a normal mapping mission. Walk the lot first

## Related

- Vault: `references/SOP-002B Pavement Two-Pass Capture.md`
- Vault: `projects/sentinel-aerial/spec-pavement-ai-model.md`
- Vault: `projects/sentinel-aerial/report-system-spec-v1.md` §5.2
