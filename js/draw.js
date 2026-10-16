import { every, letters, segs } from '/js/letters.js';
import { H, halves, kind, shapes, clash } from '/js/pieces.js';

export const colors = { upright: '#7fd18b', flat: '#6aa9ff', corner: '#ff9f5a', diagonal: '#e07bd0', circle: '#f2d36b' };

// Every piece carries its kind's CSS colour, so the page can fade it to white and back; the literal colour stays
// as the attribute for images that live outside the page, like the favicon. A painted piece keeps one colour and
// sits outside the switch. Only triangles take a stroke: a circle without a stroke width would draw a unit-wide ring
const piece = (k, seams, paint, stroked) => paint
  ? `style="fill: ${paint}${stroked && !seams ? `; stroke: ${paint}` : ''}"`
  : `class="piece${seams ? ' seam' : ''}" style="--k: var(--piece-${k})"`;
const tri = (t, k, seams, [ox, oy], paint) => `<polygon ${piece(k, seams, paint, true)} points="${t.map(([x, y]) => `${(x + ox).toFixed(3)},${(y + oy).toFixed(3)}`).join(' ')}" fill="${colors[k]}" stroke="${seams ? '#111' : colors[k]}" stroke-width="${seams ? 0.012 : 0.004}" stroke-linejoin="round"/>`;
const dot = ([x, y], [ox, oy], paint) => `<circle ${piece('circle', false, paint)} cx="${x + ox}" cy="${y + oy}" r="${H}" fill="${colors.circle}"/>`;

export const draw = (glyph, { seams, paint } = {}, at = [0, 0]) => [...glyph.pieces, ...glyph.circles]
  .map(s => s.c ? halves(s.c).map(t => tri(t, s.k, seams, at, paint)).join('') : dot(s.at, at, paint))
  .join('');

export const ghost = every.map(([[x1, y1], [x2, y2]]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#888" stroke-opacity="0.3" stroke-width="0.03"/>`).join('');
export const svg = (box, body) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}">${body}</svg>`)}`;
export const art = (box, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}">${body}</svg>`;

export const glyphs = Object.entries(letters).map(([c, strokes]) => ({ c, ...shapes(segs(strokes)) }));
// A–Z sits in two rows of 13, each letter's 4 × 6 box set three units apart
const [columns, rows] = [13, 2];
// A letter's drawn bounds: its rectangles' corners and its circles' edges
const bounds = g => {
  const pts = [...g.pieces.flatMap(p => p.c), ...g.circles.flatMap(({ at: [x, y] }) => [[x - H, y - H], [x + H, y + H]])];
  const [xs, ys] = [pts.map(p => p[0]), pts.map(p => p[1])];
  return { x: [Math.min(...xs), Math.max(...xs)], y: [Math.min(...ys), Math.max(...ys)] };
};
// The rulers run the whole slide through both rows and every column, so they come from the box the letters are
// drawn in, the drawn bounds most letters share, stepped by the pitch. No single letter moves a
// line: I sits inside its column's lines and Q's tail crosses its column's right one
const cell = Object.values(Object.groupBy(glyphs.map(bounds), b => JSON.stringify(b, (k, v) => typeof v === 'number' ? +v.toFixed(6) : v))).sort((a, b) => b.length - a.length)[0][0];
// Inline, so the rulers can run past the sheet to the slide's edges in the letters' own coordinates
const rule = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#888" stroke-opacity="0.3" vector-effect="non-scaling-stroke"/>`;
const sheet = mirrored => {
  const pitch = [7, 9];
  const at = i => [(i % columns) * pitch[0] + 1, Math.floor(i / columns) * pitch[1] + 1];
  const xs = Array.from({ length: columns }, (_, c) => at(c)[0]).flatMap(ox => cell.x.map(x => x + ox));
  const ys = Array.from({ length: rows }, (_, r) => at(r * columns)[1]).flatMap(oy => cell.y.map(y => y + oy));
  // Mirrored, the letter is stacked in its own cell: its copy flipped across the box's vertical centre (x → 4 − x)
  // goes on top, then the pair flipped across the horizontal centre (y → 6 − y)
  const figure = (g, [ox, oy]) => mirrored ? [[1, 1], [-1, 1], [1, -1], [-1, -1]]
    .map(([sx, sy]) => `<g transform="translate(${sx < 0 ? ox + 4 : ox} ${sy < 0 ? oy + 6 : oy}) scale(${sx} ${sy})">${draw(g)}</g>`).join('') : draw(g, {}, [ox, oy]);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${columns * pitch[0]} ${rows * pitch[1]}" overflow="visible">${[
    ...xs.map(x => rule(x, -1000, x, 1000)),
    ...ys.map(y => rule(-1000, y, 1000, y)),
    ...glyphs.map((g, i) => `<g figure>${figure(g, at(i))}</g>`)
  ].join('')}</svg>`;
};
// A word set in the letters, six units apart, the letters' four-unit box plus a gap of two
export const word = (text, paint) => art(`-0.2 -0.2 ${(text.length - 1) * 6 + 4.4} 6.4`, [...text].map((c, i) => draw(glyphs.find(g => g.c === c), { paint }, [i * 6, 0])).join(''));

export const alphabet = sheet(false);
export const symmetry = sheet(true);

// The building blocks at the scale the letters use: one unit-long flat piece, its first triangle and an end circle
const unit = shapes([[[0, 0], [1, 0]]]);
const near = '-0.1 -0.16 1.2 0.32';
// The flat piece is the base; every other kind A–Z uses is it turned: upright 90°, corner 45°, diagonal 2:3 (about 56°)
const turned = { upright: [[0, 0], [0, 1]], corner: [[0, 1], [1, 0]], diagonal: [[0, 3], [2, 0]] };
const used = new Set(every.map(kind));
const turns = Object.keys(turned).filter(k => used.has(k)).map(k => turned[k]);
// Each turn's angle from the flat base: atan of rise over run, to the whole degree (the 2:3 diagonal is 56.31°)
const angle = ([[x1, y1], [x2, y2]]) => `${Math.round(Math.atan2(Math.abs(y2 - y1), Math.abs(x2 - x1)) * 180 / Math.PI)}°`;
const list = items => items.length > 1 ? `${items.slice(0, -1).join(', ')} & ${items.at(-1)}` : items[0];
const bare = s => ({ pieces: shapes([s]).pieces, circles: [] });
const fit = s => {
  const c = bare(s).pieces[0].c, [xs, ys] = [c.map(p => p[0]), c.map(p => p[1])], pad = 0.1;
  return `${Math.min(...xs) - pad} ${Math.min(...ys) - pad} ${Math.max(...xs) - Math.min(...xs) + 2 * pad} ${Math.max(...ys) - Math.min(...ys) + 2 * pad}`;
};
export const blocks = [
  { name: 'Triangle', note: 'The one shape', gray: true, art: art(near, tri(halves(unit.pieces[0].c)[0], 'flat', true, [0, 0])) },
  { name: 'Rectangle', note: 'Two triangles', art: art(near, draw({ pieces: unit.pieces, circles: [] })) },
  { name: 'Circle', note: 'On every end', art: art(near, draw({ pieces: [], circles: [{ k: 'circle', at: [0.5, 0] }] })) },
  { name: `${turns.length} rotations`, note: list(turns.map(angle)), art: art(fit(turned.corner), draw(bare(turned.corner))) }
];

export const overlapping = glyphs.filter(g => clash([...g.pieces, ...g.circles])).map(g => g.c);
