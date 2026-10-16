import { every, letters, segs } from '/js/letters.js';
import { H, halves, shapes, clash } from '/js/pieces.js';

export const colors = { upright: '#7fd18b', flat: '#6aa9ff', corner: '#ff9f5a', diagonal: '#e07bd0', joint: '#f2d36b' };
export const neutral = '#c9ccd3';

const tri = (t, color, seams, [ox, oy]) => `<polygon points="${t.map(([x, y]) => `${(x + ox).toFixed(3)},${(y + oy).toFixed(3)}`).join(' ')}" fill="${color}" stroke="${seams ? '#111' : color}" stroke-width="${seams ? 0.012 : 0.004}" stroke-linejoin="round"/>`;
const dot = ([x, y], color, [ox, oy]) => `<circle cx="${x + ox}" cy="${y + oy}" r="${H}" fill="${color}"/>`;

export const draw = (glyph, { seams, plain } = {}, at = [0, 0]) => [...glyph.pieces, ...glyph.joints]
  .map(s => [s, plain ? neutral : colors[s.k]])
  .map(([s, color]) => s.c ? halves(s.c).map(t => tri(t, color, seams, at)).join('') : dot(s.at, color, at))
  .join('');

export const ghost = every.map(([[x1, y1], [x2, y2]]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#888" stroke-opacity="0.3" stroke-width="0.03"/>`).join('');
export const svg = (box, body) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}">${body}</svg>`)}`;

export const glyphs = Object.entries(letters).map(([c, strokes]) => ({ c, ...shapes(segs(strokes)) }));
export const alphabet = options => svg('0 0 91 18', glyphs.map((g, i) => draw(g, options, [(i % 13) * 7 + 1, Math.floor(i / 13) * 9 + 1])).join(''));
export const overlapping = glyphs.filter(g => clash([...g.pieces, ...g.joints])).map(g => g.c);
