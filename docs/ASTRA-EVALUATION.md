# Continuous customer-proof experiment

Branch: `codex/continuous-proof-experiment`.
Baseline: main `856b121b563b5e3030d564dde4c8b2914da31c15`.

## Assessment

I recommend merging this experiment as a material improvement to customer-facing
proofs. It substantially improves continuity, page hierarchy, product selection
legibility, and repeatable proportions. It does not yet equal the commissioned
examples' component rendering and bespoke composition. This is a visual judgment
from the supplied references and rendered outputs, not a customer-study result.

The continuous shaft now connects the head and base into one object. The fixed
portrait layout uses page height deliberately, with a quieter information column
and a separately labeled enlarged finial. The post remains physically slender.
The commissioned examples' coherent silhouette and adjacent annotations informed
the composition; their perspective, scenery and ornament were not copied. The IRL
photographs supported the slenderness and long quiet shaft, not dimensional claims.

The base and brackets remain the weakest visual elements: their existing procedural
geometry is simpler than the commissioned work. The ball detail still reads as a
vector component with restrained finish shading, not a sculptural illustration.
The deliberately opened street faces retain the existing spread-view convention;
this is not a literal orthographic view of two perpendicular blades.

## Implementation and compromises

- `assemblyInches()` carries dimensions, base/ground/socket datums, finial mount
  scale, and attachment stations in inches. Known and representative facts remain
  distinguishable. Nominal post length includes the socket embed; no embed amount,
  collar ratio, or mounting width was changed.
- Existing geometry/lettering emitters retain five authoring units per inch behind
  an explicit 0.2 unit conversion. One parent projection applies 72/20 points per
  physical inch, then page placement. Retaining that adapter is an incremental
  architectural compromise; this is not an all-new inch-native path library.
- All current post families share 1:20. Each added foot adds 43.2 points (0.6 in)
  to the printed post. The 10/11/12/13 ft post lengths are 432/475.2/518.4/561.6
  points on paper, including their embedded portions. No automatic fitting or
  post-width correction is used.
- The finial detail uses the same mounted paths at 1:4 and is omitted for no finial.
  No other detail is added mechanically. The detail does not establish unverified
  vendor fit or a new physical finial specification.
- A shared finish gradient and output-space highlight strokes affect paint only.
  The post surface spans the continuous shaft once, eliminating the old shading
  restart. No artwork path or new decorative product path was introduced.
- The fixed sheet blocks output when an assembly exceeds its reserved drawing area.
  A future unusual assembly may require another explicit sheet, not shrinking.
- The public broken working view retains its original geometry and behavior.
  Its tests select `?view=broken`; assertions, tolerances and negative controls
  were not changed. There is no test-only renderer or hidden alternate assembly.

All catalog data, compatibility/reconciliation, bracket geometry, lettering,
mount frames, artwork files, and generated artwork registry remain unchanged.
Existing provisional geometry remains provisional; its product verification gaps
were not resolved by this presentation pass. Customer-safe representative/fit
disclosures and the concept-proof qualification remain in the output.

## Evaluation outputs

Ignored local files under `exports/`:

- `before.png` and `before.svg`: generated from the actual baseline main HTML.
- `after.png`, `after.svg`, `after.pdf`: continuous sheet for the same configuration.
- `continuous-10ft.png` through `continuous-13ft.png`: fixed-scale comparison.
- `print-review.png`: rasterized final PDF used for print inspection.

Matched configuration: 12 ft, 3 in round fluted post, 3 in ball finial, Corinthian
base, Dogwood bracket, Standard spread view, blue faces/white lettering,
"Oak Ave" and "Pine St". These exports and supplied reference images are not committed.

The PDF was inspected with Poppler: one 612 × 792 point Letter page. The rasterized
page shows complete headings, component list, finial detail, qualification and
continuous elevation, with no clipping or visible break seam. Print at actual size;
printer scaling changes the declared scale.

## Verification

Final `node tests/validate.cjs` result: zero failures and zero browser errors.

- Unchanged legacy checks: 60 mounting, 25 base-joint, 252 assembly checks; 67 valid
  sizing combinations within their existing tolerance; 13 invalid configurations
  skipped as designed; all four deliberate regressions rejected.
- Unchanged catalog, provenance, compatibility, mount-frame, lettering and
  independent ink-height checks pass, as do blocked output and legacy print/export.
- Continuous checks: default mode, 10–13 ft rendered path lengths, constant uniform
  X/Y projection, post/blade/base ratios, known bracket reach, unchanged collar and
  embed relationships, contiguous post segments, page containment and overflow
  blocking, customer disclosures, detail path identity, mobile layout and print.
- 265 valid post/finial/base combinations pass continuous containment/width checks;
  known base heights retain their physical-to-page ratio.
- All nine artwork SVG path lists match SHA-256 baseline fixtures (only CRLF/LF
  differences are normalized). Artwork generation freshness also passes.
- Standalone exported SVG parses, raster-decodes, has unique IDs and resolved
  internal references, and excludes tested internal product/vendor identities.
- Print hides controls/internal summaries, sizes the SVG to Letter, and suppresses
  a proof with unresolved lettering. PDF size/page count was checked separately.

No merge or deployment has been performed. The branch is ready for visual review
and can be rejected without affecting main.
