import { QEII_FLOOR_VECTORS } from "@/lib/next-london-qeii-vectors";
function area(s:any){ const nums = (s.d.match(/-?\d+(\.\d+)?/g)||[]).map(Number); let xs=[],ys=[]; for(let i=0;i+1<nums.length;i+=2){xs.push(nums[i]);ys.push(nums[i+1]);} if(!xs.length) return 0; return (Math.max(...xs)-Math.min(...xs))*(Math.max(...ys)-Math.min(...ys)); }
for (const key of ["3","0"]) {
  const r:any = (QEII_FLOOR_VECTORS as any)[key];
  const by: Record<string, number> = {};
  for (const s of r.shapes) if (s.fill) by[s.fill.toLowerCase()] = (by[s.fill.toLowerCase()]||0) + area(s);
  console.log(key, r.w*r.h, Object.entries(by).map(([k,v])=>[k,(v/(r.w*r.h)).toFixed(2)]));
}
