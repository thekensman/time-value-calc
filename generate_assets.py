#!/usr/bin/env python3
"""Generate favicon PNGs and OG image for What Is My Time Worth.
Uses bytearray buffers for speed — no third-party dependencies."""
import struct, zlib, math, os

OUT = os.path.join(os.path.dirname(__file__), "frontend", "public")

# ─── PNG writer ──────────────────────────────────────────────────────────────

def png_from_buf(w, h, buf):
    """Encode a flat bytearray of RGBRGB... as a PNG."""
    def chunk(tag, data):
        c = tag + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
    rows = bytearray()
    row = w * 3
    for y in range(h):
        rows.append(0)          # filter: None
        rows.extend(buf[y*row:(y+1)*row])
    idat = chunk(b'IDAT', zlib.compress(bytes(rows), 6))
    iend = chunk(b'IEND', b'')
    return sig + ihdr + idat + iend

def new_buf(w, h, rgb):
    """Create a flat bytearray filled with rgb = (r,g,b)."""
    return bytearray(bytes(rgb) * (w * h))

def set_px(buf, w, x, y, rgb):
    if 0 <= x < w:
        i = (y * w + x) * 3
        buf[i], buf[i+1], buf[i+2] = rgb

def blend_px(buf, w, x, y, rgb, alpha):
    if 0 <= x < w:
        i = (y * w + x) * 3
        buf[i]   = int(buf[i]   * (1-alpha) + rgb[0] * alpha)
        buf[i+1] = int(buf[i+1] * (1-alpha) + rgb[1] * alpha)
        buf[i+2] = int(buf[i+2] * (1-alpha) + rgb[2] * alpha)

def fill_row(buf, w, y, x0, x1, rgb):
    """Fill a horizontal span in one row."""
    x0 = max(0, x0); x1 = min(w - 1, x1)
    r, g, b = rgb
    base = y * w * 3
    for x in range(x0, x1 + 1):
        i = base + x * 3
        buf[i], buf[i+1], buf[i+2] = r, g, b

# ─── Colours ─────────────────────────────────────────────────────────────────

BLACK    = (0, 0, 0)
DARK_BG  = (11, 13, 18)
GOLD     = (212, 164, 78)
GOLD_DIM = (150, 112, 50)
SAND     = (240, 210, 140)

# ─── Hourglass ───────────────────────────────────────────────────────────────

def draw_hourglass(w, h, buf, bg, fg, sand=None,
                   ox=0, oy=0, iw=None, ih=None):
    """
    Render an hourglass shape into `buf` (width=w, height=h).
    ox/oy = top-left offset of the drawing area inside buf.
    iw/ih = icon width/height (defaults to entire buffer).
    """
    iw = iw or w
    ih = ih or h
    pad = max(1, iw * 0.07)
    cap = max(2, round(ih * 0.11))
    xl  = pad
    xr  = iw - pad
    yt  = ih * 0.04
    yb  = ih - ih * 0.04
    cx  = iw / 2.0
    cy  = ih / 2.0

    for ly in range(ih):
        fy = ly + 0.5
        # top cap
        if yt <= fy <= yt + cap:
            x0, x1 = int(xl), int(xr)
        # bottom cap
        elif yb - cap <= fy <= yb:
            x0, x1 = int(xl), int(xr)
        # upper triangle: from cap bottom to centre
        elif yt + cap < fy <= cy:
            t  = (fy - (yt + cap)) / (cy - (yt + cap))
            x0 = int(xl + t * (cx - xl))
            x1 = int(xr - t * (xr - cx))
        # lower triangle: from centre to cap top
        elif cy < fy < yb - cap:
            t  = (fy - cy) / (yb - cap - cy)
            x0 = int(cx - t * (cx - xl))
            x1 = int(cx + t * (xr - cx))
        else:
            continue

        gy = oy + ly
        if not (0 <= gy < h):
            continue
        fill_row(buf, w, gy, ox + x0, ox + x1, fg)

        # draw sand fill (inner lighter region) for larger sizes
        if sand and iw >= 32:
            sp = iw * 0.09
            scx, scy = iw / 2.0, ih / 2.0
            syt, syb = yt + cap + sp, yb - cap - sp

            if syt < fy <= scy:
                t  = (fy - syt) / (scy - syt)
                sx0 = int(xl + sp + t * (scx - xl - sp))
                sx1 = int(xr - sp - t * (xr - scx - sp))
                if sx0 <= sx1:
                    fill_row(buf, w, gy, ox + sx0, ox + sx1, sand)
            elif scy < fy < syb:
                t  = (fy - scy) / (syb - scy)
                sx0 = int(scx - t * (scx - xl - sp))
                sx1 = int(scx + t * (xr - scx - sp))
                if sx0 <= sx1:
                    fill_row(buf, w, gy, ox + sx0, ox + sx1, sand)

# ─── Bitmap font (5×8) ───────────────────────────────────────────────────────

FONT = {
    'A':[0b01110,0b10001,0b10001,0b11111,0b10001,0b10001,0b10001,0],
    'B':[0b11110,0b10001,0b10001,0b11110,0b10001,0b10001,0b11110,0],
    'C':[0b01110,0b10001,0b10000,0b10000,0b10000,0b10001,0b01110,0],
    'D':[0b11110,0b10001,0b10001,0b10001,0b10001,0b10001,0b11110,0],
    'E':[0b11111,0b10000,0b10000,0b11110,0b10000,0b10000,0b11111,0],
    'F':[0b11111,0b10000,0b10000,0b11110,0b10000,0b10000,0b10000,0],
    'G':[0b01110,0b10001,0b10000,0b10111,0b10001,0b10001,0b01111,0],
    'H':[0b10001,0b10001,0b10001,0b11111,0b10001,0b10001,0b10001,0],
    'I':[0b11111,0b00100,0b00100,0b00100,0b00100,0b00100,0b11111,0],
    'J':[0b00111,0b00010,0b00010,0b00010,0b10010,0b10010,0b01100,0],
    'K':[0b10001,0b10010,0b10100,0b11000,0b10100,0b10010,0b10001,0],
    'L':[0b10000,0b10000,0b10000,0b10000,0b10000,0b10000,0b11111,0],
    'M':[0b10001,0b11011,0b10101,0b10101,0b10001,0b10001,0b10001,0],
    'N':[0b10001,0b11001,0b10101,0b10011,0b10001,0b10001,0b10001,0],
    'O':[0b01110,0b10001,0b10001,0b10001,0b10001,0b10001,0b01110,0],
    'P':[0b11110,0b10001,0b10001,0b11110,0b10000,0b10000,0b10000,0],
    'Q':[0b01110,0b10001,0b10001,0b10001,0b10101,0b10010,0b01101,0],
    'R':[0b11110,0b10001,0b10001,0b11110,0b10100,0b10010,0b10001,0],
    'S':[0b01110,0b10001,0b10000,0b01110,0b00001,0b10001,0b01110,0],
    'T':[0b11111,0b00100,0b00100,0b00100,0b00100,0b00100,0b00100,0],
    'U':[0b10001,0b10001,0b10001,0b10001,0b10001,0b10001,0b01110,0],
    'V':[0b10001,0b10001,0b10001,0b10001,0b01010,0b01010,0b00100,0],
    'W':[0b10001,0b10001,0b10101,0b10101,0b10101,0b11011,0b10001,0],
    'X':[0b10001,0b01010,0b00100,0b00100,0b00100,0b01010,0b10001,0],
    'Y':[0b10001,0b10001,0b01010,0b00100,0b00100,0b00100,0b00100,0],
    'Z':[0b11111,0b00001,0b00010,0b00100,0b01000,0b10000,0b11111,0],
    '.':[0b00000,0b00000,0b00000,0b00000,0b00000,0b01100,0b01100,0],
    '?':[0b01110,0b10001,0b00010,0b00100,0b00100,0b00000,0b00100,0],
    '-':[0b00000,0b00000,0b00000,0b11111,0b00000,0b00000,0b00000,0],
    ' ':[0]*8,
}

def draw_text(buf, w, h, text, x0, y0, scale, color):
    r, g, b = color
    cx = x0
    for ch in text.upper():
        glyph = FONT.get(ch, FONT[' '])
        for gy in range(8):
            row = glyph[gy]
            for gx in range(5):
                if row & (1 << (4 - gx)):
                    for sy in range(scale):
                        py = y0 + gy * scale + sy
                        if py >= h: continue
                        base = py * w * 3
                        for sx in range(scale):
                            px = cx + gx * scale + sx
                            if px >= w: continue
                            i = base + px * 3
                            buf[i], buf[i+1], buf[i+2] = r, g, b
        cx += 6 * scale

# ─── Favicon sizes ───────────────────────────────────────────────────────────

favicon_specs = [
    ("favicon-16.png",       16,  16,  BLACK, GOLD, None),
    ("favicon-32.png",       32,  32,  BLACK, GOLD, SAND),
    ("favicon-48.png",       48,  48,  BLACK, GOLD, SAND),
    ("apple-touch-icon.png", 180, 180, BLACK, GOLD, SAND),
    ("favicon-192.png",      192, 192, BLACK, GOLD, SAND),
]

for fname, sw, sh, bg, fg, sand in favicon_specs:
    buf = new_buf(sw, sh, bg)
    draw_hourglass(sw, sh, buf, bg, fg, sand)
    path = os.path.join(OUT, fname)
    with open(path, "wb") as f:
        f.write(png_from_buf(sw, sh, buf))
    print(f"  wrote {fname}  ({sw}×{sh})")

# ─── OG image (1200×630) ─────────────────────────────────────────────────────

W, H = 1200, 630
buf = new_buf(W, H, DARK_BG)

# Hourglass on the left
HG = 310
hg_x = 120
hg_y = (H - HG) // 2
draw_hourglass(W, H, buf, DARK_BG, GOLD, SAND, ox=hg_x, oy=hg_y, iw=HG, ih=HG)

# Vertical divider
rx = hg_x + HG + 55
for y in range(65, H - 65):
    blend_px(buf, W, rx, y, GOLD, 0.20)
    blend_px(buf, W, rx + 1, y, GOLD, 0.08)

# Text
tx = rx + 65
sc1 = 9;  y1 = 128
draw_text(buf, W, H, "WHAT IS MY", tx, y1, sc1, GOLD)
sc2 = 9;  y2 = y1 + 8*sc1 + 20
draw_text(buf, W, H, "TIME WORTH?", tx, y2, sc2, GOLD)

# Fading divider rule under title
dy = y2 + 8*sc2 + 22
for dx in range(420):
    a = max(0, 0.65 - dx / 420)
    blend_px(buf, W, tx + dx, dy, GOLD, a)
    if dy + 1 < H:
        blend_px(buf, W, tx + dx, dy + 1, GOLD, a * 0.35)

sc3 = 5;  y3 = dy + 20
draw_text(buf, W, H, "REAL HOURLY WAGE CALCULATOR", tx, y3, sc3, (130, 120, 100))

sc4 = 4;  y4 = y3 + 8*sc3 + 22
draw_text(buf, W, H, "WHATISMYTIMEWORTH.APP", tx, y4, sc4, (75, 70, 58))

og_path = os.path.join(OUT, "og-image.png")
with open(og_path, "wb") as f:
    f.write(png_from_buf(W, H, buf))
print(f"  wrote og-image.png  ({W}×{H})")

print("Done.")
