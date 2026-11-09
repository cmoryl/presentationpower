# Post-process Bowl Illustrator ZIPs: Illustrator ignores SVG2 `href` on <image>, so pictures vanished.
# Rewrites to xlink:href, and adds every embedded picture as a separate file in images/ (01-background first).
import sys, re, json, base64, zipfile, io, subprocess, pathlib, urllib.request
D = pathlib.Path('src/assets/sjb-illustrator')
IMG = re.compile(r'(<g id="([^"]+)"[^>]*>)?<image ([^>]*?) (?:xlink:)?href="data:image/(\w+);base64,([^"]+)"')
NOTE = ("\nPictures:\n- Every picture is embedded inside the .svg (no linked files needed).\n"
        "- The same pictures are also supplied separately in images/ at the size Canva exported; 01-background is the full background.\n")
for p in sorted(D.glob('*.asset.json')):
    ptr = json.loads(p.read_text())
    data = urllib.request.urlopen('http://localhost:8080' + ptr['url']).read()
    zin = zipfile.ZipFile(io.BytesIO(data)); out = io.BytesIO(); zout = zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED)
    for n in zin.namelist():
        b = zin.read(n)
        if n.startswith('images/'): continue
        if n.endswith('.svg'):
            s = b.decode(); i = 0
            for m in IMG.finditer(s):
                i += 1; ext = 'jpg' if m.group(4) in ('jpeg', 'jpg') else m.group(4)
                name = '01-background' if i == 1 else f'{i:02d}-{(m.group(2) or "image").lower().replace("_", "-")}'
                zout.writestr(f'images/{name}.{ext}', base64.b64decode(m.group(5)))
            s = re.sub(r'(<image [^>]*?) href="data:', r'\1 xlink:href="data:', s)
            b = s.encode()
        if n == 'README.txt' and b'Pictures:' not in b: b += NOTE.encode()
        zout.writestr(n, b)
    zout.close()
    tmp = pathlib.Path('/tmp/aifix') / ptr['original_filename']; tmp.parent.mkdir(exist_ok=True); tmp.write_bytes(out.getvalue())
    new = subprocess.check_output(['lovable-assets', 'create', '--file', str(tmp)])
    old = pathlib.Path('/tmp/aifix') / (p.name + '.old'); old.write_text(p.read_text())
    subprocess.run(['lovable-assets', 'delete', '--file', str(old)], check=True, capture_output=True)
    p.write_bytes(new); print(p.name, i)
