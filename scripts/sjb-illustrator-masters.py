# Usage: render ref_dark.png/ref_color.png (128px) from sjb-logo-dark/color.svg into /tmp/ai, export each saved Canva social as PPTX, then:
#   python3 scripts/sjb-illustrator-masters.py <design>.pptx out.svg sjb-logo-dark.svg sjb-logo-color.svg <designId>
# Zip each SVG with a README listing fonts, upload with lovable-assets, and save the pointer in src/assets/sjb-illustrator/.
"""Canva PPTX export -> layered, editable SVG for Illustrator.
Each Canva object becomes its own named top-level group (Illustrator layer/sublayer).
Text stays live <text>; the Bowl shield raster is swapped for the supplied vector master."""
import sys, re, base64, zipfile, html, io
from lxml import etree
from PIL import Image
import numpy as np
def _vec(im):
    return np.asarray(im.convert('RGBA').resize((128, 128))).astype(float) / 255
REFS = {k: _vec(Image.open(f'/tmp/ai/ref_{k}.png')) for k in ('dark', 'color')}
def shield_kind(data):
    """Returns 'dark'/'color' when a raster is the supplied Bowl shield, else None."""
    try: im = Image.open(io.BytesIO(data))
    except Exception: return None
    w, h = im.size
    if abs(w / h - 1) > 0.08 or w < 300: return None
    v = _vec(im); best = None
    for k, r in REFS.items():
        d = np.abs(v[..., :3] * v[..., 3:] - r[..., :3] * r[..., 3:]).mean() + np.abs(v[..., 3] - r[..., 3]).mean()
        if best is None or d < best[0]: best = (d, k)
    return best[1] if best[0] < 0.15 else None

NS = {'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
      'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
FONT_MAP = {}  # Canva face name -> (family, weight)

def face(name):
    n = name or 'Geist'
    w = 900 if re.search(r'black|heavy|ultra', n, re.I) else 600 if re.search(r'semi', n, re.I) else 700 if re.search(r'bold', n, re.I) else 400
    it = bool(re.search(r'italic', n, re.I))
    fam = n
    for _ in range(3):
        fam = re.sub(r'[\s-]*(Semi-Bold|SemiBold|Bold|Black|Heavy|Ultra-?|Regular|Medium|Italics?)\s*$', '', fam, flags=re.I)
    return (fam.strip() or n), w, it

def convert(pptx, out, shield_dark, shield_color, design_id, page=1):
    z = zipfile.ZipFile(pptx)
    pres = etree.fromstring(z.read('ppt/presentation.xml'))
    sz = pres.find('p:sldSz', NS); W, H = int(sz.get('cx')), int(sz.get('cy'))
    s = 9525  # EMU per px
    pw, ph = W / s, H / s
    slide = etree.fromstring(z.read(f'ppt/slides/slide{page}.xml'))
    rels = etree.fromstring(z.read(f'ppt/slides/_rels/slide{page}.xml.rels'))
    rmap = {r.get('Id'): 'ppt/' + r.get('Target').replace('../', '') for r in rels}
    layers, report = [], []
    for i, sp in enumerate(slide.find('.//p:spTree', NS)):
        if sp.tag.split('}')[1] not in ('sp', 'pic'): continue
        cnv = sp.find('.//p:cNvPr', NS); name = cnv.get('name'); descr = cnv.get('descr') or ''
        xf = sp.find('.//a:xfrm', NS)
        if xf is None: continue
        x, y = int(xf.find('a:off', NS).get('x')) / s, int(xf.find('a:off', NS).get('y')) / s
        w, h = int(xf.find('a:ext', NS).get('cx')) / s, int(xf.find('a:ext', NS).get('cy')) / s
        rot = int(xf.get('rot') or 0) / 60000
        tf = f' transform="rotate({rot:.3f} {x + w/2:.2f} {y + h/2:.2f})"' if rot else ''
        lid = re.sub(r'[^A-Za-z0-9_-]', '_', (descr or name))[:60] + f'_{i}'
        blip = sp.find('.//a:blip', NS)
        if blip is not None:
            fr = sp.find('.//a:fillRect', NS)
            l = t = r_ = b = 0
            if fr is not None:
                l, t, r_, b = (int(fr.get(k) or 0) / 100000 for k in 'ltrb')
            ix, iy = x + l * w, y + t * h
            iw, ih = w * (1 - l - r_), h * (1 - t - b)
            data = z.read(rmap[blip.get('{%s}embed' % NS['r'])])
            kind = shield_kind(data)
            if kind:
                src = shield_dark if kind == 'dark' else shield_color
                vb = re.search(r'viewBox="([^"]+)"', src).group(1).split()
                inner = re.sub(r'^.*?<svg[^>]*>|</svg>\s*$', '', src, flags=re.S)
                sc = min(iw / float(vb[2]), ih / float(vb[3]))
                ox = ix + (iw - float(vb[2]) * sc) / 2 - float(vb[0]) * sc
                oy = iy + (ih - float(vb[3]) * sc) / 2 - float(vb[1]) * sc
                layers.append(f'<g id="Shield_vector_master_{i}"{tf}><g transform="translate({ox:.2f} {oy:.2f}) scale({sc:.6f})">{inner}</g></g>')
                report.append(('vector-shield', kind))
            else:
                mime = 'image/png' if data[:4] == b'\x89PNG' else 'image/jpeg'
                layers.append(f'<g id="{lid}"{tf}><image x="{ix:.2f}" y="{iy:.2f}" width="{iw:.2f}" height="{ih:.2f}" preserveAspectRatio="none" href="data:{mime};base64,{base64.b64encode(data).decode()}"/></g>')
                report.append(('image', descr or name))
            continue
        tb = sp.find('p:txBody', NS)
        if tb is not None:
            body = tb.find('a:bodyPr', NS)
            ins = {k: int(body.get(k) or 91440) / s for k in ('lIns', 'tIns', 'rIns')} if body is not None else {'lIns': 9.6, 'tIns': 4.8, 'rIns': 9.6}
            cy = y + ins['tIns']; parts = []
            for para in tb.findall('a:p', NS):
                ppr = para.find('a:pPr', NS); algn = ppr.get('algn') if ppr is not None else 'l'
                anchor, ax = {'ctr': ('middle', x + w/2), 'r': ('end', x + w - ins['rIns'])}.get(algn, ('start', x + ins['lIns']))
                lsp = para.find('a:pPr/a:lnSpc/a:spcPts', NS)
                runs = para.findall('a:r', NS)
                size = max([int(r.find('a:rPr', NS).get('sz') or 1800) for r in runs] or [1800]) / 100 * 96 / 72
                lh = int(lsp.get('val')) / 100 * 96 / 72 if lsp is not None else size * 1.2
                cy += lh
                tsp = []
                for r in runs:
                    rp = r.find('a:rPr', NS); fam, wt, it = face(rp.find('a:latin', NS).get('typeface') if rp.find('a:latin', NS) is not None else None)
                    col = rp.find('a:solidFill/a:srgbClr', NS); fill = '#' + col.get('val') if col is not None else '#000000'
                    sp_ = int(rp.get('spc') or 0) / 100 * 96 / 72
                    fs = int(rp.get('sz') or 1800) / 100 * 96 / 72
                    tsp.append(f'<tspan font-family="{html.escape(fam)}" font-weight="{wt}"{' font-style="italic"' if it else ''} font-size="{fs:.2f}" fill="{fill}" letter-spacing="{sp_:.2f}">{html.escape(r.findtext("a:t", namespaces=NS) or "")}</tspan>')
                if tsp:
                    parts.append(f'<text x="{ax:.2f}" y="{cy - (lh - size) / 2 - size * 0.2:.2f}" text-anchor="{anchor}">{"".join(tsp)}</text>')
            if parts:
                txt = ' '.join(re.sub('<[^>]+>', '', p) for p in parts)
                layers.append(f'<g id="Text_{re.sub(r"[^A-Za-z0-9]", "_", txt)[:40]}_{i}"{tf}>{"".join(parts)}</g>')
                report.append(('live-text', txt))
            continue
        fill = sp.find('p:spPr/a:solidFill/a:srgbClr', NS)
        if fill is not None:
            layers.append(f'<g id="{lid}"{tf}><rect x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{h:.2f}" fill="#{fill.get("val")}"/></g>')
            report.append(('shape', name))
    svg = (f'<?xml version="1.0" encoding="UTF-8"?>\n<!-- San Juan Bowl editable master rebuilt from saved Canva design {design_id}. '
           f'Each top-level group is one Canva object. Text is live; install the named fonts before editing. -->\n'
           f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{pw:.0f}" height="{ph:.0f}" viewBox="0 0 {pw:.2f} {ph:.2f}">'
           + ''.join(layers) + '</svg>')
    open(out, 'w').write(svg)
    return report, (round(pw), round(ph))

if __name__ == '__main__':
    pptx, out, dark, color, did = sys.argv[1:6]
    z = zipfile.ZipFile(pptx)
    n = len([x for x in z.namelist() if re.match(r'ppt/slides/slide\d+\.xml$', x)])
    for p in range(1, n + 1):
        o = out if n == 1 else out.replace('.svg', f'-page{p}.svg')
        rep, size = convert(pptx, o, open(dark).read(), open(color).read(), did, p)
        print(o, size); [print(r) for r in rep]
