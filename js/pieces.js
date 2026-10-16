export const [H, GAP] = [0.06, 0.21];

export const kind = ([[x1, y1], [x2, y2]]) => x1 === x2 ? 'upright' : y1 === y2 ? 'flat' : Math.abs(x2 - x1) === Math.abs(y2 - y1) ? 'corner' : 'diagonal';

const away = (from, to) => { const L = Math.hypot(to[0] - from[0], to[1] - from[1]); return [(to[0] - from[0]) / L, (to[1] - from[1]) / L]; };

// How far a piece stops short of an end: a free end keeps GAP; at a joint it runs in until it would touch the
// widest-angled neighbour, H / tan(θ / 2) for the angle θ between them, so a straight run meets at the centre
const reach = (at, to, ends) => ends.length === 1 ? GAP : Math.max(...ends.filter(o => o + '' !== to + '').map(o => {
  const [u, v] = [away(at, to), away(at, o)];
  return H / Math.tan(Math.acos(Math.min(1, Math.max(-1, u[0] * v[0] + u[1] * v[1]))) / 2);
}));

const rect = ([[x1, y1], [x2, y2]], [ta, tb]) => {
  const L = Math.hypot(x2 - x1, y2 - y1), [dx, dy] = [(x2 - x1) / L, (y2 - y1) / L];
  const [a, b] = [[x1 + dx * ta, y1 + dy * ta], [x2 - dx * tb, y2 - dy * tb]];
  return [[a[0] - dy * H, a[1] + dx * H], [b[0] - dy * H, b[1] + dx * H], [b[0] + dy * H, b[1] - dx * H], [a[0] + dy * H, a[1] - dx * H]];
};

export const halves = c => [[c[0], c[1], c[2]], [c[0], c[2], c[3]]];

// A joint is a grid point two or more pieces end on; its circle is as wide as a rectangle is thick and sits on top
export const shapes = ss => {
  const ends = Object.groupBy(ss.flatMap(([a, b]) => [[a, b], [b, a]]), ([at]) => at + '');
  const others = at => ends[at + ''].map(([, o]) => o);
  return {
    pieces: ss.map(s => ({ s, k: kind(s), ends: s.map(p => p + ''), c: rect(s, [reach(s[0], s[1], others(s[0])), reach(s[1], s[0], others(s[1]))]) })),
    joints: Object.entries(ends).filter(([, e]) => e.length > 1).map(([key, [[at]]]) => ({ k: 'joint', key, at }))
  };
};

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

// A piece runs under the circle at its own ends; every other pair has to stay apart
const covers = (p, q) => [[p, q], [q, p]].some(([j, s]) => j.key && s.ends?.includes(j.key));
export const clash = ps => ps.some((p, i) => ps.slice(i + 1).some(q => !covers(p, q) && !apart(p, q)));
