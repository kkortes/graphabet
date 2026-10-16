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
// A–Z sits in two rows of 13, seven units apart across and nine down
const [columns, rows, pitch] = [13, 2, [7, 9]];
const at = i => [(i % columns) * pitch[0] + 1, Math.floor(i / columns) * pitch[1] + 1];
// A letter's drawn bounds: its rectangles' corners and its circles' edges, placed where the sheet puts it
const bounds = (g, [ox, oy]) => {
  const pts = [...g.pieces.flatMap(p => p.c), ...g.circles.flatMap(({ at: [x, y] }) => [[x - H, y - H], [x + H, y + H]])];
  const [xs, ys] = [pts.map(p => p[0] + ox), pts.map(p => p[1] + oy)];
  return { x: [Math.min(...xs), Math.max(...xs)], y: [Math.min(...ys), Math.max(...ys)] };
};
// The rulers run the whole slide through both rows and every column, so they come from the box the letters are
// drawn in, the drawn bounds most letters share, stepped by the column and row pitch. No single letter moves a
// line: I sits inside its column's lines and Q's tail crosses its column's right one
const cell = Object.values(Object.groupBy(glyphs.map(g => bounds(g, [0, 0])), b => JSON.stringify(b, (k, v) => typeof v === 'number' ? +v.toFixed(6) : v))).sort((a, b) => b.length - a.length)[0][0];
export const rulers = {
  x: Array.from({ length: columns }, (_, c) => at(c)[0]).flatMap(ox => cell.x.map(x => x + ox)),
  y: Array.from({ length: rows }, (_, r) => at(r * columns)[1]).flatMap(oy => cell.y.map(y => y + oy))
};
// Inline, so the rulers can run past the sheet to the slide's edges in the letters' own coordinates
const rule = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#888" stroke-opacity="0.3" vector-effect="non-scaling-stroke"/>`;
const rules = [...rulers.x.map(x => rule(x, -1000, x, 1000)), ...rulers.y.map(y => rule(-1000, y, 1000, y))].join('');
const sheet = look => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 91 18" overflow="visible">${[
  rules,
  ...glyphs.map((g, i) => `<g>${draw(g, look, at(i))}</g>`)
].join('')}</svg>`;
export const alphabet = { colored: sheet({}), white: sheet({ paint: '#fff' }) };

// The building blocks at the scale the letters use: one unit-long flat piece, its first triangle and an end circle
const unit = shapes([[[0, 0], [1, 0]]]);
const near = '-0.1 -0.16 1.2 0.32';
export const blocks = [
  { name: 'Triangle', note: 'The one shape', image: looks(near, look => tri(halves(unit.pieces[0].c)[0], look.paint || colors.flat, look.seams, [0, 0]), true) },
  { name: 'Rectangle', note: 'Two triangles', image: looks(near, look => draw({ pieces: unit.pieces, circles: [] }, look)) },
  { name: 'Circle', note: 'On every end', image: looks(near, look => draw({ pieces: [], circles: [{ k: 'circle', at: [0.5, 0] }] }, look)) },
  { name: 'Piece', note: 'Turned, in A', image: looks('-0.5 -0.5 6 7', look => draw(glyphs[0], look)) }
];

export const overlapping = glyphs.filter(g => clash([...g.pieces, ...g.circles])).map(g => g.c);
