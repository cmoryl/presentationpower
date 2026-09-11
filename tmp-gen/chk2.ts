import { NEXT_LOGO_FAMILIES, nextLogoColourways } from "../src/lib/next-logo-vectors";
for (const f of NEXT_LOGO_FAMILIES) console.log(f.id, nextLogoColourways(f.id).join(","));
