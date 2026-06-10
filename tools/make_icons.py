#!/usr/bin/env python3
"""Generate PWA icons (dark square, gold eye, teal slit) without any deps."""
import struct, zlib, os, math


def png_bytes(width, height, rows):
    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c))

    raw = b"".join(b"\x00" + bytes(row) for row in rows)
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


BG = (11, 13, 16)
GOLD = (232, 181, 77)
TEAL = (89, 242, 196)


def blend(base, top, a):
    return tuple(int(b * (1 - a) + t * a) for b, t in zip(base, top))


def render(size):
    cx = cy = size / 2
    # eye lens = intersection of two circles whose centers sit above/below
    lens_r = size * 0.46
    off = size * 0.285
    ring_r = size * 0.40
    ring_w = size * 0.012
    iris_r = size * 0.118
    slit_rx, slit_ry = size * 0.030, size * 0.095

    rows = []
    for y in range(size):
        row = bytearray()
        for x in range(size):
            px, py = x + 0.5, y + 0.5
            c = BG
            # dashed-feel outer ring (solid here, subtle)
            d = math.hypot(px - cx, py - cy)
            if abs(d - ring_r) < ring_w:
                c = blend(c, GOLD, 0.55)
            # lens outline
            d1 = math.hypot(px - cx, py - (cy - off))
            d2 = math.hypot(px - cx, py - (cy + off))
            inside = d1 < lens_r and d2 < lens_r
            edge = inside and (d1 > lens_r - size * 0.018 or d2 > lens_r - size * 0.018)
            if inside:
                c = blend(c, (16, 24, 26), 0.6)
            if edge:
                c = GOLD
            # iris + slit
            if inside:
                di = math.hypot(px - cx, py - cy)
                if di < iris_r:
                    c = blend(c, TEAL, 0.22)
                if abs(di - iris_r) < size * 0.008:
                    c = TEAL
                if ((px - cx) / slit_rx) ** 2 + ((py - cy) / slit_ry) ** 2 < 1:
                    c = TEAL
            row += bytes((*c, 255))
        rows.append(row)
    return png_bytes(size, size, rows)


out = os.path.join(os.path.dirname(__file__), "..", "icons")
os.makedirs(out, exist_ok=True)
for s in (192, 512):
    path = os.path.join(out, f"icon-{s}.png")
    with open(path, "wb") as f:
        f.write(render(s))
    print("wrote", path)
