# Customer-proof composition refinement

Baseline: `35653d3`, the first continuous-elevation implementation.
Scope: output paint and sheet composition in `proof-sheet.js` only.

## Customer-facing assessment

The assembly now leads the page. The previous filled, enlarged ball competed with
the sign head; its replacement is a quiet profile lower on the page. The compact
configuration block occupies substantially less vertical space and no longer reads
as a second primary section. Sparse finial/post/base labels keep the reader's eye
on the assembled product. Copy asks the customer to confirm names and selections,
with scale information subordinate to that task.

I prefer this refinement to the first continuous proof. It follows the commissioned
references more closely in hierarchy: one dark continuous product, nearby labels,
long quiet shaft, and supporting information. No reference ornament, perspective,
scenery or dimensional interpretation was copied. The elevation itself has exactly
the same scale, position and slenderness as before.

The remaining weakness is the procedural base/bracket appearance. Finish treatment
helps unify the components, but cannot supply the commissioned examples' sculptural
detail. The retained outline detail is still somewhat technical. This is a better
customer approval page, not a claim that the artwork now matches bespoke illustration.

## Detail selection and constraint

No detail is emitted for no finial or the simple dome cap. Other selected finials
retain a profile that supports outline/ornament review without depicting another
black finished object. The caption explicitly identifies it as a profile.

The existing continuous test explicitly requires the ball detail to exist at 1:4.
The user's instruction freezes tests and the scale/projection system. Therefore
its scale and source paths remain intact; the substantial reduction is in ink
weight, contrast, prominence and placement, rather than physical footprint. No
hidden duplicate, test-only condition, altered assertion, or scale multiplier was
introduced. Removing that ball detail or reducing its actual scale would require
a separate decision about the frozen presentation assertion.

## Finish diagnosis and treatment

The previous pass gave bases/finials a cool near-black gradient with a relatively
bright highlight, while posts retained separate neutral grayscale gradients. The
post profiles also had different luminance ranges, and brackets retained solid
black. This produced apparent finish differences despite an intended common finish.

Output treatment now maps existing post gradient stops into the same neutral
shadow/highlight range used by finials and bases, reduces the latter's highlight
peak, uses neutral detail strokes, and aligns bracket ink with the body palette.
Authored gradient stop positions and profile-specific shading structure remain.
Source paths and all geometry remain untouched. Existing part-by-part shading
structure still limits how continuous the highlights can appear across joints.

## Comparison and verification

Ignored local comparison files:

- `exports/composition-before.png` / `.svg` / `.pdf`: preserved first continuous proof.
- `exports/composition-after.png` / `.svg` / `.pdf`: revised composition.
- `exports/composition-default.png`: simple dome configuration without a detail.

The matched before/after uses the same 12 ft, 3 in fluted post, ball finial,
Corinthian base, Dogwood bracket, blue/white Oak Ave and Pine St configuration.

All existing tests pass unchanged: 252 legacy assembly checks, 60 mounting checks,
25 base checks, four negative controls, and 265 continuous catalog combinations,
plus scale, path hashes, lettering, customer-safe export, mobile and print checks.
The final PDF was rasterized and visually inspected: one 612 × 792 point Letter
page, complete labels/specifications and qualification, no visible clipping.

`assemblyInches()`, `configureProjection()`, `checkSheetContainment()`, the entire
main renderer, all tests, catalog data and validated artwork are unchanged in this
refinement. Only paint and sheet annotations/detail presentation changed.
