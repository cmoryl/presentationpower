import fs from "node:fs";
import { nextLogoFamily } from "@/lib/next-logo-vectors";
for (const id of ["globallink", "lifesci", "digital"]) {
  const f = nextLogoFamily(id)!;
  const a = f.side ?? f.stacked!;
  fs.writeFileSync(
    `/tmp/browser/ldn/${id}.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${a.width} ${a.height}" width="900"><rect width="100%" height="100%" fill="#6C4BF4"/>${a.paths.map((p) => `<path d="${p.d}" fill="${p.fill}"/>`).join("")}</svg>`,
  );
}
console.log("ok");
