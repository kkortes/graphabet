# Rewrite

A four-slide site about the love for rewriting, graph grammars and wave function collapse, told with an alphabet built from rotated rectangles joined by circles.

## Commands

- `bun dev` — Vite with `@ape-egg/vite-plugin-vibe` behind `../dev.sh` (`https://rewrite.localhost`, honors `$PORT`). [vite.config.js](vite.config.js) serves `/` from `pages/index.html`.
- `bun run build` — `vibe compile` in SPA mode (`spa: true`, one route) to `compiled/`.

## Site

vibe + vibe-compiler + stylecheat (hybrid build, vendored as `css/stylecheat.css`, `<body stylecheat dark>`) + codie. `pages/index.html` holds a vertical `<carousel><slides y>` with one component per slide: Grid, Message, Alphabet, Generator. Global state is `white` (starts `true`), flipped by the fixed Color toggle in the top right; the alphabet, legend, glyph cards and big glyph pick their white or coloured image from it. [js/code.js](js/code.js) fills the generator's `<codie>` with the rules, written from the generator's own slots.

## Modules

- [js/letters.js](js/letters.js) — A–Z as strokes on a 4×6 grid, split into unit segments; `every` / `allowed` are the locations A–Z uses, `known` maps a glyph's signature back to its letter.
- [js/pieces.js](js/pieces.js) — each segment becomes one rectangle of two triangles (upright, flat, 45° corner, 2:3 diagonal), thickness `2H`, running from grid point to grid point. Every end point gets a circle of diameter `2H` drawn on top: at a joint it rounds the bend, on a loose end it finishes the stroke. `clash` runs separating axes over rectangles and circles alike; pieces may overlap where they share an end and run under the circles on their own ends, every other pair stays apart.
- [js/draw.js](js/draw.js) — SVG data URLs: glyphs, the ghost grid, and `looks` for every glyph image in both its piece colours and all white. The A–Z sheet is inline SVG, so its gray rulers (`rulers`) run to the slide's edges in the letters' own coordinates: one per side of the cell most letters share, per column and row (I sits inside its column's, Q's tail crosses its column's right one).
- [js/generator.js](js/generator.js) — part rules (slots), joint rules (`build`), circle rules (in `shapes`), rejection rules (off the alphabet, falls apart, overlaps) and the seeded `generate`. `choose` picks slots in order, each keeping only options that still let the letter touch the top and the bottom of its box.
- [components/Grid.html](components/Grid.html) — the intro grid flashes each typed letter (keydown on the document; inputs and modifier keys ignored), with a tilted "Type something!" splash at the grid's top right corner, hidden where there's no hover.
