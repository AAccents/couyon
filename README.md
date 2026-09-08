# Couyon

Internal proofing tool for **Aluminum Accents**.

Couyon generates concept proofs for decorative street-name sign systems — post,
base, finial, bracket, and blade combinations — as a scalable vector drawing that
can be printed, saved as PDF, or exported as SVG for a customer proof.

Current state: **prototype v0.7**, single-file HTML app, no build step and no
dependencies.

## Running it

### Live app

Couyon is intended to be published from the repository root with **GitHub Pages**:

- Source branch: `main`
- Folder: `/ (root)`
- Expected public URL: `https://aaccents.github.io/couyon/`

Once Pages is enabled, the live site follows `main`: commit a change, wait for
GitHub Pages to deploy it, then refresh the live app.

### Local fallback

Open `index.html` in any modern browser. No build step or local server is required.

The header includes a build indicator. On the hosted version it attempts to show
the first seven characters of the latest `main` commit SHA, making it easier to
confirm which revision is running.

## What it does

- Pick a blade style, bracket, finial, post, and base from the component catalog
- Enter customer/development name and one or two street names (either can be omitted)
- Choose sign face and lettering colors
- Live SVG preview scaled from real catalog dimensions (5 px per inch), with the
  post shown broken so full 12 ft / 13 ft heights fit on the page
- Component summary table with SKUs for the spec sheet
- **Print / Save PDF** — print stylesheet hides the controls and prints the proof card only
- **Export SVG** — downloads `AA_Street_Name_Proof.svg` for vector editing

## Component catalog

Components live in the `DATA` object near the top of the `<script>` block in
`index.html`. Adding a part is a matter of adding an entry with its `sku`,
`label`, and geometry fields.

Finial artwork (pineapple, ball, dome cap) is hand-built SVG stored in the
`AA_*_SVG` constants. The Rouzan 4 in square post and SB46 base are selectable
placeholders drawn as approximate silhouettes until their dedicated vectors
are traced.

## Known limitations / next up

- Rouzan SB46 base and 4 in square post need real vectors
- Only one blade size (9 x 30) is in the catalog so far
- Spear finial is a placeholder shape
- Proof output is marked *Concept Proof — Not for fabrication*; dimensioned
  shop drawings are out of scope for the prototype


## Development workflow

Treat `main` as the canonical current Couyon source. Before editing, fetch the
latest repository version. After a meaningful, tested change, commit it with a
descriptive message. This keeps ChatGPT, Claude, and human edits synchronized and
gives the SVG geometry a recoverable history.

Do not commit customer proof exports, credentials, API keys, private customer data,
or vendor-confidential material.
