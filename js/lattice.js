import { draw, flips, glyphs } from '/js/draw.js';
import { segKey } from '/js/letters.js';
import { shapes } from '/js/pieces.js';

// Every mirrored figure is a 4 × 6 tile and the lattice lays them edge to edge, so a tile's right edge is its
// right neighbour's left edge. Q's flipped tail leaves its box and would cut into a neighbour, so Q sits out
const [w, h] = [4, 6];
const flip = ([x, y], [sx, sy]) => [sx < 0 ? w - x : x, sy < 0 ? h - y : y];
const inside = ([x, y]) => x >= 0 && x <= w && y >= 0 && y <= h;
const tiles = glyphs
  .map(g => ({ g, segs: [...new Map(flips.flatMap(f => g.pieces.map(p => p.s.map(q => flip(q, f)))).map(s => [segKey(s), s])).values()] }))
  .filter(t => t.segs.flat().every(inside))
  // Drawn from its own strokes, every stroke the four copies share drawn once: the same pixels as stacking the
  // copies, at a third of the shapes
  .map(t => ({ ...t, art: draw(shapes(t.segs)) }));

// A side, read along its edge: every point a stroke touches, and the points where a stroke arrives from inside
// rather than running along the edge
const side = (segs, axis, v) => ({
  touch: new Set(segs.flat().filter(p => p[axis] === v).map(p => p[1 - axis])),
  arrive: new Set(segs.filter(s => (s[0][axis] === v) !== (s[1][axis] === v)).flat().filter(p => p[axis] === v).map(p => p[1 - axis]))
});
// A seam joins cleanly when every stroke arriving at it meets a stroke of the neighbour there: a stem lands on a
// stem or a bar, never on nothing
const joins = (a, b) => a.arrive.isSubsetOf(b.touch) && b.arrive.isSubsetOf(a.touch);
const sides = tiles.map(({ segs }) => ({ left: side(segs, 0, 0), right: side(segs, 0, w), top: side(segs, 1, 0), bottom: side(segs, 1, h) }));
const fits = (from, to) => sides.map(a => sides.flatMap((b, j) => joins(a[from], b[to]) ? [j] : []));
const rules = { right: fits('right', 'left'), left: fits('left', 'right'), down: fits('bottom', 'top'), up: fits('top', 'bottom') };

// Wave function collapse: every cell starts as any tile, the most decided cell collapses to one of its options at
// random and the seams rule the options out of its neighbours, cell to cell, until every cell holds one tile
const collapse = (cols, rows) => {
  const cells = Array.from({ length: cols * rows }, () => tiles.map((_, i) => i));
  const near = k => [
    [k % cols < cols - 1, k + 1, rules.right], [k % cols > 0, k - 1, rules.left],
    [k + cols < cells.length, k + cols, rules.down], [k >= cols, k - cols, rules.up]
  ].filter(([on]) => on);
  const settle = stack => {
    while (stack.length) {
      const k = stack.pop();
      for (const [, n, rule] of near(k)) {
        const ok = new Set(cells[k].flatMap(i => rule[i]));
        const kept = cells[n].filter(i => ok.has(i));
        if (!kept.length) return false;
        if (kept.length < cells[n].length) (cells[n] = kept, stack.push(n));
      }
    }
    return true;
  };
  for (;;) {
    const open = cells.map((o, k) => [o.length, k]).filter(([n]) => n > 1);
    if (!open.length) return cells.map(([i]) => i);
    const least = Math.min(...open.map(([n]) => n));
    const ks = open.filter(([n]) => n === least);
    const k = ks[Math.floor(Math.random() * ks.length)][1];
    cells[k] = [cells[k][Math.floor(Math.random() * cells[k].length)]];
    if (!settle([k])) return collapse(cols, rows);
  }
};

// The network: every grid point the placed tiles touch, joined by their unit strokes, shared seams counted once
export const lattice = (cols, rows) => {
  const cells = collapse(cols, rows).map((i, k) => ({ t: tiles[i], at: [(k % cols) * w, Math.floor(k / cols) * h] }));
  const links = new Map();
  cells.forEach((cell, k) => cell.t.segs.forEach(s => {
    const [a, b] = s.map(([x, y]) => [x + cell.at[0], y + cell.at[1]]);
    const key = segKey([a, b]);
    links.has(key) ? links.get(key).cells.push(k) : links.set(key, { a: a + '', b: b + '', ends: [a, b], len: Math.hypot(b[0] - a[0], b[1] - a[1]), cells: [k] });
  }));
  const graph = new Map();
  links.forEach(l => [[l.a, l.b], [l.b, l.a]].forEach(([p, q]) => graph.set(p, [...graph.get(p) ?? [], { to: q, l }])));
  return { cols, rows, cells, links: [...links.values()], graph };
};

// The figures drawn once and placed by reference
export const defs = cells => `<defs>${[...new Set(cells.map(c => c.t))].map(t => `<g id="figure-${t.g.c}">${t.art}</g>`).join('')}</defs>`;
export const place = (c, style = '') => `<use href="#figure-${c.t.g.c}" x="${c.at[0]}" y="${c.at[1]}"${style && ` style="${style}"`}/>`;
export const frame = (net, unit, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${net.cols * w * unit}" height="${net.rows * h * unit}" viewBox="0 0 ${net.cols * w} ${net.rows * h}">${body}</svg>`;
// The resting lattice is an image in its pieces' literal colours: as page nodes every <use> clone takes its own
// style pass, tens of thousands of them, where an image is painted once
export const image = (net, unit) => `data:image/svg+xml,${encodeURIComponent(frame(net, unit, defs(net.cells) + net.cells.map(c => place(c)).join('')))}`;

// Shortest path length along the strokes from the point nearest the click to every point within reach
export const reach = (net, [x, y], far) => {
  const start = [...net.graph.keys()].reduce((m, p) => {
    const [px, py] = p.split(',').map(Number), d = Math.hypot(px - x, py - y);
    return d < m.d ? { p, d } : m;
  }, { d: Infinity }).p;
  const dist = new Map([[start, 0]]), queue = [start];
  while (queue.length) {
    const p = queue.shift();
    net.graph.get(p).forEach(({ to, l }) => {
      const d = dist.get(p) + l.len;
      if (d <= far && d < (dist.get(to) ?? Infinity)) (dist.set(to, d), queue.push(to));
    });
  }
  return dist;
};

