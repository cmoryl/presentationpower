import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// A brand colour written as `fill={BRAND.ink}` inside an SVG/HTML string
// (not JSX) ships the literal text and breaks the file. Only `="${BRAND.x}"`
// is valid in a template string.
function files(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) files(p, out);
    else if (/\.(ts|tsx)$/.test(n)) out.push(p);
  }
  return out;
}

describe("brand colours in markup strings", () => {
  it("never write an unquoted {BRAND.x} attribute inside a template string", () => {
    const bad: string[] = [];
    for (const f of files("src")) {
      const src = readFileSync(f, "utf8");
      for (const m of src.matchAll(/`[^`]*`/g)) {
        if (/[a-z-]+=\{BRAND\.\w+\}/.test(m[0])) bad.push(f);
      }
    }
    expect([...new Set(bad)]).toEqual([]);
  });
});
