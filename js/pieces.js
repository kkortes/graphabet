export const [H, GAP] = [0.06, 0.21];

export const kind = ([[x1, y1], [x2, y2]]) => x1 === x2 ? 'upright' : y1 === y2 ? 'flat' : Math.abs(x2 - x1) === Math.abs(y2 - y1) ? 'corner' : 'diagonal';

const rect = ([[x1, y1], [x2, y2]]) => {
  const L = Math.hypot(x2 - x1, y2 - y1), [dx, dy] = [(x2 - x1) / L, (y2 - y1) / L];
  const [a, b] = [[x1 + dx * GAP, y1 + dy * GAP], [x2 - dx * GAP, y2 - dy * GAP]];
  return [[a[0] - dy * H, a[1] + dx * H], [b[0] - dy * H, b[1] + dx * H], [b[0] + dy * H, b[1] - dx * H], [a[0] + dy * H, a[1] - dx * H]];
};

export const halves = c => [[c[0], c[1], c[2]], [c[0], c[2], c[3]]];
export const piece = s => ({ s, k: kind(s), c: rect(s) });

// A joint is a grid point two or more pieces end on; its circle is as wide as a rectangle is thick
export const joints = ss => Object.values(Object.groupBy(ss.flat(), p => p + '')).filter(ps => ps.length > 1).map(([at]) => ({ k: 'joint', at }));

export const shapes = ss => ({ pieces: ss.map(piece), joints: joints(ss) });

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
export const clash = ps => ps.some((p, i) => ps.slice(i + 1).some(q => !apart(p, q)));
