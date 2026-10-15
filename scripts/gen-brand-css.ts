// Writes src/styles/brand-tokens.css from src/lib/brand-colors.ts.
// Run: bun scripts/gen-brand-css.ts  (the parity test fails if it is stale)
import { writeFileSync } from "node:fs";
import { brandTokensCss } from "../src/lib/brand-colors";
writeFileSync("src/styles/brand-tokens.css", brandTokensCss());
console.log("wrote src/styles/brand-tokens.css");
