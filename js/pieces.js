export const H = 0.06;

export const kind = ([[x1, y1], [x2, y2]]) => x1 === x2 ? 'upright' : y1 === y2 ? 'flat' : Math.abs(x2 - x1) === Math.abs(y2 - y1) ? 'corner' : 'diagonal';

const rect = ([[x1, y1], [x2, y2]]) => {
  const L = Math.hypot(x2 - x1, y2 - y1), [dx, dy] = [(x2 - x1) / L, (y2 - y1) / L];
  return [[x1 - dy * H, y1 + dx * H], [x2 - dy * H, y2 + dx * H], [x2 + dy * H, y2 - dx * H], [x1 + dy * H, y1 - dx * H]];
};

export const halves = c => [[c[0], c[1], c[2]], [c[0], c[2], c[3]]];

// Every piece runs from end to end, and a circle as wide as a piece is thick sits on each end, on top:
// where pieces meet it rounds the bend, on a loose end it finishes the stroke
export const shapes = ss => ({
  pieces: ss.map(s => ({ s, k: kind(s), ends: s.map(p => p + ''), c: rect(s) })),
  circles: Object.entries(Object.groupBy(ss.flat(), p => p + '')).map(([key, [at, ...more]]) => ({ k: 'circle', key, at, loose: !more.length }))
});

// Separating axes: every rectangle edge normal, and for a circle the line from its centre to the other shape's nearest point
const normals = c => c.map((a, i) => [a[1] - c[(i + 1) % 4][1], c[(i + 1) % 4][0] - a[0]]);
const toward = (at, pts) => pts.map(([x, y]) => [x - at[0], y - at[1]]).reduce((m, v) => Math.hypot(...v) < Math.hypot(...m) ? v : m);
const axes = (p, q) => [[p, q], [q, p]].flatMap(([s, o]) => s.c ? normals(s.c) : [toward(s.at, o.c ?? [o.at])]);
const span = (s, [ax, ay]) => {
  if (s.c) return [Math.min(...s.c.map(([x, y]) => x * ax + y * ay)), Math.max(...s.c.map(([x, y]) => x * ax + y * ay))];
  const [m, r] = [s.at[0] * ax + s.at[1] * ay, H * Math.hypot(ax, ay)];
  return [m - r, m + r];
};
export const apart = (p, q) => axes(p, q).some(ax => {
  const [a, b] = [span(p, ax), span(q, ax)];
  return a[1] <= b[0] + 1e-9 || b[1] <= a[0] + 1e-9;
});

// Pieces overlap where they share an end, and a piece runs under the circles on its own ends; every other pair stays apart
const meet = (p, q) => p.key ? q.ends?.includes(p.key) : q.key ? p.ends.includes(q.key) : p.ends.some(e => q.ends.includes(e));
export const clash = ps => ps.some((p, i) => ps.slice(i + 1).some(q => !meet(p, q) && !apart(p, q)));
