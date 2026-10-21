"""Read the exact colours used in Legalweek's live files (no brand guide was supplied).

Illustrator: decompress with qpdf, count every fill/stroke colour operator, and turn CMYK
builds into a screen preview with the file's own embedded ICC profile.
Photoshop: per-layer pixel census; a layer that is 100 % one colour is an exact fill.

Usage: PYTHONPATH=/tmp/pylib python3 scripts/legalweek-colours.py DIR  (needs qpdf, psd-tools)
"""
import collections, glob, io, os, re, subprocess, sys, zlib
import numpy as np
from PIL import Image, ImageCms

D = sys.argv[1]
for ai in sorted(glob.glob(os.path.join(D, "*.ai"))):
    q = ai + ".qdf.pdf"
    subprocess.run(["qpdf", "--qdf", "--object-streams=disable", ai, q])
    raw = open(q, "rb").read(); t = raw.decode("latin1")
    c = collections.Counter(tuple(round(float(x), 4) for x in m.group(1).split())
                            for m in re.finditer(r"(?<![\d./])((?:-?[\d.]+\s+){2,3}-?[\d.]+)\s+(?:scn|SCN|sc|SC|k|K|rg|RG)\b", t))
    prof = None
    for m in re.finditer(rb"<<([^>]*?/N 4[^>]*?)>>\s*stream\r?\n", raw):
        s = m.end(); data = raw[s:raw.index(b"endstream", s)]
        if b"FlateDecode" in m.group(1): data = zlib.decompress(data)
        prof = ImageCms.ImageCmsProfile(io.BytesIO(data)); break
    print("==", os.path.basename(ai), prof and ImageCms.getProfileDescription(prof).strip())
    for v, n in c.most_common(12):
        if len(v) == 3: print(n, "RGB", "#%02X%02X%02X" % tuple(round(x * 255) for x in v))
        elif prof:
            tr = ImageCms.buildTransform(prof, ImageCms.createProfile("sRGB"), "CMYK", "RGB", renderingIntent=1)
            px = ImageCms.applyTransform(Image.new("CMYK", (1, 1), tuple(round(x * 255) for x in v)), tr).getpixel((0, 0))
            print(n, "CMYK", [round(x * 100, 1) for x in v], "preview #%02X%02X%02X" % px)

from psd_tools import PSDImage
for f in sorted(glob.glob(os.path.join(D, "*.psd"))):
    print("==", os.path.basename(f))
    for l in PSDImage.open(f).descendants():
        im = l.topil()
        if im is None: continue
        a = np.array(im.convert("RGBA")).reshape(-1, 4); a = a[a[:, 3] > 250][:, :3]
        if not len(a): continue
        k, n = collections.Counter(map(tuple, a)).most_common(1)[0]
        print(" ", l.name, l.blend_mode, round(l.opacity / 2.55), "#%02X%02X%02X" % k, f"{100 * n / len(a):.1f}%")
