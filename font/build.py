# /// script
# requires-python = ">=3.9"
# dependencies = ["fonttools[woff]>=4.60", "skia-pathops>=0.8"]
# ///
"""Builds font/Graphabet.ttf and font/Graphabet.woff2 from the A–Z the site draws: `uv run font/build.py`.

The letters come straight from js/letters.js and js/pieces.js (read through bun), so the font never drifts
from the page: each glyph is its rectangles and end circles merged into one clean outline per stroke run.
"""
import json, math, subprocess
from pathlib import Path

import pathops
from fontTools.fontBuilder import FontBuilder
from fontTools.misc.timeTools import timestampFromString
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import woff2
from fontTools.ttLib.tables._g_l_y_f import Glyph, dropImpliedOnCurvePoints

root = Path(__file__).resolve().parent
read = """
import { letters, segs } from './js/letters.js';
import { H, shapes } from './js/pieces.js';
console.log(JSON.stringify({ H, glyphs: Object.fromEntries(Object.entries(letters).map(([c, s]) => [c, shapes(segs(s))])) }));
"""
data = json.loads(subprocess.run(['bun', '-e', read], cwd=root.parent, capture_output=True, text=True, check=True).stdout)

# One grid step is 250 units: the letters' 4 × 6 box is 1000 × 1500, and the line is the alphabet sheet's 9-step row
# pitch with the cap height centred in it
upm, step, rows = 2048, 250, 9
r = data['H'] * step
ascent, descent = round((rows + 6) / 2 * step), -round((rows - 6) / 2 * step)
# Every letter keeps one step of air either side of its outermost stroke centres; Q's tail counts for half its width
bearing, tail = 1, 0.5
space = 2 * step

# A circle as eight quadratic arcs, on-curve points on the circle; the side ones touch the upright and flat pieces' edges
arc = math.pi / 4
def circle(cx, cy):
    p = pathops.Path()
    p.moveTo(cx + r, cy)
    for i in range(8):
        a, b = i * arc, (i + 1) * arc
        c = r / math.cos(arc / 2)
        p.quadTo(cx + c * math.cos(a + arc / 2), cy + c * math.sin(a + arc / 2), cx + r * math.cos(b), cy + r * math.sin(b))
    p.close()
    return p

def polygon(points):
    p = pathops.Path()
    p.moveTo(*points[0])
    for x, y in points[1:]: p.lineTo(x, y)
    p.close()
    return p

def union(paths):
    out = pathops.Path()
    for p in paths:
        p.simplify(fix_winding=True)
        out = pathops.op(out, p, pathops.PathOp.UNION, fix_winding=True)
    out.simplify(fix_winding=True, keep_starting_points=False, clockwise=True)
    return out

pt = lambda p: tuple(map(round, p))
mid = lambda a, b: ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)

# pathops joins a run of quadratic arcs into one qCurveTo with the on-curve points between them implied
def contours(path):
    out, current = [], []
    for verb, pts in path.segments:
        if verb == 'moveTo': current = [('L', pt(pts[0]))]
        elif verb == 'lineTo': current.append(('L', pt(pts[0])))
        elif verb == 'qCurveTo': current += [('Q', pt(c), pt(pts[i + 1] if i == len(pts) - 2 else mid(c, pts[i + 1]))) for i, c in enumerate(pts[:-1])]
        elif verb in ('closePath', 'endPath'): out.append(current)
    return sorted(start(clean(c)) for c in out)

# Each contour starts at its leftmost, then lowest point, so the same outline always reads back the same
def start(segs):
    i = min(range(len(segs)), key=lambda i: segs[i - 1][-1])
    return segs[i:] + segs[:i]

off = lambda p, a, b: abs((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) / (math.dist(a, b) or 1)

# Rounded to whole units, then tidied until nothing changes: no repeated points, no curve that is really a line,
# no point in the middle of a straight edge
def clean(segs):
    segs = [s for i, s in enumerate(segs) if s[-1] != segs[i - 1][-1]]
    while True:
        n = len(segs)
        ends = lambda i: (segs[i - 1][-1], segs[i][-1])
        segs = [('L', s[2]) if s[0] == 'Q' and off(s[1], *ends(i)) < 0.5 else s for i, s in enumerate(segs)]
        for i in range(len(segs)):
            a, b, c = segs[i - 2][-1], segs[i - 1], segs[i]
            if b[0] == c[0] == 'L' and off(b[1], a, c[1]) < 0.75:
                segs = segs[:i - 1] + segs[i:] if i else segs[:-1]
                break
        segs = [s for i, s in enumerate(segs) if s[-1] != segs[i - 1][-1]]
        if len(segs) == n: return segs

def rebuild(cs):
    p = pathops.Path()
    for c in cs:
        p.moveTo(*c[-1][-1])
        for s in c: p.lineTo(*s[1]) if s[0] == 'L' else p.quadTo(*s[1], *s[2])
        p.close()
    return p

def outline(shape):
    xs = [x for piece in shape['pieces'] for x, _ in piece['s']]
    left = min(xs)
    right = max(xs) - tail if any(x > 4 for x in xs) else max(xs)
    place = lambda x, y: ((x - left + bearing) * step, (6 - y) * step)
    paths = [polygon([place(*pt) for pt in piece['c']]) for piece in shape['pieces']]
    paths += [circle(*place(*c['at'])) for c in shape['circles']]
    cs = contours(union(paths))
    # Rounding can nudge an edge across another; merge again until the whole-unit outline is its own union
    while True:
        again = contours(union([rebuild(cs)]))
        if again == cs: break
        cs = again
    return cs, round((right - left + 2 * bearing) * step)

def glyph(cs):
    pen = TTGlyphPen(None)
    for c in cs:
        pen.moveTo(c[-1][-1])
        for s in c: pen.lineTo(s[1]) if s[0] == 'L' else pen.qCurveTo(s[1], s[2])
        pen.closePath()
    g = pen.glyph()
    dropImpliedOnCurvePoints(g)
    return g

letters = {c: outline(shape) for c, shape in data['glyphs'].items()}
order = ['.notdef', 'space', *letters]
glyphs = {'.notdef': Glyph(), 'space': Glyph(), **{c: glyph(cs) for c, (cs, _) in letters.items()}}
widths = {'.notdef': space, 'space': space, **{c: w for c, (_, w) in letters.items()}}

fb = FontBuilder(upm, isTTF=True)
fb.setupGlyphOrder(order)
fb.setupCharacterMap({32: 'space', **{ord(c): c for c in letters}})
fb.setupGlyf(glyphs)
glyf = fb.font['glyf']
fb.setupHorizontalMetrics({n: (widths[n], getattr(glyf[n], 'xMin', 0)) for n in order})
fb.setupHorizontalHeader(ascent=ascent, descent=descent)
fb.setupNameTable({'familyName': 'Graphabet', 'styleName': 'Regular', 'uniqueFontIdentifier': 'Graphabet', 'fullName': 'Graphabet', 'psName': 'Graphabet'}, mac=False)
fb.setupOS2(
    version=4, achVendID='NONE', fsType=0, usWeightClass=400, fsSelection=0xC0,
    sTypoAscender=ascent, sTypoDescender=descent, sTypoLineGap=0, usWinAscent=ascent, usWinDescent=-descent,
    sxHeight=6 * step, sCapHeight=6 * step, ulUnicodeRange1=1, ulCodePageRange1=1,
)
fb.setupPost(keepGlyphNames=False, underlinePosition=-step, underlineThickness=round(2 * r))
font = fb.font
font['cmap'].tables = [t for t in font['cmap'].tables if (t.platformID, t.platEncID) == (3, 1)]
font['head'].created = font['head'].modified = timestampFromString('Fri Oct 16 00:00:00 2026')
font['head'].fontRevision = 1.0
font.recalcTimestamp = False

# The TTF is the one an OS installs (Font Book and ~/Library/Fonts pass over WOFF2); the WOFF2 is the web's
ttf = root / 'Graphabet.ttf'
font.save(ttf)
woff2.compress(str(ttf), str(root / 'Graphabet.woff2'), transform_tables={'glyf', 'loca', 'hmtx'})
