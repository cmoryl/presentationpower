import { effectivePack } from "../src/lib/effective-pack";
const a = effectivePack({stylePackId:"skin-s06", designRecipeId:null});
const b = effectivePack({stylePackId:"skin-s06", designRecipeId:"R04"});
for (const [n,p] of [["plain",a],["recipe",b]] as const) {
  console.log("==",n, p?.id, p?.tokens.surface, p?.tokens.ink);
  console.log(String((p as any).ground("scene:agenda accentlock lp-agenda-vertical")).slice(0,500));
}
