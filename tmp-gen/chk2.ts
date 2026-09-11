import { NEXT_LOGO_FAMILIES, nextLogoColourways } from "../src/lib/next-logo-vectors";
for (const f of Object.values(NEXT_LOGO_FAMILIES) as any[]) console.log(f.id ?? f, nextLogoColourways(f.id ?? f).join(","));
