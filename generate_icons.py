#!/usr/bin/env python3
"""Generate simple PNG icons for the Chrome extension (no dependencies)."""
import struct
import zlib

def create_png(width, height, rgba_data):
    """Create a PNG file from raw RGBA data."""
    def chunk(chunk_type, data):
        c = chunk_type + data
        crc = struct.pack('>I', zlib.crc32(c) & 0xffffffff)
        return struct.pack('>I', len(data)) + c + crc

    # PNG signature
    sig = b'\x89PNG\r\n\x1a\n'
    # IHDR
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    # IDAT
    raw = b''
    for y in range(height):
        raw += b'\x00'  # filter byte
        raw += rgba_data[y * width * 4:(y + 1) * width * 4]
    idat = chunk(b'IDAT', zlib.compress(raw))
    # IEND
    iend = chunk(b'IEND', b'')
    return sig + ihdr + idat + iend

def draw_repeat_icon(size):
    """Draw a repeat/loop icon."""
    pixels = bytearray(size * size * 4)
    cx, cy = size / 2, size / 2
    r_outer = size * 0.40
    r_inner = size * 0.28
    thickness = r_outer - r_inner

    for y in range(size):
        for x in range(size):
            idx = (y * size + x) * 4
            dx = x - cx
            dy = y - cy
            dist = (dx * dx + dy * dy) ** 0.5

            # Background circle
            bg_r = size * 0.46
            bg_dist = dist
            if bg_dist <= bg_r:
                # Blue background circle
                alpha = 1.0
                if bg_dist > bg_r - 1.2:
                    alpha = max(0, bg_r - bg_dist) / 1.2
                pixels[idx] = 66     # R
                pixels[idx+1] = 133  # G
                pixels[idx+2] = 244  # B
                pixels[idx+3] = int(alpha * 255)

            # Draw arrows (repeat icon)
            # Top arc (right half)
            if r_inner <= dist <= r_outer:
                import math
                angle = math.atan2(dy, dx)
                # Top arc: from -150° to 0°
                if -2.6 < angle < 0.0:
                    alpha = 1.0
                    edge_dist = min(dist - r_inner, r_outer - dist)
                    if edge_dist < 1.0:
                        alpha = edge_dist
                    pixels[idx] = 255
                    pixels[idx+1] = 255
                    pixels[idx+2] = 255
                    pixels[idx+3] = int(alpha * 255)
                # Bottom arc: from 30° to 180°
                if 0.5 < angle < 3.14:
                    alpha = 1.0
                    edge_dist = min(dist - r_inner, r_outer - dist)
                    if edge_dist < 1.0:
                        alpha = edge_dist
                    pixels[idx] = 255
                    pixels[idx+1] = 255
                    pixels[idx+2] = 255
                    pixels[idx+3] = int(alpha * 255)

            # Arrow heads
            arrow_size = thickness * 1.1
            # Right arrow (at end of top arc)
            ax1, ay1 = cx + r_outer * 0.97, cy
            adx, ady = x - ax1, y - ay1
            if abs(adx) < arrow_size and abs(ady) < arrow_size:
                # Triangle pointing right-down
                if ady > -arrow_size and ady < arrow_size and adx > -arrow_size * 0.5:
                    if ady < adx + arrow_size * 0.3 and ady > -adx - arrow_size * 0.3:
                        pixels[idx] = 255
                        pixels[idx+1] = 255
                        pixels[idx+2] = 255
                        pixels[idx+3] = 255

            # Left arrow (at end of bottom arc)
            ax2, ay2 = cx - r_outer * 0.97, cy
            adx2, ady2 = x - ax2, y - ay2
            if abs(adx2) < arrow_size and abs(ady2) < arrow_size:
                if ady2 > -arrow_size and ady2 < arrow_size and adx2 < arrow_size * 0.5:
                    if ady2 < -adx2 + arrow_size * 0.3 and ady2 > adx2 - arrow_size * 0.3:
                        pixels[idx] = 255
                        pixels[idx+1] = 255
                        pixels[idx+2] = 255
                        pixels[idx+3] = 255

    return bytes(pixels)

for size in [16, 48, 128]:
    pixels = draw_repeat_icon(size)
    png = create_png(size, size, pixels)
    path = f'icons/icon{size}.png'
    with open(path, 'wb') as f:
        f.write(png)
    print(f'Created {path} ({len(png)} bytes)')
