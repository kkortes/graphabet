import { allowed, known, segKey, segs, sig } from '/js/letters.js';
import { shapes, clash } from '/js/pieces.js';

export const slots = {
  left: ['Stem', 'Round', 'Upper', 'Lower'],
  right: ['Stem', 'Round', 'Bowl', 'Upper', 'Lower', 'None'],
  top: ['Bar', 'None'],
  middle: ['Bar', 'Half', 'High', 'Low', 'None'],
  bottom: ['Bar', 'None'],
  mark: ['None', 'Leg', 'Tail', 'Peak', 'Vee', 'Cross', 'Arm', 'Spine', 'Offset']
};
const sides = {
  left: { Stem: [[0, 0], [0, 6]], Round: [[1, 0], [0, 1], [0, 5], [1, 6]], Upper: [[0, 0], [0, 3]], Lower: [[0, 3], [0, 6]] },
  right: { Stem: [[4, 0], [4, 6]], Round: [[3, 0], [4, 1], [4, 5], [3, 6]], Bowl: [[3, 0], [4, 1], [4, 2], [3, 3]], Upper: [[4, 0], [4, 3]], Lower: [[4, 3], [4, 6]] }
};
const marks = { Leg: [[2, 3], [4, 6]], Tail: [[4, 5], [5, 6]], Peak: [[0, 3], [2, 0], [4, 3]], Vee: [[0, 3], [2, 6], [4, 3]], Cross: [[0, 0], [4, 6]], Arm: [[4, 0], [2, 3]], Spine: [[2, 0], [2, 6]], Offset: [[1, 0], [1, 6]] };

export const capital = s => s[0].toUpperCase() + s.slice(1);

export const grammar = [
  '## Part rules',
  `Glyph → ${Object.keys(slots).map(capital).join(' ')}`,
  ...Object.entries(slots).map(([s, o]) => `${capital(s)} → ${o.join(' | ')}`),
  '',
  '## Joint rules',
  '- Round left + Bar → Bar starts one step in',
  '- Round or Bowl right + Bar → Bar stops one step short',
  '- Peak + top Bar → Peak alone',
  '- Vee + bottom Bar → Vee alone',
  '',
  '## Circle rules',
  '- Pieces meet → a circle covers the joint',
  '- Loose end → a circle finishes it',
  '- Every piece runs into the circles at its ends',
  '',
  '## Rejection rules',
  '- Piece not on an A–Z location → redraw',
  '- Glyph falls apart → redraw',
  '- Pieces that share no end overlap, or a circle covers a piece that doesn\'t end at it → redraw'
].join('\n');

const rng = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
const choose = r => Object.fromEntries(Object.entries(slots).map(([s, o]) => [s, o[Math.floor(r() * o.length)]]));

const build = c => {
  const fired = [];
  const top = c.mark === 'Peak' ? 'None' : c.top;
  const bottom = c.mark === 'Vee' ? 'None' : c.bottom;
  const l0 = c.left === 'Round' ? 1 : 0;
  const rTop = ['Round', 'Bowl'].includes(c.right) ? 3 : 4;
  const rMid = c.right === 'Bowl' ? 3 : 4;
  const rBot = c.right === 'Round' ? 3 : 4;
  if (c.mark === 'Peak' && c.top === 'Bar') fired.push('Peak + top Bar → Peak alone');
  if (c.mark === 'Vee' && c.bottom === 'Bar') fired.push('Vee + bottom Bar → Vee alone');
  if (l0 && (top === 'Bar' || bottom === 'Bar')) fired.push('Round left + Bar → Bar starts one step in');
  if ((rTop === 3 && top === 'Bar') || (rBot === 3 && bottom === 'Bar') || (rMid === 3 && c.middle === 'Bar')) fired.push(`${c.right} right + Bar → Bar stops one step short`);
  const strokes = [
    sides.left[c.left], sides.right[c.right],
    top === 'Bar' && [[l0, 0], [rTop, 0]],
    { Bar: [[0, 3], [rMid, 3]], Half: [[0, 3], [2, 3]], High: [[0, 2], [4, 2]], Low: [[0, 4], [4, 4]] }[c.middle],
    bottom === 'Bar' && [[l0, 6], [rBot, 6]],
    marks[c.mark]
  ].filter(Boolean);
  return { c, fired, segs: segs(strokes) };
};

const connected = ss => {
  const parent = {};
  const find = k => parent[k] === k ? k : (parent[k] = find(parent[k]));
  const join = (a, b) => { parent[a] ??= a; parent[b] ??= b; parent[find(a)] = find(b); };
  ss.forEach(([a, b]) => { const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] + ''; join(a + '', m); join(m, b + ''); });
  return new Set(Object.keys(parent).map(find)).size === 1;
};

export const generate = seed => {
  const r = rng(seed);
  const tally = { off: 0, apart: 0, overlap: 0 };
  const glyphs = Array.from({ length: 8 }, () => {
    for (;;) {
      const g = build(choose(r));
      if (!g.segs.every(s => allowed.has(segKey(s)))) { tally.off++; continue; }
      if (!connected(g.segs)) { tally.apart++; continue; }
      const parts = shapes(g.segs);
      if (clash([...parts.pieces, ...parts.circles])) { tally.overlap++; continue; }
      return { ...g, ...parts, match: known[sig(g.segs)] };
    }
  });
  return { glyphs, tally };
};
