// Shared form furniture for the look/template editors.
import type { ReactNode } from "react";

export const inputCls =
  "mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-[#003FC7] dark:border-white/15 dark:bg-transparent";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-xs">
      <span className="font-medium">{label}</span>
      {hint && <span className="ml-2 opacity-55">{hint}</span>}
      {children}
    </label>
  );
}

export const PALETTE_LABELS = ["Page field", "Ink", "Accent", "Accent alt", "Support"];
export const DENSITIES = ["Low", "Medium", "High"];
