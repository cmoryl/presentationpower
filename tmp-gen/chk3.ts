import { STEP_REPEAT_DIVISION_FAMILIES } from "../src/lib/next-london-step-repeat";
import { nextLogoColourways } from "../src/lib/next-logo-vectors";
for (const id of STEP_REPEAT_DIVISION_FAMILIES) console.log(id, nextLogoColourways(id).join(","));
