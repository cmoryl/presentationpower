from PIL import Image, ImageDraw, ImageFont, ImageOps
F="/dev-server/public/fonts/Geist-Bold.ttf"; FR="/dev-server/public/fonts/Geist-Regular.ttf"
NAVY,GOLD="#0D0E21","#C9A100"
logo=Image.open("logo.png").convert("RGBA"); logo=logo.crop(logo.getbbox())
C={"std":{"en":("SAVE THE DATE","DECEMBER 16, 2026","HIRAM BITHORN STADIUM · SAN JUAN, PR"),"es":("RESERVA LA FECHA","16 DE DICIEMBRE DE 2026","ESTADIO HIRAM BITHORN · SAN JUAN, PR")},
   "tix":{"en":("TICKETS ON SALE","DECEMBER 16, 2026","HIRAM BITHORN STADIUM · SAN JUAN, PR"),"es":("BOLETOS A LA VENTA","16 DE DICIEMBRE DE 2026","ESTADIO HIRAM BITHORN · SAN JUAN, PR")}}
URL="SANJUANBOWL.COM"
def fit(d,t,font,mw,mh):
    s=int(mh)
    while s>8:
        f=ImageFont.truetype(font,s); b=d.textbbox((0,0),t,font=f)
        if b[2]-b[0]<=mw: return f
        s-=1
    return f
def block(im,box,msg,lang,big=True,sub=True):
    x,y,w,h=box; d=ImageDraw.Draw(im); head,date,venue=C[msg][lang]
    ls=int(min(h*0.42,w*0.5)); lg=logo.copy(); lg.thumbnail((ls,ls),Image.LANCZOS)
    rows=[(head,F,NAVY,0.13),(date,F,GOLD,0.08)]+([(venue,FR,NAVY,0.045)] if sub else [])+[(URL,F,NAVY,0.06)]
    items=[(t,fit(d,t,fn,w,h*k),c) for t,fn,c,k in rows]
    gap=int(h*0.03); tot=lg.height+gap*2+sum(d.textbbox((0,0),t,font=f)[3]+gap for t,f,_ in items)
    cy=y+(h-tot)//2; im.paste(lg,(x+(w-lg.width)//2,cy),lg); cy+=lg.height+gap*2
    for t,f,c in items:
        b=d.textbbox((0,0),t,font=f); tx=x+(w-(b[2]-b[0]))//2-b[0]
        if t==URL:
            p=int(f.size*0.35); d.rectangle([tx-p,cy-p//2,tx+b[2]-b[0]+p,cy+b[3]+p//2],fill=NAVY); d.text((tx,cy),t,font=f,fill="white")
        else: d.text((tx,cy),t,font=f,fill=c)
        cy+=b[3]+gap
out=[]
def social(src,box,msg,lang):
    im=Image.open(src+".jpg").convert("RGB"); W,H=im.size
    block(im,[int(v*s) for v,s in zip(box,(W,H,W,H))],msg,lang); n=f"full-social-{src}-{msg}-{lang}"; im.save(f"out/{n}.png"); out.append(n)
def board(src,size,side,msg,lang):
    w,h=size; im=ImageOps.fit(Image.open(src+".jpg").convert("RGB"),size,Image.LANCZOS,centering=(0.5,0.4))
    d=ImageDraw.Draw(im); head,date,venue=C[msg][lang]
    x0=int(w*(0.42 if side=="right" else 0.06)); cw=int(w*0.52)
    ls=int(h*0.62); lg=logo.copy(); lg.thumbnail((ls,ls),Image.LANCZOS)
    lx=x0; im.paste(lg,(lx,(h-lg.height)//2),lg); tx=lx+lg.width+int(h*0.08); tw=x0+cw-tx
    rows=[(head,F,NAVY,0.2),(date,F,GOLD,0.13),(URL,F,NAVY,0.12)]
    items=[(t,fit(d,t,fn,tw,h*k),c) for t,fn,c,k in rows]; gap=int(h*0.05)
    tot=sum(d.textbbox((0,0),t,font=f)[3] for t,f,_ in items)+gap*2; cy=(h-tot)//2
    for t,f,c in items:
        b=d.textbbox((0,0),t,font=f)
        if t==URL:
            p=int(f.size*0.3); d.rectangle([tx-p,cy-p//3,tx+b[2]+p,cy+b[3]+p//3],fill=NAVY); d.text((tx,cy),t,font=f,fill="white")
        else: d.text((tx,cy),t,font=f,fill=c)
        cy+=b[3]+gap
    n=f"full-board-{w}x{h}-{src}-{msg}-{lang}"; im.save(f"out/{n}.png"); out.append(n)
import os; os.makedirs("out",exist_ok=True)
for m in C:
  for l in ("en","es"):
    social("thirds-left-wide",(0.5,0.1,0.44,0.8),m,l)
    social("thirds-right-wide",(0.04,0.1,0.42,0.8),m,l)
    social("thirds-top-story",(0.08,0.4,0.84,0.55),m,l)
    for sz in ((840,400),(1728,512)):
      board("thirds-left-wide",sz,"right",m,l); board("thirds-right-wide",sz,"left",m,l)
print(len(out))
