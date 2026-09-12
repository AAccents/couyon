# Couyon — Rendering Architecture

**Status:** implemented mounting and spread-view model; catalog compatibility remains incomplete.
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

A rendering accommodation must always be visible in the screen-only internal component
summary, which is read by whoever places the order. It must not appear as a defect notice
on the drawing, which is read by the customer approving the design.

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

### Identity boundary

Every component record has a stable AA `id`, a `vendor` array, and a
customer-safe `customer` object. Vendor arrays exist from the first entry so later
equivalent suppliers do not require a schema change; vendor switching is outside the
current implementation.

`internalSummary(component)` may read the full record and is rendered only inside a
`.screenOnly` block. `customerSummary(component.customer)` can read only the customer
projection. The live and exported SVG metadata and description are built through that
customer projection, so vendor identity, AA IDs, family names, provenance, and debug
state are structurally unavailable to the customer-output path. Component `<select>`
values use stable AA IDs; array positions remain only a test-matrix concern.

---

## 3. Coordinate system

### Canvas

`viewBox="0 0 900 620"`. The assembly is drawn into `<g id="assembly">`.

### Scale

`pxPerIn` — a single global. Currently `5.0`.

Dimensions that are **literal** (real inches × `pxPerIn`):

| Quantity | Source |
|---|---|
| Post width | `widthIn × pxPerIn` |
| Base height | catalog height × `pxPerIn` |
| Blade width and height | catalog dims × `pxPerIn` |

Dimensions that are **deliberately non-literal**:

| Quantity | Why |
|---|---|
| Post length | Elided by the break device — see §4 |
| Finial overall size | Derived from socket fit — see §6 |
| Blade lateral offset | A projection convention — see §9 (unresolved) |

### Vertical datums

| Datum | Value | Meaning |
|---|---|---|
| `postTopY` | 110 (fixed) | Top of post / finial mating plane |
| `topSectionBottomY` | 330 (fixed) | Bottom edge of upper post segment (break starts) |
| `baseTopY` | **derived** — `groundY − heightIn × pxPerIn` | Base mating plane (its top face) |
| `lowerSectionTopY` | **derived** — `max(topSectionBottomY + MIN_COMPRESSION, min(topSectionBottomY + MAX_COMPRESSION, baseTopY − EXPOSED_RUN))` | Top edge of lower post segment (break ends) |
| `groundY` | 552 (fixed) | Grade line |

The region between `topSectionBottomY` and `lowerSectionTopY` is the **compression zone**.
It is not a gap in the post — it represents elided length.

**Its top is fixed and its length varies.** That is the correct shape for the model: the
zone absorbs however much post the base height leaves over, so a consistent run of post is
always visible emerging from the base. `lowerSectionTopY` was previously a hardcoded 455
that ignored base height entirely, which put the whole lower segment — and the break marker
with it — inside any base taller than about 19 in. Treating both boundaries as independent
constants is what licensed that bug; do not go back to it.

`MIN_COMPRESSION` clamps the zone so an unusually tall future base cannot collapse it.
`MAX_COMPRESSION = 60` limits the visual gap. Short bases and Base = None therefore
show a longer lower post instead of two disconnected stubs. `EXPOSED_RUN` is a minimum
target, subject to the tall-base clamp, rather than a fixed visible length.
`Base = None` needs no special case: `baseTopY == groundY`, and the same expression gives
the right answer.

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
(`widthIn`, `profile`). Any component mounts at a *station* — a y position along
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

**Implemented for both finial and base joints.**

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

### The base joint

**A base's mating plane is its top face. The post passes behind it and continues to grade.
The base occludes.** That single convention covers a decorative sleeve (Corinthian, SB46)
and a welded plate base alike — in both cases the post is hidden below the top face, so the
distinction does not need to be modelled.

Consequences, all of which are now implemented:

- The base is emitted **after** the post segments, so it occludes them. Previously it was
  emitted first and the post was painted over the base, erasing 40% of the Corinthian's
  detail on a 2⅜ in post and 54.8% on a 4 in post.
- The break marker is emitted **with the post, before the base**, so it can never show
  through a base even if the layout is later changed.
- A base terminates at grade. Nothing may overhang `groundY`.

Note that the draw order above was *already* documented here before it was implemented —
the code contradicted it. If the code and this document disagree about draw order, this
document is the specification.

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
  widthIn:         2.375,       // inches — diameter or profile width
}
```

Nothing else. If a field can be *computed* from these, it is not stored.

### Base

`heightIn` stores the numeric catalog height separately from the display label. Its
mating plane is `groundY − heightIn × pxPerIn`, and the occlusion convention in section 7
does the rest. Do not add a `throatDepth` or an embed field by analogy with `embedDepth` —
the finial needed one because the post enters it from below and stops; the post simply
passes behind a base and keeps going.

---

## 9. Projection and street attachments

The proof uses a **declared spread view**: both perpendicular street faces are opened
toward the viewer for name approval. This preserves the existing product convention;
it is not an orthographic elevation. The control hint and configuration summary say so.

`streetLayout()` receives host dimensions and selections, never SKUs. It returns the
active stations, blade centers, bracket directions, rail elevations and bracket scales.

- Standard: primary above/left, cross below/right; a six-inch inboard tail, or the
  minimum mounting seat if larger, keeps each blade spanning the entire post.
- Inverted: cross above/left, primary below/right.
- Offset: reduce the inboard tail to half the post width plus one inch.
- One street: center it on the post at the upper station, regardless of its identity
  or the retained two-street configuration. Neither street: no blades or brackets.

The first face starts three inches below the post mating plane. Brackets are scaled
uniformly from their shared artwork envelope (96 units reach, 32 depth, 4.5 rail
half-width), with three inches of inset from the projecting blade end. Their top rail
touches the blade underside; a post-width collar covers the attachment. The next
face starts below the complete bracket envelope plus 1.5 inches of clearance.
With no bracket, the face-to-face gap is 1.5 inches.

Lettering is measured in the browser's actual font and reduced independently to fit
each blade, with eight units of horizontal inset. No external font is required. The
current validity rule uses rendered capital-H ink height as Couyon's provisional
interpretation of the supplied 4 in minimum. It is not a vendor-specified measurement
method. A name that cannot fit at the minimum becomes an explicit conflict and blocks
print and SVG export. See `docs/PROVENANCE.md` for source scope and confidence rules.

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

The original proposal derived compatibility from one number:

```js
sameNominalSize = (asset.drawnForPostDia === post.widthIn)
```

This is not implemented and is not sufficient evidence of compatibility: profile and
vendor socket specifications also matter. Do not infer ordering fit from a scaled
image. Avoid speculative parallel `actualFits` / `renderableOn` lists until the catalog
has verified interface data.

### Enforced incompatibility

Some combinations are not "render them plausibly" cases at all — they are invalid product
configurations, and making them look convincing would be optimising a thing that must never
be ordered. A galvanized u-channel traffic post never carries a decorative finial.

`reconcileSelections()` therefore disables the decorative finial options and forces
`Finial = None` whenever a u-channel post is selected, and the contact sheet records those
combinations as invalid rather than scoring them. This is a rule about one post profile,
not about a post/finial pair, so it does not violate section 10.

### Surfacing

- **Screen-only internal component summary** — carries provenance and ordering detail.
  Print CSS excludes the entire block.
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

### The base-joint invariant

The same technique, applied at the other end:

| Check | Fails when |
|---|---|
| COVERED | the base is narrower than the post anywhere the post is behind it |
| CONTINUOUS | any scanline from the break down to grade is empty |
| EXPOSED RUN | no run of post is visible between the break marker and the base top |
| MARKER CLEAR | the break marker is not entirely above the base |
| GROUNDED | the base extends below grade |

Two boundary rows are excluded by construction rather than by fudge factor. The grade row
is the terminating edge of both post and base, so CONTINUOUS runs to `groundY` exclusive.
A base's top is the apex of a cap rather than a flat face, so COVERED starts from the row
where the base first reaches post width and additionally requires that to happen within
`COVER_ENTRY_MAX` of the top — a taper the post shows through briefly is correct; a base
that never covers the post is not.

COVERED and GROUNDED are not applicable when no base is fitted.

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
| 6 | Mount stations for blades and brackets | **done**, limited to current catalog |
| 7a | Occlusion at the finial joint (`embedDepth`, flat ends) | **done** |
| 7b | Occlusion at the base joint (draw order, derived break, grade) | **done** |
| 7c | Drawn collars / ferrules for coloured finishes | not started |
| 9 | Mounting invariant in the contact sheet | **done** |
| 10 | U-channel incompatibility (decorative finials and bases) | **done** |
| 8 | Projection convention decision | **declared spread view** — §9 |

Inch-space conversion and finish-specific artwork remain deferred; existing vectors
are retained. Blade/bracket stations and base/finial joins have been visually validated.

**Design step 6 against brackets and blades, not against the finial/post/base stack.** The
vertical stack is the easy case and is a trivial special case of a general mount. A model
that only solves the stack will need redoing.

---

## 14. Current limitations and resolved silhouette defects

The Corinthian foot now has a flat bearing edge instead of tapering to a point at grade.
Its narrow throat uses `max(artworkHalfWidth, postPxW × COLLAR_RATIO / 2)`. This keeps
the original ornament, outer width and catalog height while providing post clearance.
The square-post accommodation is disclosed in the base summary; it does not establish
vendor compatibility. All base-joint pixel tests pass without relaxed tolerances.

Post catalog entries now carry `widthIn` (profile-neutral because square and channel
posts do not have a diameter): 2.375, 4, and a **representative** 2.5 for U-channel.
The channel width needs vendor confirmation and is identified as representative in
the UI. Finial artwork normalization is also disclosed in the summary.

Still outstanding:

- Verified vendor sockets, nominal base widths and ordering compatibility. Diameter
  alone cannot prove that a round socket fits a square profile; section 11's proposed
  equality test is insufficient for ordering. No new compatibility claims are made.
- SB46, square-post details and spear remain approximate assets.
- Additional blade sizes and real bracket dimensions need catalog evidence. The
  bracket geometry is representative artwork, not fabrication geometry.
- Unusually tall future bases or larger blades need a fit policy before catalog entry;
  the current 330-unit upper break datum is validated for the existing catalog only.

## 14a. Complete-assembly regression coverage

The contact sheet also exercises 144 cases: four posts × three configurations × three
bracket styles × four street-presence states. It measures rendered bounds for blade/post
overlap, lettering containment, bracket rail contact and reach, street order, separation,
canvas bounds, break length and base paint order. Twelve representative assemblies are
shown; every failure is shown. `window.__testResults` exposes a machine-readable result.

The optional `tests/validate.cjs` runner uses Playwright with installed Chrome, serves
the two HTML files on loopback, checks the sheet, and saves screenshots and an exported
SVG/PDF outside the repository. It also tests long/escaped names, selection transitions,
mobile overflow, print controls and SVG parsing. Four deliberate regressions (misplaced
bracket, overflowing text, missing blade, reversed base paint order) must be rejected.

---

## 15. Working agreement

GitHub is the canonical source of truth. Both Claude and ChatGPT work from the repository,
not from chat attachments or locally saved copies.

- **Before editing:** pull latest `main`.
- **After meaningful edits:** commit with a descriptive message.
- **This repository is public.** No pricing, margins, or customer/development names are
  ever committed here. Those belong in a separate private repository.
