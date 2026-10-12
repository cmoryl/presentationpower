// Company / sub-brand and product-family tags for print library entries.
// An entry's own `company` / `product` fields win; otherwise the tag is read
// from names the entry itself carries (title, source file, tags, eyebrow).
// Nothing is guessed: an entry that names neither stays "Not tagged".
import type { PrintLibraryItem } from "@/lib/print-library/catalog";

export const UNTAGGED = "Not tagged";

/** Sub-brands, most specific first (a "TransPerfect ContentLabs" file is ContentLabs). */
const COMPANIES: [string, RegExp][] = [
  ["ContentLabs", /content\s?labs/i],
  ["Trial Interactive", /trial\s?interactive/i],
  ["Medical Device", /medical device|\bmeddev\b|\btpmd\b/i],
  ["GlobalLink", /global\s?link/i],
  ["PartnerLink", /partner\s?link/i],
  ["Life Sciences", /life\s?sci|\btpls\b/i],
  ["Legal", /\blegal\b/i],
  ["Media", /\bmedia\b/i],
  ["Games", /\bgames?\b/i],
  ["TransPerfect", /transperfect/i],
];

const PRODUCTS: [string, RegExp][] = [
  ["GlobalLink NOW", /globallink now|\bgl now\b/i],
  ["GlobalLink ONE", /globallink one|\bgl one\b/i],
  ["GlobalLink AURA", /\baura\b/i],
  ["GlobalLink Web", /globallink web|\bgl web\b/i],
  ["Veeva integration", /veeva/i],
  ["eCOA / Applanga", /ecoa|applanga/i],
  ["TMF quality", /\btmf\b/i],
  ["Pharmacovigilance", /pharmacovigilance|\bpv\b|literature monitoring/i],
  ["Clinical trial websites", /clinical trial website|web localization/i],
  ["Post-market services", /post-market|post market/i],
  ["AI services", /\bai\b|artificial intelligence/i],
  ["Patient engagement", /patient/i],
  ["HCP engagement", /\bhcp\b/i],
];

type Tagged = PrintLibraryItem & { company?: string; product?: string };

function haystack(i: PrintLibraryItem): string {
  const c = (i.content ?? {}) as Record<string, unknown>;
  return [i.title, i.sourceFile, ...(i.tags ?? []), typeof c.eyebrow === "string" ? c.eyebrow : ""].join(" · ");
}

export function companyOf(i: PrintLibraryItem): string {
  const own = (i as Tagged).company;
  if (own) return own;
  const h = haystack(i);
  return COMPANIES.find(([, re]) => re.test(h))?.[0] ?? UNTAGGED;
}

export function productOf(i: PrintLibraryItem): string {
  const own = (i as Tagged).product;
  if (own) return own;
  const h = haystack(i);
  return PRODUCTS.find(([, re]) => re.test(h))?.[0] ?? UNTAGGED;
}

/** Distinct values with counts, untagged last. */
export function tagCounts(items: PrintLibraryItem[], of: (i: PrintLibraryItem) => string): [string, number][] {
  const m = new Map<string, number>();
  for (const i of items) m.set(of(i), (m.get(of(i)) ?? 0) + 1);
  return [...m.entries()].sort((a, b) =>
    a[0] === UNTAGGED ? 1 : b[0] === UNTAGGED ? -1 : a[0].localeCompare(b[0]),
  );
}
