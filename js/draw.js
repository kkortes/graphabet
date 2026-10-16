import { every, letters, segs } from '/js/letters.js';
import { H, halves, shapes, clash } from '/js/pieces.js';

export const colors = { upright: '#7fd18b', flat: '#6aa9ff', corner: '#ff9f5a', diagonal: '#e07bd0', circle: '#f2d36b' };

const tri = (t, color, seams, [ox, oy]) => `<polygon points="${t.map(([x, y]) => `${(x + ox).toFixed(3)},${(y + oy).toFixed(3)}`).join(' ')}" fill="${color}" stroke="${seams ? '#111' : color}" stroke-width="${seams ? 0.012 : 0.004}" stroke-linejoin="round"/>`;
const dot = ([x, y], color, [ox, oy]) => `<circle cx="${x + ox}" cy="${y + oy}" r="${H}" fill="${color}"/>`;

export const draw = (glyph, { seams, paint } = {}, at = [0, 0]) => [...glyph.pieces, ...glyph.circles]
  .map(s => [s, paint || colors[s.k]])
  .map(([s, color]) => s.c ? halves(s.c).map(t => tri(t, color, seams, at)).join('') : dot(s.at, color, at))
  .join('');

export const ghost = every.map(([[x1, y1], [x2, y2]]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#888" stroke-opacity="0.3" stroke-width="0.03"/>`).join('');
export const svg = (box, body) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}">${body}</svg>`)}`;
// The same image twice, in the piece colours and all white, so the global toggle only picks one
export const looks = (box, body, seams) => ({ colored: svg(box, body({ seams })), white: svg(box, body({ seams, paint: '#fff' })) });

export const glyphs = Object.entries(letters).map(([c, strokes]) => ({ c, ...shapes(segs(strokes)) }));
export const alphabet = looks('0 0 91 18', look => glyphs.map((g, i) => draw(g, look, [(i % 13) * 7 + 1, Math.floor(i / 13) * 9 + 1])).join(''));

// The building blocks at the scale the letters use: one unit-long flat piece, its first triangle and an end circle
const unit = shapes([[[0, 0], [1, 0]]]);
const near = '-0.1 -0.16 1.2 0.32';
export const blocks = [
  { name: 'Triangle', note: 'The one shape', image: looks(near, look => tri(halves(unit.pieces[0].c)[0], look.paint || colors.flat, look.seams, [0, 0]), true) },
  { name: 'Rectangle', note: 'Two triangles', image: looks(near, look => draw({ pieces: unit.pieces, circles: [] }, look), true) },
  { name: 'Circle', note: 'On every end', image: looks(near, look => draw({ pieces: [], circles: [{ k: 'circle', at: [0.5, 0] }] }, look)) },
  { name: 'Piece', note: 'Turned, in A', image: looks('-0.5 -0.5 6 7', look => draw(glyphs[0], look)) }
];

export const overlapping = glyphs.filter(g => clash([...g.pieces, ...g.circles])).map(g => g.c);
