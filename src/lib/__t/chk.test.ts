import { liveLayoutById, venueFirstFaceId } from "/dev-server/src/lib/next-california-kiosk-live";
const S=[[123,18.75],[110,54],[82.5,60],[82.5,60],[82.5,54]];
import {test} from "vitest";test("x",()=>{S.forEach(([w,h],i)=>{const L=liveLayoutById(venueFirstFaceId("76c01b5b-0bac",i+1,5,w,h))!;
for(const b of L.blocks)for(const p of b.parts??[]){const s=p.rs??1,cw=(p.x1-p.x0)*s,ch=(p.y1-p.y0)*s,cx=(p.x0+p.x1)/2+(p.rx??0),cy=(p.y0+p.y1)/2+(p.ry??0);
console.log(i+1,p.id,Math.round(cx-cw/2),Math.round(cy-ch/2),Math.round(cx+cw/2),Math.round(cy+ch/2),"trim",L.trimW,L.trimH,L.originX)}});});
