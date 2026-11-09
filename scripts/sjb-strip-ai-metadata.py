import struct,zlib,io,re,base64,zipfile
from PIL import Image
AI=[b'ContainsAiGeneratedContent',b'trainedAlgorithmicMedia',b'DigitalSourceType',b'c2pa',b'jumb']
def flagged(b): return any(m in b for m in AI)
def jpeg(b):
    if b[:2]!=b'\xff\xd8': return b
    out=bytearray(b'\xff\xd8'); i=2
    while i<len(b):
        if b[i]!=0xFF: return b
        m=b[i+1]
        if m==0xDA: out+=b[i:]; break
        if m in (0xD8,0x01) or 0xD0<=m<=0xD7: out+=b[i:i+2]; i+=2; continue
        L=struct.unpack('>H',b[i+2:i+4])[0]; seg=b[i:i+2+L]
        if m in (0xE1,0xEB,0xED) or (0xE3<=m<=0xEF and m!=0xEE) or m==0xFE: pass
        else: out+=seg
        i+=2+L
    return bytes(out)
DROP={b'tEXt',b'zTXt',b'iTXt',b'eXIf',b'caBX',b'tIME'}
def png(b):
    if b[:8]!=b'\x89PNG\r\n\x1a\n': return b
    out=bytearray(b[:8]); i=8
    while i<len(b):
        L=struct.unpack('>I',b[i:i+4])[0]; t=b[i+4:i+8]; ch=b[i:i+12+L]
        if t not in DROP: out+=ch
        i+=12+L
        if t==b'IEND': break
    return bytes(out)
def webp(b):
    if b[:4]!=b'RIFF' or b[8:12]!=b'WEBP': return b
    chunks=[];i=12
    while i+8<=len(b):
        t=b[i:i+4];L=struct.unpack('<I',b[i+4:i+8])[0];d=b[i:i+8+L+(L&1)];i+=8+L+(L&1)
        if t in (b'EXIF',b'XMP ',b'C2PA'): continue
        if t==b'VP8X':
            d=bytearray(d); d[8]&=~(0x08|0x04)&0xFF; d=bytes(d)
        chunks.append(d)
    body=b'WEBP'+b''.join(chunks)
    return b'RIFF'+struct.pack('<I',len(body))+body
def image(b):
    return png(webp(jpeg(b)))
def svg(d):
    def rep(m):
        raw=base64.b64decode(m.group(2)); n=image(raw)
        return m.group(1)+(base64.b64encode(n) if n!=raw else m.group(2))
    return re.sub(rb'(data:image/[a-z+]+;base64,)([A-Za-z0-9+/=\s]+)',rep,d)
def any_file(name,b):
    n=name.lower()
    if n.endswith('.zip'):
        zi=zipfile.ZipFile(io.BytesIO(b)); o=io.BytesIO(); ch=False
        with zipfile.ZipFile(o,'w',zipfile.ZIP_DEFLATED) as zo:
            for it in zi.infolist():
                d=zi.read(it); nd=any_file(it.filename,d)
                ch|=nd!=d; zo.writestr(it,nd)
        return o.getvalue() if ch else b
    if n.endswith('.svg'): return svg(b)
    if n.endswith(('.jpg','.jpeg','.png','.webp')): return image(b)
    return b

# Usage: python3 scripts/sjb-strip-ai-metadata.py  (strips AI/C2PA/EXIF/XMP/IPTC from local Bowl images; for CDN pointers download, any_file(), re-upload with lovable-assets)
if __name__=="__main__":
    import glob,os
    for f in glob.glob("src/assets/sjb*/**/*",recursive=True)+glob.glob("src/assets/san-juan-bowl/**/*",recursive=True):
        if os.path.isfile(f) and f.lower().endswith((".jpg",".jpeg",".png",".webp",".svg")):
            b=open(f,"rb").read(); n=any_file(f,b)
            if n!=b: open(f,"wb").write(n); print("cleaned",f)
