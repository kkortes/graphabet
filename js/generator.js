import { allowed, known, segKey, segs, sig } from '/js/letters.js';
import { shapes, clash } from '/js/pieces.js';

export const slots = {
  left: ['Stem', 'Round', 'Upper', 'Lower'],
  right: ['Stem', 'Round', 'Bowl', 'Upper', 'Lower', 'None'],
  top: ['Bar', 'None'],
  middle: ['Bar', 'Half', 'None'],
  bottom: ['Bar', 'None'],
  mark: ['None', 'Leg', 'Tail', 'Peak', 'Vee', 'Cross', 'Arm', 'Spine', 'Offset']
};
const sides = {
  left: { Stem: [[0, 0], [0, 6]], Round: [[1, 0], [0, 1], [0, 5], [1, 6]], Upper: [[0, 0], [0, 3]], Lower: [[0, 3], [0, 6]] },
  right: { Stem: [[4, 0], [4, 6]], Round: [[3, 0], [4, 1], [4, 5], [3, 6]], Bowl: [[3, 0], [4, 1], [4, 2], [3, 3]], Upper: [[4, 0], [4, 3]], Lower: [[4, 3], [4, 6]] }
};
const marks = { Leg: [[2, 3], [4, 6]], Tail: [[4, 5], [5, 6]], Peak: [[0, 3], [2, 0], [4, 3]], Vee: [[0, 3], [2, 6], [4, 3]], Cross: [[0, 0], [4, 6]], Arm: [[4, 0], [2, 3]], Spine: [[2, 0], [2, 6]], Offset: [[1, 0], [1, 6]] };

export const capital = s => s[0].toUpperCase() + s.slice(1);

// Each joint rule once: its text for the panel and the derivation, and when it fires. The geometry it describes is in
// build: l0 moves the top and bottom bars' start, rTop / rMid / rBot their ends
const joints = [
  { rule: 'Round left + top or bottom Bar → that Bar starts one step in', fires: (c, top, bottom) => c.left === 'Round' && [top, bottom].includes('Bar') },
  { rule: 'Round right + top or bottom Bar → that Bar stops one step short', fires: (c, top, bottom) => c.right === 'Round' && [top, bottom].includes('Bar') },
  { rule: 'Bowl right + top or middle Bar → that Bar stops one step short', fires: (c, top) => c.right === 'Bowl' && [top, c.middle].includes('Bar') },
  { rule: 'Peak + top Bar → Peak alone', fires: c => c.mark === 'Peak' && c.top === 'Bar' },
  { rule: 'Vee + bottom Bar → Vee alone', fires: c => c.mark === 'Vee' && c.bottom === 'Bar' }
];

export const grammar = [
  '## Part rules',
  `Glyph → ${Object.keys(slots).map(capital).join(' ')}`,
  ...Object.entries(slots).map(([s, o]) => `${capital(s)} → ${o.join(' | ')}`),
  'Option that leaves the top or bottom untouched → not chosen',
  '',
  '## Joint rules',
  ...joints.map(j => `- ${j.rule}`),
  '',
  '## Circle rules',
  '- Pieces meet → a circle covers the joint',
  '- Loose end → a circle finishes it',
  '- Every piece runs into the circles at its ends',
  '',
  '## Rejection rules',
  '- Piece not on an A–Z location → redraw',
  '- Glyph falls apart → redraw',
  '- Pieces that share no end overlap, or a circle covers a piece that doesn\'t end at it → redraw',
  '- More than 3 loose ends, or more than 4 when two mirror across a centre line → redraw'
].join('\n');

// Two loose ends mirror each other across the letter box's vertical (x 2) or horizontal (y 3) centre line
const mirrored = ends => ends.some((p, i) => ends.slice(i + 1).some(q => (q[0] === 4 - p[0] && q[1] === p[1]) || (q[0] === p[0] && q[1] === 6 - p[1])));
const tooLoose = circles => {
  const ends = circles.filter(c => c.loose).map(c => c.at);
  return ends.length > (mirrored(ends) ? 4 : 3);
};

const rng = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
// Which edges of the box an option's strokes touch: the top (y 0) and the bottom (y 6)
const strokesOf = { ...sides, top: { Bar: [[0, 0], [4, 0]] }, bottom: { Bar: [[0, 6], [4, 6]] }, mark: marks };
const reach = (slot, option) => new Set((strokesOf[slot]?.[option] ?? []).flatMap(([, y]) => [y === 0 && 'top', y === 6 && 'bottom']).filter(Boolean));
// Slots are chosen in order, each keeping only the options that still let the letter touch the top and the
// bottom, given what is chosen so far and what the slots after it could still reach
const choose = r => Object.entries(slots).reduce((c, [s, o], i, all) => {
  const later = new Set(all.slice(i + 1).flatMap(([t, os]) => os.flatMap(x => [...reach(t, x)])));
  const sofar = Object.entries(c).flatMap(([t, x]) => [...reach(t, x)]);
  const open = o.filter(x => ['top', 'bottom'].every(e => sofar.includes(e) || reach(s, x).has(e) || later.has(e)));
  return { ...c, [s]: open[Math.floor(r() * open.length)] };
}, {});

const build = c => {
  const top = c.mark === 'Peak' ? 'None' : c.top;
  const bottom = c.mark === 'Vee' ? 'None' : c.bottom;
  const l0 = c.left === 'Round' ? 1 : 0;
  const rTop = ['Round', 'Bowl'].includes(c.right) ? 3 : 4;
  const rMid = c.right === 'Bowl' ? 3 : 4;
  const rBot = c.right === 'Round' ? 3 : 4;
  const fired = joints.filter(j => j.fires(c, top, bottom)).map(j => j.rule);
  const strokes = [
    sides.left[c.left], sides.right[c.right],
    top === 'Bar' && [[l0, 0], [rTop, 0]],
    { Bar: [[0, 3], [rMid, 3]], Half: [[0, 3], [2, 3]] }[c.middle],
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
  const tally = { off: 0, apart: 0, overlap: 0, loose: 0 };
  const glyphs = Array.from({ length: 8 }, () => {
    for (;;) {
      const g = build(choose(r));
      if (!g.segs.every(s => allowed.has(segKey(s)))) { tally.off++; continue; }
      if (!connected(g.segs)) { tally.apart++; continue; }
      const parts = shapes(g.segs);
      if (clash([...parts.pieces, ...parts.circles])) { tally.overlap++; continue; }
      if (tooLoose(parts.circles)) { tally.loose++; continue; }
      return { ...g, ...parts, match: known[sig(g.segs)] };
    }
  });
  return { glyphs, tally };
};
