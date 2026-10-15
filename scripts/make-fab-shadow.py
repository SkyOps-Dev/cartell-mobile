"""Draws the Material 3 FAB shadow under the Login / Registration back button as PNGs.

Flutter paints an elevation-6 shadow under the transparent FAB. Measured on the Flutter app
(RMX5070, 2026-10-13): the button's own 56 x 56 rounded square (radius 16), moved down 5.8 dp,
Gaussian blur sigma 3.67 dp, black at 0.24 (PARITY_ISSUES P7). The shadow never changes, so it is
drawn once here, exactly, at each screen density, and shown as an image on every platform.

The image covers the shape plus 3 sigma on every side; the offset is applied where it is shown.
Run: python -I scripts/make-fab-shadow.py   (writes assets/images/fab_shadow{,@2x,@3x}.png)
"""
import math
import os

import numpy as np
from PIL import Image, ImageDraw

SIZE, RADIUS, SIGMA, ALPHA = 56, 16, 3.67, 0.24
PAD = math.ceil(SIGMA * 3)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'images')


def gaussian_blur(a, sigma):
    r = math.ceil(sigma * 4)
    x = np.arange(-r, r + 1)
    k = np.exp(-(x * x) / (2 * sigma * sigma))
    k /= k.sum()
    a = np.apply_along_axis(lambda row: np.convolve(row, k, mode='same'), 1, a)
    return np.apply_along_axis(lambda col: np.convolve(col, k, mode='same'), 0, a)


for scale, suffix in ((1, ''), (2, '@2x'), (3, '@3x')):
    side = (SIZE + 2 * PAD) * scale
    ss = 8  # supersampling for the shape's anti-aliased edge
    big = Image.new('L', (side * ss, side * ss), 0)
    o = PAD * scale * ss
    ImageDraw.Draw(big).rounded_rectangle(
        (o, o, o + SIZE * scale * ss - 1, o + SIZE * scale * ss - 1),
        radius=RADIUS * scale * ss, fill=255)
    shape = np.asarray(big.resize((side, side), Image.LANCZOS), dtype=np.float64) / 255
    alpha = np.clip(gaussian_blur(shape, SIGMA * scale) * ALPHA, 0, 1)
    rgba = np.zeros((side, side, 4), dtype=np.uint8)
    rgba[..., 3] = np.round(alpha * 255).astype(np.uint8)
    Image.fromarray(rgba, 'RGBA').save(os.path.join(OUT, f'fab_shadow{suffix}.png'), optimize=True)
    print(f'fab_shadow{suffix}.png', side, 'px')
