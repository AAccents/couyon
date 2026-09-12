# Proof provenance and measurement rules

The proof keeps sourced physical facts separate from geometry used only to make a
clear presentation. `DATA.*.dimensions` contains a physical value only when the
supplied vendor material states that value and the fact has a source. Rendering
code accepts those values through `physicalValue()`. `DATA.*.presentation`
contains representative fallbacks used through `proofDimension()` when no
verified physical value is available.

Confidence labels have these meanings:

- **vendor-supported**: the supplied vendor material states the fact for the
  named vendor component or profile;
- **reference-derived**: a Couyon project identity or drawing was derived from a
  reference, but product equivalence is not established;
- **representative** or **provisional**: geometry is suitable for a concept proof
  and is not fabrication geometry;
- **unknown**: the supplied material does not verify the fact.

Internal source keys refer to the supplied *Couyon Component Confidence Map v1*
and the supplied curated vendor PDF. They remain available in the screen-only
internal summary and `window.__proofDebug`; they are not embedded in customer
print or SVG output. Within the PDF, the proof uses OPP p.5 for the nominal 30 by 9 inch blade, OPP p.61 for the
2 3/8 inch round profile, OPP p.62 for the 4 inch square profile and SB46, OPP
p.63 for finial variants, and CPC pp.16–17 for CPC brackets, lettering guidance,
posts, bases, and assembly references.

The CPC bracket labels “30” and “36” describe the matching sign size. They are
not bracket-reach dimensions. Bracket reach therefore remains unknown and uses
the existing presentation-fit scale. If a future bracket record receives a
vendor-supported `reachIn` fact with a valid source, that physical reach takes
priority over the fallback. The bracket drawings remain provisional.

OPP p.62 supports an SB46 height of 29 inches and fit to the 4 inch square
profile. Those dimensional and fit facts are vendor-supported; the current SB46
silhouette remains provisional. CPC's 3 inch round post, 27 inch OPA9993 base,
and 8.25 inch welded OPR123BK8397 assembly are distinct references and do not
establish equivalence to Couyon's 2 3/8 inch project presets.

## Lettering interpretation

CPC p.16 states a 4 inch minimum for its 30 inch sign and a 6 inch minimum for
its 36 inch sign. Couyon provisionally adopts the 4 inch value as a project
guideline for the current AA-9X30 blade. The supplied source does not establish
that the AA blade is the CPC product and does not define how to measure a
mixed-case rendered name.

For proof validation, Couyon measures the rendered font's capital **H** ink
height and expresses it in blade inches. This capital-H ink-height proxy is
Couyon's provisional interpretation of the minimum, not a vendor-specified
measurement method. A name may shrink only to the applicable minimum. If it
cannot fit at that size, the blade displays `REVIEW NAME`, the complete proposed
name remains in the input and warning, and print and SVG export are blocked.

Standalone SVG exports retain the “Concept Proof — Not for fabrication” notice,
customer-safe component names, and customer-safe lettering results. Vendor names,
SKUs, AA IDs, family names, confidence labels, source labels, and internal notes
remain outside the customer export.
