/**
 * Build-time gate for the capacity ⇄ field invariant (see
 * src/lib/taxonomy-capacity.ts). Exits non-zero listing every offence.
 */
import { assertCapacityIntegrity } from "../src/lib/taxonomy-capacity";
import { MODULE_VARIANTS } from "../src/lib/taxonomy";

try {
  assertCapacityIntegrity();
  console.log(`capacity invariant holds for ${MODULE_VARIANTS.length} variants`);
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
