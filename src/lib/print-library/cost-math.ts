/**
 * Cost-summary math for multi-page proposals.
 *
 * Authors type volumes and unit rates; the page derives every line investment
 * and the grand total. Values stay plain strings in the content model (so the
 * existing editor, export and diff paths do not change) — this module owns the
 * parse → compute → format round trip.
 */

import type { ProposalCostRow } from "@/lib/print-assets.types";

/** Pull a number out of an authored string ("1,200 words", "$3.50/word"). */
export function parseAmount(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9.,-]/g, "").replace(/,/g, "");
  if (!cleaned || !/[0-9]/.test(cleaned)) return null;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Currency symbol authored on any rate / price cell; defaults to "$". */
export function currencyOf(rows: ProposalCostRow[]): string {
  for (const r of rows) {
    const m = `${r.rate ?? ""}${r.price ?? ""}`.match(/[$€£¥]/);
    if (m) return m[0];
  }
  return "$";
}

export function formatMoney(value: number, symbol = "$"): string {
  return `${symbol}${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export type CostLine = {
  row: ProposalCostRow;
  /** Computed amount when the maths resolve, else null (authored text shown). */
  amount: number | null;
  /** What the Investment cell should print. */
  display: string;
  /** True when the amount came from volume × rate rather than a typed price. */
  derived: boolean;
};

/**
 * Line amount = volume × rate when both parse; otherwise the authored price.
 */
export function computeCostLines(rows: ProposalCostRow[], symbol = "$"): CostLine[] {
  return rows.map((row) => {
    const qty = parseAmount(row.qty);
    const rate = parseAmount(row.rate);
    if (qty !== null && rate !== null) {
      const amount = qty * rate;
      return { row, amount, display: formatMoney(amount, symbol), derived: true };
    }
    const priced = parseAmount(row.price);
    if (priced !== null) {
      return { row, amount: priced, display: formatMoney(priced, symbol), derived: false };
    }
    return { row, amount: null, display: row.price ?? "", derived: false };
  });
}

export type CostTotals = { total: number; hasNumbers: boolean; display: string };

export function computeCostTotal(lines: CostLine[], symbol = "$"): CostTotals {
  const nums = lines.map((l) => l.amount).filter((n): n is number => n !== null);
  const total = nums.reduce((a, b) => a + b, 0);
  return { total, hasNumbers: nums.length > 0, display: formatMoney(total, symbol) };
}

/** Blank line used by the editor's "Add line" affordance. */
export function blankCostRow(): ProposalCostRow {
  return { item: "New service", qty: "1", rate: "0.00", price: "" };
}
