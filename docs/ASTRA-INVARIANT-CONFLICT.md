# Astra presentation experiment: invariant conflict

Resolved by explicit user approval: legacy assertions now select the public
broken working view. See ASTRA-EVALUATION.md for the completed experiment.
The inspection record below describes the original stop, before that approval.

Inspection baseline: `856b121b563b5e3030d564dde4c8b2914da31c15`.
Fetched origin; local main and origin/main match. No renderer, catalog, artwork,
lettering, compatibility, or test changes were made.

## Required stop

The user's request explicitly says: "If you believe an invariant itself is
genuinely incompatible with the new architecture, STOP and document the conflict
rather than silently changing the invariant."

`tests/phase2.cjs:98–100` requires the 10 ft and 13 ft configurations to have:

- Identical mounted-top coordinates and scale snapshot.
- Identical upper/lower post path data, with the assertion message
  "post length must not alter the established broken-post silhouette".
- Identical break path data.

These assertions run against the default live renderer. The requested default
continuous elevation at a fixed family scale must visibly change post length.
At 1:20, the difference between 10 ft and 13 ft is 1.8 inches on paper.
Preserving the current default silhouette cannot satisfy that requirement.
Varying a hidden post-only transform or maintaining a decoy test assembly would
evade the contract rather than resolve it.

Other tests explicitly refer to a break, its clearance, and the current 900 × 620
canvas (`test.html:505,514–517`). Those assumptions need review for a new sheet;
they are not permission to weaken mounting, clearance, or clipping checks.

## Diagnosis from the supplied references and current output

All six reference images and the reference hierarchy README were inspected.
Commissioned proofs were treated as composition evidence, installed photographs
as physical context, and neither as replacement product geometry.

The professional examples use most of a portrait page's height for one continuous
object. A clear top/sign region, long quiet shaft, and grounded base form a coherent
silhouette. Adjacent component annotations use the width without competing with
street names. Consistent longitudinal highlights and visible collars connect the
parts visually. The photographs confirm that very slender continuous shafts and
small finials are plausible; they do not justify widening a post or enlarging a
finial within the elevation. Perspective, scenery, and sculptural effects in the
examples are not techniques to copy under this assignment's constraints.

The current default proof occupies a small central area of a landscape canvas.
Its break separates the base from the head visually, while its base linework and
post gradient have markedly different treatments. The renderer fixes the mating
plane at 110 and grade at 552, with a compressed gap, independently of selected
post length. Several procedural component offsets also use legacy drawing units.
Changing only the page viewBox or removing only the break would not establish
inch-space geometry.

I agree with the proposed inch-space model, uniform projection, and deliberate
portrait-sheet composition. Reuse existing authoritative geometry and retain all
unknown/provisional qualifications. Selective enlarged details should be labeled
with their own scales. They must reuse the same geometry and cannot repair missing
product evidence. No aesthetic width multiplier is justified.

## Baseline validation

Executed the unchanged `node tests/validate.cjs` with the bundled Playwright
dependency and installed Chrome. Results:

- Artwork freshness and deterministic sanitization passed.
- 60 mounting checks passed; 25 base-joint checks passed.
- 252/252 assembly checks passed; 13 invalid combinations skipped as designed.
- 67 valid finial/post sizing combinations were within the existing tolerance.
- All four deliberate regressions were rejected.
- Catalog, compatibility, mounting frames, provenance, lettering, independent
  ink-height measurement, blocked output, standalone export, mobile, and print
  checks passed. Zero reported failures or browser errors.

Baseline screenshots and the runner's SVG export are outside the repository at
`C:\Users\Horizon\AppData\Local\Temp\aa-astra-baseline`.
No after output exists because implementation stopped at the explicit gate.

## Concrete resolution proposed for approval

Retain the existing broken-view assertions, tolerances, and negative controls in
an explicitly selected working-view mode. Authorize changing their setup to select
that mode rather than requiring the default customer proof to remain broken.
Add separate continuous-default checks for 10, 11, 12, and 13 ft lengths at the same
family drawing scale, uniform physical-to-page ratios, unchanged artwork path
hashes, preserved joints, page containment, disclosures, and standalone exports.
Any coordinate-specific test adaptation must measure the actual view being tested;
no test-only renderer or silent weakening is acceptable.

This is a proposed test-scope change, not an implemented workaround. Approval is
needed because of the user's explicit stop instruction. The visual experiment
has not been performed, so there is no basis yet to recommend merging a renderer
change or claim improved customer-proof quality.
