# Rewrite

A four-slide site about the love for rewriting, graph grammars and wave function collapse, told with an alphabet built from rotated rectangles joined by circles.

## Commands

- `bun dev` — Vite with `@ape-egg/vite-plugin-vibe` behind `../dev.sh` (`https://rewrite.localhost`, honors `$PORT`). [vite.config.js](vite.config.js) serves `/` from `pages/index.html`.
- `bun run build` — `vibe compile` in SPA mode (`spa: true`, one route) to `compiled/`.

## Site

vibe + vibe-compiler + stylecheat (hybrid build, vendored as `css/stylecheat.css`, `<body stylecheat dark>`) + codie. `pages/index.html` holds a vertical `<carousel><slides y>` with one component per slide: Grid, Message, Alphabet, Generator. [js/code.js](js/code.js) fills the generator's `<codie>` with the rules, written from the generator's own slots.

## Modules

- [js/letters.js](js/letters.js) — A–Z as strokes on a 4×6 grid, split into unit segments; `every` / `allowed` are the locations A–Z uses, `known` maps a glyph's signature back to its letter.
- [js/pieces.js](js/pieces.js) — each segment becomes one rectangle of two triangles (upright, flat, 45° corner, 2:3 diagonal), thickness `2H`, running from grid point to grid point. Every end point gets a circle of diameter `2H` drawn on top: at a joint it rounds the bend, on a loose end it finishes the stroke. `clash` runs separating axes over rectangles and circles alike; pieces may overlap where they share an end and run under the circles on their own ends, every other pair stays apart.
- [js/draw.js](js/draw.js) — SVG data URLs: glyphs, the ghost grid, the A–Z sheet, and `paint` for the all-white view New letters switches to with Toggle colors.
- [js/generator.js](js/generator.js) — part rules (slots), joint rules (`build`), circle rules (in `shapes`), rejection rules (off the alphabet, falls apart, overlaps) and the seeded `generate`.
