// Draws a module's own icon beside a carried point / tile on adaptor sizes.
import { pickIcon } from "@/components/slide/VariantRenderer";

/** Find the icon for a carried point, tolerating fit-trimmed text ("…"). */
export function iconFor(icons: Record<string, string> | undefined, text: string): string | undefined {
  if (!icons) return undefined;
  if (icons[text]) return icons[text];
  const stem = text.replace(/[…\s.]+$/, "").trim();
  if (stem.length < 4) return undefined;
  const lead = stem.split(" — ")[0];
  for (const [k, v] of Object.entries(icons)) if (k.startsWith(stem) || k.split(" — ")[0] === lead) return v;
  return undefined;
}

export function AdaptIcon({ name, label, size, color }: { name: string; label: string; size: number; color: string }) {
  const Icon = pickIcon(label, 0, name) as unknown as React.ComponentType<{ size?: number; color?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
  return (
    <span data-adapt-icon={name} style={{ display: "inline-flex", flex: "none", width: size, height: size }}>
      <Icon size={size} color={color} strokeWidth={2} aria-hidden />
    </span>
  );
}
