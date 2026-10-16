# Rewrite

A four-slide site about the love for rewriting, graph grammars and wave function collapse, told with an alphabet built from rotated rectangles joined by circles.

## Commands

- `bun dev` — Vite with `@ape-egg/vite-plugin-vibe` behind `../dev.sh` (`https://rewrite.localhost`, honors `$PORT`). [vite.config.js](vite.config.js) serves `/` from `pages/index.html`.
- `bun run build` — `vibe compile` in SPA mode (`spa: true`, one route) to `compiled/`.

## Site

vibe + vibe-compiler + stylecheat (hybrid build, vendored as `css/stylecheat.css`, `<body stylecheat dark>`) + codie. `pages/index.html` holds a vertical `<carousel><slides y>` with one component per slide: Grid, Alphabet, Message, Generator. Global state is `white` (starts `true`), flipped by the fixed stylecheat switch in the top right (grayscale off, colour-wheel thumb on). It sets `<carousel white>`; every piece is inline SVG coloured from CSS (`--piece-<kind>`, set from `colors` at boot), so the pieces and legend fade between white and colour in 400ms. [js/code.js](js/code.js) fills the generator's `<codie>` with the rules, written from the generator's own slots.

## Modules

- [js/letters.js](js/letters.js) — A–Z as strokes on a 4×6 grid, split into unit segments; `every` / `allowed` are the locations A–Z uses, `known` maps a glyph's signature back to its letter.
- [js/pieces.js](js/pieces.js) — each segment becomes one rectangle of two triangles (upright, flat, 45° corner, 2:3 diagonal), thickness `2H`, running from grid point to grid point. Every end point gets a circle of diameter `2H` drawn on top: at a joint it rounds the bend, on a loose end it finishes the stroke. `clash` runs separating axes over rectangles and circles alike; pieces may overlap where they share an end and run under the circles on their own ends, every other pair stays apart.
- [js/draw.js](js/draw.js) — `draw` gives each triangle and circle `class="piece"` with its kind's colour variable, keeping the literal colour as the attribute for out-of-page images (the favicon); `art` wraps it in an inline SVG. Only triangles take a stroke, the hairline that closes their seam; circles never do. The A–Z sheet is inline SVG, so its gray rulers (`rulers`) run to the slide's edges in the letters' own coordinates: one per side of the cell most letters share, per column and row (I sits inside its column's, Q's tail crosses its column's right one).
- [js/generator.js](js/generator.js) — part rules (slots), joint rules (`build`), circle rules (in `shapes`), rejection rules (off the alphabet, falls apart, overlaps) and the seeded `generate`. `choose` picks slots in order, each keeping only options that still let the letter touch the top and the bottom of its box.
- [js/lattice.js](js/lattice.js) + [components/Lattice.html](components/Lattice.html) — the background: the Perfect symmetry figures (all but Q, whose tail leaves its box) as 4 × 6 tiles laid edge to edge by wave function collapse. A seam is allowed when every stroke arriving at it meets a stroke of the neighbour; the result is one connected network. The resting lattice is a single `<img>` (an SVG data URL in the pieces' literal colours, filtered white under `carousel[white]`), because thousands of `<use>` clones as page nodes took over a second to style. A click runs shortest paths along the strokes and mounts one keyed signal SVG whose lines and lit figures wait `--t` and fade by CSS animation; off under prefers-reduced-motion.
- [components/Grid.html](components/Grid.html) — slide 1: the Graphabet title, tagline, footnote and scroll prompt to the left of the intro grid (stacked above it at ≤768px); the grid flashes each typed letter (keydown on the document; inputs and modifier keys ignored), with a tilted "Type something!" splash at the grid's top right corner, hidden where there's no hover.
