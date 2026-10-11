"""
build_map.py
Turns the source art into game-ready assets so everything shares ONE pixel grid.

  python tools/art/build_map.py [debug_dir]

Needs: pip install pillow numpy scipy
Reads:  tools/art/source/*.png, tools/art/town_annotations.json
Writes: public/assets/town/town.png        the village, crisp 2px pixels
        public/assets/town/town_fg.png     things you can walk behind (atlas)
        public/assets/town/town_fg.json    atlas frames (Phaser JSON hash)
        public/assets/town/town_map.json   walls, foreground objects, spawn, NPC spots
        public/assets/characters/*.png     character sheets on the same 2px grid
        public/assets/characters/dog.png   Biscuit the dog (drawn here, pixel by pixel)
"""

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'tools' / 'art' / 'source'
OUT_TOWN = ROOT / 'public' / 'assets' / 'town'
OUT_CHAR = ROOT / 'public' / 'assets' / 'characters'
K = 2            # one art pixel = 2x2 image pixels
GRID = 4         # collision grid in image pixels

CHARACTERS = ['player', 'guide', 'baker', 'barista', 'grocer', 'librarian']


# ---------- 1. The village picture ----------

def pixelate_town():
    src = Image.open(SRC / 'town_bg.png').convert('RGB')
    w, h = src.size
    sharp = src.filter(ImageFilter.UnsharpMask(radius=2, percent=120, threshold=1))
    small = sharp.resize((w // K, h // K), Image.LANCZOS)
    small = small.quantize(colors=256, method=Image.Quantize.MEDIANCUT, kmeans=2,
                           dither=Image.Dither.NONE).convert('RGB')
    return small  # 848x567, shown at 2x


def ground_mask(small):
    """True where the pixel is plain ground (grass, sand path, stone path)."""
    im = np.asarray(small).astype(np.float32) / 255
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    mx = im.max(-1)
    mn = im.min(-1)
    d = mx - mn + 1e-6
    hue = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    sat = d / (mx + 1e-6)
    val = mx
    grass = (hue >= 55) & (hue <= 100) & (val > 0.55) & (sat > 0.35)
    sand = (hue >= 25) & (hue <= 48) & (val > 0.78) & (sat > 0.3) & (sat < 0.65)
    stone = (sat < 0.18) & (val > 0.6)
    return ndi.binary_opening(grass | sand | stone, iterations=1)


# ---------- 2. Walls (collision) ----------

def build_solids(ann, w, h):
    cols, rows = w // GRID, h // GRID
    walk = np.zeros((rows, cols), bool)

    def cells(x0, y0, x1, y1):
        return slice(max(0, round(y0 / GRID)), min(rows, round(y1 / GRID))), \
               slice(max(0, round(x0 / GRID)), min(cols, round(x1 / GRID)))

    for x0, y0, x1, y1 in ann['walk']:
        walk[cells(x0, y0, x1, y1)] = True
    for x, y, bw, bh in ann['block']:
        walk[cells(x, y, x + bw, y + bh)] = False

    solid = ~walk
    rects = []
    open_runs = {}  # (x0, x1) -> rect index still growing downwards
    for y in range(rows):
        runs = []
        x = 0
        while x < cols:
            if solid[y, x]:
                s = x
                while x < cols and solid[y, x]:
                    x += 1
                runs.append((s, x))
            else:
                x += 1
        next_open = {}
        for run in runs:
            if run in open_runs:
                i = open_runs[run]
                rects[i][3] += 1
            else:
                rects.append([run[0], y, run[1] - run[0], 1])
                i = len(rects) - 1
            next_open[run] = i
        open_runs = next_open
    return [[x * GRID, y * GRID, rw * GRID, rh * GRID] for x, y, rw, rh in rects], walk


# ---------- 3. Things you can walk behind ----------

def region_mask(obj, w, h):
    """Region of an fg object in small-image (art pixel) coordinates."""
    sw, sh = w // K, h // K
    img = Image.new('L', (sw, sh), 0)
    d = ImageDraw.Draw(img)
    if 'ellipse' in obj:
        cx, cy, rx, ry = [v / K for v in obj['ellipse']]
        d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=255)
    if 'rect' in obj:
        x0, y0, x1, y1 = [v / K for v in obj['rect']]
        d.rectangle([x0, y0, x1 - 1, y1 - 1], fill=255)
    return np.asarray(img) > 0


def build_fg(ann, small, ground, w, h):
    img = np.asarray(small.convert('RGBA')).copy()
    pieces = []
    for obj in ann['fg']:
        region = region_mask(obj, w, h)
        if obj.get('full'):
            mask = region
        else:
            mask = region & ~ground
            mask = ndi.binary_fill_holes(mask) & region
            mask = ndi.binary_opening(mask, iterations=1) | (mask & ~ndi.binary_erosion(region))
        ys, xs = np.nonzero(mask)
        if not len(ys):
            print('  empty fg object:', obj['name'])
            continue
        # Tall thin things like fences along a vertical line are cut into slices,
        # so each slice sorts with its own base.
        split = obj.get('vsplit')
        y_top, y_bot = ys.min(), ys.max() + 1
        bands = [(y_top, y_bot, obj['base'])]
        if split:
            step = max(1, split // K)
            bands = []
            y = y_top
            while y < y_bot:
                yb = min(y_bot, y + step)
                base = obj['base'] if yb >= y_bot else yb * K
                bands.append((y, yb, base))
                y = yb
        for i, (b0, b1, base) in enumerate(bands):
            part = mask.copy()
            part[:b0] = False
            part[b1:] = False
            pys, pxs = np.nonzero(part)
            if not len(pys):
                continue
            x0, x1, y0, y1 = pxs.min(), pxs.max() + 1, pys.min(), pys.max() + 1
            crop = img[y0:y1, x0:x1].copy()
            crop[..., 3] = np.where(part[y0:y1, x0:x1], 255, 0)
            pieces.append({
                'name': obj['name'] + (f'_{i}' if len(bands) > 1 else ''),
                'x': int(x0 * K), 'y': int(y0 * K), 'base': int(base),
                'image': Image.fromarray(crop, 'RGBA').resize(((x1 - x0) * K, (y1 - y0) * K), Image.NEAREST),
            })
    return pieces


def pack_atlas(pieces, width=2048):
    pad = 2
    order = sorted(pieces, key=lambda p: -p['image'].height)
    x = y = shelf = 0
    for p in order:
        pw, ph = p['image'].size
        if x + pw + pad > width:
            x, y, shelf = 0, y + shelf + pad, 0
        p['ax'], p['ay'] = x, y
        x += pw + pad
        shelf = max(shelf, ph)
    height = y + shelf
    atlas = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    frames = {}
    for p in pieces:
        atlas.paste(p['image'], (p['ax'], p['ay']))
        pw, ph = p['image'].size
        frames[p['name']] = {
            'frame': {'x': p['ax'], 'y': p['ay'], 'w': pw, 'h': ph},
            'rotated': False, 'trimmed': False,
            'spriteSourceSize': {'x': 0, 'y': 0, 'w': pw, 'h': ph},
            'sourceSize': {'w': pw, 'h': ph},
        }
    return atlas, {'frames': frames, 'meta': {'image': 'town_fg.png', 'format': 'RGBA8888',
                                              'size': {'w': width, 'h': height}, 'scale': '1'}}


# ---------- 4. Characters ----------

def pixelate_sheet(path):
    sheet = Image.open(path).convert('RGBA')
    w, h = sheet.size
    small = sheet.resize((w // K, h // K), Image.NEAREST)
    a = np.asarray(small).copy()
    a[..., 3] = np.where(a[..., 3] >= 128, 255, 0)
    return Image.fromarray(a, 'RGBA').resize((w, h), Image.NEAREST)


# Biscuit the dog, side view facing right. 20x16 art pixels per frame.
#   o outline   f fur   l light fur   d dark fur (ear)   n nose/eye   c collar   t tag   p tongue   w shine
DOG_PAL = {
    'o': (59, 36, 22, 255), 'f': (176, 112, 62, 255), 'l': (226, 178, 118, 255),
    'd': (112, 66, 34, 255), 'n': (28, 18, 12, 255), 'c': (214, 58, 58, 255),
    't': (255, 214, 77, 255), 'p': (232, 110, 120, 255), 'w': (255, 255, 255, 255),
}
DOG_TOP = [
    '....................',
    '............oooo....',
    '...........offffo...',
    '..........offffffo..',
    '..........offnwffoo.',
]
DOG_TAIL_DOWN = [
    '.o........ddffffffon',
    'ofo.......ddfflllloo',
    '.ofo......ddolllpo..',
    '..of.oooooocctooo...',
]
DOG_TAIL_UP = [
    'oo........ddffffffon',
    'ofo.......ddfflllloo',
    'ofo.......ddolllpo..',
    '.ofooooooocctooo....',
]
DOG_BODY = [
    '..offfffffffffffo...',
    '..offlllllllllffo...',
    '...offffffffffffo...',
]
DOG_LEGS = {
    'stand': ['...ofo.ooooo.ofo....', '...ofo.......ofo....', '...ooo.......ooo....', '....................'],
    'walk1': ['..ofo..ooooo..ofo...', '.ofo............ofo.', '.oo..............oo.', '....................'],
    'walk2': ['....ofoooooooofo....', '....ofo......ofo....', '....oo.......oo.....', '....................'],
}
DOG_FRAMES = {
    'stand': DOG_TOP + DOG_TAIL_DOWN + DOG_BODY + DOG_LEGS['stand'],
    'wag': DOG_TOP + DOG_TAIL_UP + DOG_BODY + DOG_LEGS['stand'],
    'walk1': DOG_TOP + DOG_TAIL_UP + DOG_BODY + DOG_LEGS['walk1'],
    'walk2': DOG_TOP + DOG_TAIL_DOWN + DOG_BODY + DOG_LEGS['walk2'],
}


def draw_dog():
    order = ['stand', 'wag', 'walk1', 'walk2']
    fw, fh = 20, 16
    sheet = Image.new('RGBA', (fw * len(order) * 2, fh * 2 * 2), (0, 0, 0, 0))
    for i, key in enumerate(order):
        frame = Image.new('RGBA', (fw, fh), (0, 0, 0, 0))
        px = frame.load()
        rows = DOG_FRAMES[key]
        for y, row in enumerate(rows):
            for x, ch in enumerate(row):
                if ch in DOG_PAL:
                    px[x, y] = DOG_PAL[ch]
        big = frame.resize((fw * 2, fh * 2), Image.NEAREST)
        sheet.paste(big, (i * fw * 2, 0))                                   # facing right
        sheet.paste(big.transpose(Image.FLIP_LEFT_RIGHT), (i * fw * 2, fh * 2))  # facing left
    return sheet


# ---------- 5. Debug picture ----------

def debug_image(full, solids, pieces, ann, path):
    vis = full.convert('RGBA')
    over = Image.new('RGBA', vis.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(over)
    for x, y, w, h in solids:
        d.rectangle([x, y, x + w - 1, y + h - 1], fill=(255, 0, 0, 70))
    for p in pieces:
        tint = Image.new('RGBA', p['image'].size, (40, 120, 255, 110))
        over.paste(tint, (p['x'], p['y']), p['image'])
        d.line([(p['x'], p['base']), (p['x'] + p['image'].width, p['base'])], fill=(255, 255, 0, 255), width=1)
    for name, (x, y) in ann['npcs'].items():
        d.ellipse([x - 5, y - 5, x + 5, y + 5], fill=(255, 0, 255, 255))
        d.text((x + 6, y - 6), name, fill=(255, 255, 255, 255))
    sx, sy = ann['spawn']
    d.rectangle([sx - 5, sy - 5, sx + 5, sy + 5], fill=(0, 255, 0, 255))
    Image.alpha_composite(vis, over).save(path)


def main():
    debug_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    OUT_TOWN.mkdir(parents=True, exist_ok=True)
    OUT_CHAR.mkdir(parents=True, exist_ok=True)
    ann = json.loads((ROOT / 'tools' / 'art' / 'town_annotations.json').read_text(encoding='utf-8'))

    small = pixelate_town()
    w, h = small.width * K, small.height * K
    full = small.resize((w, h), Image.NEAREST)
    full.save(OUT_TOWN / 'town.png', optimize=True)
    print('town.png', full.size)

    ground_small = ground_mask(small)
    solids, _ = build_solids(ann, w, h)
    pieces = build_fg(ann, small, ground_small, w, h)
    atlas, atlas_json = pack_atlas(pieces)
    atlas.save(OUT_TOWN / 'town_fg.png', optimize=True)
    (OUT_TOWN / 'town_fg.json').write_text(json.dumps(atlas_json), encoding='utf-8')
    print('fg pieces', len(pieces), 'atlas', atlas.size, '| solid rects', len(solids))

    town_map = {
        'width': w, 'height': h,
        'spawn': ann['spawn'], 'npcs': ann['npcs'], 'festival': ann['festival'], 'places': ann['places'],
        'solids': solids,
        'fg': [{'frame': p['name'], 'x': p['x'], 'y': p['y'], 'base': p['base']} for p in pieces],
    }
    (OUT_TOWN / 'town_map.json').write_text(json.dumps(town_map, separators=(',', ':')), encoding='utf-8')

    for name in CHARACTERS:
        pixelate_sheet(SRC / f'{name}.png').save(OUT_CHAR / f'{name}.png', optimize=True)
    draw_dog().save(OUT_CHAR / 'dog.png', optimize=True)
    print('characters done')

    if debug_dir:
        debug_image(full, solids, pieces, ann, debug_dir / 'map_debug.png')
        print('debug image written')


if __name__ == '__main__':
    main()
