import { londonCmykBuild, cmykShort } from "@/lib/next-london-cmyk";
for (const hex of ["#9A70F8","#B4B0FB","#8BC6EA","#A1FBF9","#003FC7","#C2A3FF","#EC388A"]) {
  for (const v of [1, 1.15]) {
    const b = londonCmykBuild(hex, v);
    console.log(hex, "v"+v, cmykShort(b), "tac", b.tac.toFixed(0), b.approved ? "approved" : "conv");
  }
}
