import { draw, svg } from '/js/draw.js';
import { generate } from '/js/generator.js';

// A new letter on every load: a random seed's random glyph in its piece colours, which read on light and dark tabs.
// At 16px the letters' own thickness is a third of a pixel, so the triangles' outlines are widened to hold up
export default () => {
  const { glyphs } = generate(1 + Math.floor(Math.random() * 10000));
  const glyph = glyphs[Math.floor(Math.random() * glyphs.length)];
  document.querySelector('link[rel="icon"]').href = svg('-1.4 -0.4 6.8 6.8', `<style>polygon { stroke-width: 0.5 }</style>${draw(glyph)}`);
};
