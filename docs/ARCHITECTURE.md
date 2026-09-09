# Couyon — Rendering Architecture

**Status:** agreed model, partially implemented.
**Applies to:** `index.html` (AA Proof Generator), prototype v0.7 and forward.
**Audience:** anyone (human or AI) modifying the renderer. Read this before changing
how components are positioned, scaled, or drawn.

---

## 0. The one-paragraph version

The proof generator assembles a street-sign system from independently selected
components that come from different product families and different nominal sizes.
We do **not** make the proof pretend that physically incompatible SKUs fit together.
We **do** make the assembled drawing read as believable hardware. Those two goals are
reconciled by separating **catalog geometry** (product truth) from **proof geometry**
(normalized visual representation), and by deriving all proof geometry from a single
literal dimension — post diameter at the mating plane — rather than from per-combination
offsets.

---

## 1. Two geometries

This is the central distinction. Every dimension in the app belongs to exactly one of
these, and confusing them is the root cause of the problems this document addresses.

### Catalog geometry — product truth

What the component *actually is*. Nominal diameters, real heights, SKUs, which post a
finial is genuinely manufactured to fit. This is the domain of the person placing the
order. It must never be silently altered to make a drawing look better.

### Proof geometry — normalized visual representation

How a component is drawn so the assembled proof reads as a plausible system. This may
legitimately depart from catalog truth:

- A post's **length is elided** by the break device — a 12 ft post is not drawn 12 ft long.
- An asset drawn for one post size may be **rendered at another size** when we don't yet
  have the correct vector.

Both departures are deliberate and disclosed. Neither changes the SKU.

### The rule

> Proof geometry may normalize *appearance*. It may never normalize *the bill of materials*.

A rendering accommodation must always be visible in the component summary table, which
is read by whoever places the order. It must not appear as a defect notice on the drawing,
which is read by the customer approving the design.

---

## 2. What the proof is (and isn't)

The proof is a **customer approval drawing**. It is not a fabrication drawing, not a shop
drawing, and not CAD. It exists to let a customer say "yes, that's the sign I want."

Consequences:

- Visual plausibility outranks dimensional literalism.
- The drawing is allowed to compress, normalize, and idealize.
- It must never become the document someone fabricates or orders from without consulting
  the spec table.
- Every proof carries the *Concept Proof — Not for fabrication* mark.

---

## 3. Coordinate system

### Canvas

`viewBox="0 0 900 620"`. The assembly is drawn into `<g id="assembly">`.

### Scale

`pxPerIn` — a single global. Currently `5.0`.

Dimensions that are **literal** (real inches × `pxPerIn`):

| Quantity | Source |
|---|---|
| Post width | `nominalDiameter × pxPerIn` |
| Base height | catalog height × `pxPerIn` |
| Blade width and height | catalog dims × `pxPerIn` |

Dimensions that are **deliberately non-literal**:

| Quantity | Why |
|---|---|
| Post length | Elided by the break device — see §4 |
| Finial overall size | Derived from socket fit — see §6 |
| Blade lateral offset | A projection convention — see §9 (unresolved) |

### Vertical datums

| Constant | Value | Meaning |
|---|---|---|
| `postTopY` | 110 | Top of post / finial mating plane |
| `topSectionBottomY` | 330 | Bottom edge of upper post segment (break starts) |
| `lowerSectionTopY` | 455 | Top edge of lower post segment (break ends) |
| `groundY` | 552 | Grade line |

The region between `topSectionBottomY` and `lowerSectionTopY` is the **compression zone**.
It is not a gap in the post — it represents elided length. Name it as such; do not treat
those two constants as independent layout values.

---

## 4. The post is the datum

The naive model is a chain:

```
finial → post → base
```

**This is wrong for this app.** Brackets and blades attach at arbitrary heights, the post
is drawn broken, and configurations move blades to different sides. A chain forces you to
add a new named anchor to the post for every new attachment.

The correct model is **host + attachments**:

```
                    ┌── finial        @ station: top
                    │
   POST (datum) ────┼── bracket/blade @ station: derived
                    │
                    ├── bracket/blade @ station: derived
                    │
                    └── base          @ station: ground
```

The post exposes a **mounting axis** (a vertical line at `postX`) and an **interface**
(`nominalDiameter`, `profile`). Any component mounts at a *station* — a y position along
that axis — with an orientation. Nothing is chained to anything else.

Adding a mid-post plaque, a second cross-blade, or a street-number panel later requires
no schema change.

---

## 5. Asset authoring convention

Every mountable vector asset is authored so that:

- **`x = 0` is the post centerline.**
- **`y = 0` is the mating plane** — the surface that contacts the post.
- The decorative body extends in **negative y** for top-mounted assets (finials),
  positive y for bottom-mounted ones.

The three existing finial assets already follow this. It was implicit; it is now a rule.

**Target state (not yet implemented):** assets are authored in **inches, 1 unit = 1 inch**.
When that lands, the anchor becomes purely a convention rather than stored data, `scale`
collapses to `pxPerIn`, and mounting widths become self-documenting real dimensions that
can be sanity-checked by reading the file. See §11.

---

## 6. Scaling rule — socket-driven, not height-driven

### The defect this replaces

Finial scale was computed as *target render height ÷ asset source height*:

```js
const scale = 38/200;   // pineapple
const scale = 31/118;   // ball
const scale = 18/58;    // dome cap
```

This normalizes the **decorative body** and lets the mounting socket land wherever it
lands. Measured against a 2⅜″ post (11.875 px):

| Asset | Socket at `y=0` | Rendered socket | Ratio to post |
|---|---|---|---|
| Pineapple | 81 u | 15.4 px | **1.30×** |
| Ball | 50 u | 13.1 px | **1.11×** |
| Dome cap | 76 u | 23.6 px | **1.99×** |

All three land near 1.0–1.2× on the **4″ square** post — these vectors are effectively
4″ assets being displayed on a 2⅜″ post. (Note also that the ball's divisor `118` does
not match its actual extent of `112`; the constants were not measured from anything.)

### The rule

Scale so that the **socket matches the post**, and let the decorative body follow:

```
scale = (postPxW × COLLAR_RATIO) / asset.mateWidth
```

- `asset.mateWidth` — the asset's width at `y = 0`, in its own units. One measured number
  per asset.
- `COLLAR_RATIO` — a single global (currently `1.10`) expressing that slip-fit hardware
  is slightly wider than the post it covers. Not per-asset, not per-combination.

Aspect ratio is always preserved. Assets are never stretched on one axis to meet the post.

The spear placeholder was previously drawn inline with absolute canvas coordinates. It has
been re-authored bottom-origin and moved into the registry, so the registry has no
exceptions — every finial goes through the same path. It remains a placeholder shape.

### Why this is also physically correct

A 4″ pineapple scaled to a 2⅜″ socket renders at ~59%. That is not a distortion — the real
2⅜″ pineapple genuinely *is* smaller. Checking the resulting implied real-world sizes at
`COLLAR_RATIO = 1.10` on a 2⅜″ post:

| Asset | Implied real height | Plausible? |
|---|---|---|
| Pineapple | ≈ 6.4 in | yes (typical 5–8 in) |
| Ball | ≈ 5.8 in | yes (typical 5–6 in) |
| Dome cap | ≈ 2.0 in | yes (slip-over cap) |

The rule produces sensible hardware across the library without any per-asset tuning.

---

## 7. Occlusion and overlap

**Implemented for the finial joint. Still outstanding at the base joint.**

The root cause of the "stacked objects" look was not a missing overlap but the post's
own end geometry: every segment was drawn as a rect with `rx = width/2`, which domes
**both** ends. The post therefore tapered to zero width exactly at the mating plane and
the finial's flat-bottomed collar landed on a point. `postSegment()` now takes an
independent radius per end, so an end is capped only where it is genuinely exposed:

| End | Radius |
|---|---|
| Upper segment top, finial mounted | flat — buried in the collar |
| Upper segment top, no finial | capped — a bare post reads as capped |
| Both break edges | flat — a snapped post is not pill-shaped |
| Ground end | capped (unchanged; normally hidden by the base) |

- Draw the post as **one continuous spine**, then paint mounted components over it in
  station order. Opaque components occlude naturally.
- Each mounting asset declares `embedDepth` — how far the post continues *inside* it. The
  post is simply drawn that much longer. No per-joint fudging. Values are measured off the
  rendered silhouette (the straight-sided run of each collar below its first flare), not
  chosen by eye: pineapple 34.25, ball 14.75, dome 17.50, spear 16.75 asset units.
- Draw order: **spine → base → finial → brackets → blades → text.** Blades and text last
  so lettering is never occluded.

### Two constraints

**Everything is currently `#111`, and that is hiding the joints.** Black-on-black conceals
every discontinuity. The moment finishes are introduced (bronze, green, white powder coat),
every seam becomes visible. Design the occlusion model now assuming parts will differ in
colour.

The remedy is also the physical answer: **every mounting asset should draw a visible
collar / ferrule at its mating plane.** Real hardware has one. It covers the joint honestly
instead of relying on same-colour overlap.

**Do not use `clipPath` or `<defs>` for occlusion.** `exportSVG()` clones the live node;
duplicated element ids in an exported file are a real breakage. Keeping the assembly
id-free preserves the export path. Painter's-algorithm z-order is sufficient and far more
debuggable.

---

## 8. Metadata schema

Deliberately minimal. Every field below is **per-component**. See §10.

### Mountable asset

```js
{
  svg:            "<g …>",   // artwork, authored per §5
  mateWidth:      81,        // width at y=0, in asset units        [implemented]
  drawnForPostDia: 4.0,      // nominal post dia this vector depicts [planned]
  embedDepth:     34.25,     // post continues this far inside,      [implemented]
                             //   in asset units
}
```

### Post

```js
{
  profile:         "round238",  // round238 | square4 | uchannel
  nominalDiameter: 2.375,       // inches — the mounting interface
}
```

Nothing else. If a field can be *computed* from these, it is not stored.

---

## 9. Open question — projection convention

**Unresolved. Flagged for a deliberate decision.**

A real installation has blades at 90° to each other. The proof currently draws both
face-on, offset horizontally by `bladePxW × 0.32` (or `0.38` in Offset config). That
constant is a fudge, and it is the kind that multiplies.

This is a **convention**, and it is currently undeclared. Two coherent options:

1. **True orthographic elevation** — one blade face-on, the cross blade drawn edge-on as a
   thin bar. Dimensionally honest; harder to read street names from.
2. **Declared spread convention** — both blades face-on, artificially separated by a
   documented rule. Readable; explicitly not an elevation.

Anchors and mount stations will not resolve this. It needs a product decision, and it is
probably a larger contributor to "the blades look wrong" than any joint geometry.

---

## 10. The anti-hack rule

> **Metadata attaches to a single component. Never to a pair.**

If you are about to write a key containing two component identities, stop — the model is
wrong, not the components.

```js
// NEVER
if (post === "TCP-238-BPP" && finial === "pineapple") { x += 4; scale = 0.73; }
```

### Enforcement — structural, not disciplinary

Mount rendering receives the post's **interface**, never its identity:

```js
renderMount(asset, { postDia, profile, pxPerIn })
```

There is no `post.sku` in scope. A combination-specific branch cannot be written without
changing the function signature — a visible, reviewable act rather than a quiet one-line
patch. This constraint will outlast any convention we agree to verbally.

---

## 11. Compatibility vs. render-fit

These are different questions and are stored differently.

| | Question | Source |
|---|---|---|
| **Render-fit** | Can we draw this plausibly? | Always yes. Universal. |
| **Compatibility** | Can this actually be ordered together? | Computed, not stored. |

Compatibility is **derived from one number**, not from parallel arrays:

```js
compatible = (asset.drawnForPostDia === post.nominalDiameter)
```

Explicitly rejected: `actualFits: [...]` / `renderableOn: [...]` lists. They are parallel
data that rots, and they impose real entry burden across a catalog that is not finished.
A single `drawnForPostDia` per asset yields the same capability with zero maintenance.

### Enforced incompatibility

Some combinations are not "render them plausibly" cases at all — they are invalid product
configurations, and making them look convincing would be optimising a thing that must never
be ordered. A galvanized u-channel traffic post never carries a decorative finial.

`reconcileSelections()` therefore disables the decorative finial options and forces
`Finial = None` whenever a u-channel post is selected, and the contact sheet records those
combinations as invalid rather than scoring them. This is a rule about one post profile,
not about a post/finial pair, so it does not violate section 10.

### Surfacing

- **Component summary table** — carries the note: *representative image; order the 2⅜″
  variant*. This is read by whoever places the order.
- **The drawing** — carries nothing. It is a customer approval document.

---

## 12. Testing — the contact sheet

`test.html` renders every finial × every post on one page, driving the real renderer
through same-origin iframes. **It never duplicates render logic** — a second copy of the
geometry would defeat its purpose.

It reads `window.__proofDebug`, which `render()` publishes each pass, to show the computed
scale and socket-to-post ratio numerically per cell.

### The mounting invariant

The sheet also **measures the rendered output** rather than re-deriving geometry. Using the
`data-part` hooks the renderer emits (`post-upper`, `post-lower`, `base`, `finial`), it
rasterises each assembly three times — post only, finial only, and whole — and checks four
things across the joint:

| Check | Fails when |
|---|---|
| ENTERS | the post is not actually present above the mating plane |
| NO GAP | any scanline across the joint is empty |
| COVERED | the finial is narrower than the post anywhere the post is inside it |
| EMERGES | the post is not at full width just below the collar rim (the old dome) |

The covered band is `[spineTop, matingY)` — the mating plane row itself is where the collar
legitimately ends, so it is excluded. `clear` reports the tightest margin in user units.

These checks are mutation-tested: zeroing `embedDepth`, shrinking the collar below post
width, and restoring the domed post terminus are each caught by a different check.

Any change to mounting, scaling, or draw order must be checked against the contact sheet
before it is committed. This is the only mechanism that will catch regressions as the asset
library grows — it would have surfaced the 1.99× dome cap immediately.

---

## 13. Migration status

| # | Step | Status |
|---|---|---|
| 1 | Delete dead render functions | **done** |
| 2 | Move bracket reconciliation out of `render()` | **done** |
| 3 | Socket-driven finial scaling | **done** |
| 4 | Contact sheet (`test.html`) | **done** |
| 5 | Inch-space asset authoring + `drawnForPostDia` | not started |
| 6 | Mount stations / host+attachments generalization | not started |
| 7a | Occlusion at the finial joint (`embedDepth`, flat ends) | **done** |
| 7b | Occlusion at the base joint + drawn collars | not started |
| 9 | Mounting invariant in the contact sheet | **done** |
| 10 | U-channel / decorative-finial incompatibility | **done** |
| 8 | Projection convention decision | **undecided** — §9 |

Steps 5–7 are deliberately deferred until the step 1–4 rendering change has been visually
validated.

**Design step 6 against brackets and blades, not against the finial/post/base stack.** The
vertical stack is the easy case and is a trivial special case of a general mount. A model
that only solves the stack will need redoing.

---

## 14. Known issues not yet addressed

- **Lower break squiggle overlaps the base.** `lowerSectionTopY` (455) sits below
  `baseTopY` (417 for a 27 in base), so the lower break marker is drawn *inside* the base.
  Invisible while everything is `#111`; a defect as soon as it isn't. Fix belongs with §7b.
  (The break *edges* themselves are now flat — only the marker's position is still wrong.)
- **Post is painted over the base.** Current draw order is base → post, so the post covers
  the base's lower ornament detail. Same fix. This is no longer hypothetical: the
  galvanized u-channel post renders in greys rather than `#111`, so on that post the
  overlap and the misplaced break marker are both plainly visible today. It is the first
  concrete instance of the colour problem described in section 7.
- **U-channel width is a raw pixel constant.** `postPxW = 22` for `uchannel`, not derived
  from a nominal dimension — implying ≈ 4.4 in, where real u-channel is ≈ 2.5 in. Give it a
  `nominalDiameter` like every other post.
- **Sub-pixel edges.** At `pxPerIn = 5`, a 2⅜″ post is 11.875 px centred on 450, so its
  edges land on `.0625` boundaries and antialias. Raising the internal working scale
  (e.g. `pxPerIn = 20` with a proportionally larger viewBox) removes a class of visual
  noise at no cost.
- **Base geometry is not interface-driven.** Bases are drawn procedurally with hardcoded
  half-widths (`postX ± 19`, `± 22`) that do not reference `nominalDiameter`. Same
  treatment as §6 is owed to them.

---

## 15. Working agreement

GitHub is the canonical source of truth. Both Claude and ChatGPT work from the repository,
not from chat attachments or locally saved copies.

- **Before editing:** pull latest `main`.
- **After meaningful edits:** commit with a descriptive message.
- **This repository is public.** No pricing, margins, or customer/development names are
  ever committed here. Those belong in a separate private repository.
