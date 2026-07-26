/**
 * Page color override control for the print asset editor.
 *
 * The division brand supplies accent + primary tokens; this panel lets a user
 * override either one per page (swatch, native color picker, or typed hex) and
 * reset back to the division default. Values are persisted on the asset
 * context as `accentOverride` / `primaryOverride`.
 */

import { useEffect, useState } from "react";

const BRAND_SWATCHES: { label: string; hex: string }[] = [
  { label: "Blue 500", hex: "#003FC7" },
  { label: "Blue 800", hex: "#03002C" },
  { label: "Aqua", hex: "#A1FBF9" },
  { label: "Lavender", hex: "#C2A3FF" },
  { label: "Yellow", hex: "#FFEB66" },
  { label: "Green", hex: "#A6FA87" },
  { label: "Peach", hex: "#FF9B70" },
  { label: "Pink", hex: "#EC388A" },
  { label: "Red", hex: "#E53D2E" },
];

const HEX6 = /^#[0-9a-fA-F]{6}$/;

/** Accepts "003FC7" or "#003fc7"; returns a normalized #rrggbb or null. */
export function normalizeHex(raw: string): string | null {
  const v = raw.trim();
  const withHash = v.startsWith("#") ? v : `#${v}`;
  return HEX6.test(withHash) ? withHash.toLowerCase() : null;
}

function ColorRow({
  label,
  value,
  fallback,
  onChange,
  testId,
}: {
  label: string;
  /** Current override, or undefined when inheriting the division token. */
  value: string | undefined;
  /** Division token shown when no override is set. */
  fallback: string;
  onChange: (hex: string | null) => void;
  testId: string;
}) {
  const effective = value ?? fallback;
  const [draft, setDraft] = useState(effective);

  // Keep the text input in sync when the value changes elsewhere (swatch,
  // native picker, reset) without fighting the user mid-typing.
  useEffect(() => {
    setDraft(effective);
  }, [effective]);

  function commitDraft(raw: string) {
    const hex = normalizeHex(raw);
    if (hex) onChange(hex);
    else setDraft(effective);
  }

  return (
    <div className="space-y-2 py-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-black/60 dark:text-white/60">{label}</span>
        {value ? (
          <button
            type="button"
            data-testid={`${testId}-reset`}
            onClick={() => onChange(null)}
            title="Reset to the division default"
            className="rounded-full border border-black/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-black/55 transition hover:border-red-500 hover:text-red-600 dark:border-white/15 dark:text-white/55"
          >
            Reset
          </button>
        ) : (
          <span className="text-[9px] uppercase tracking-widest text-black/35 dark:text-white/35">
            Division default
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {BRAND_SWATCHES.map((sw) => (
          <button
            key={sw.hex}
            type="button"
            title={`${sw.label} · ${sw.hex}`}
            aria-label={`${label}: ${sw.label}`}
            aria-pressed={effective.toLowerCase() === sw.hex.toLowerCase()}
            onClick={() => onChange(sw.hex)}
            className={`h-5 w-5 rounded-full border transition hover:scale-110 ${
              effective.toLowerCase() === sw.hex.toLowerCase()
                ? "border-[#003FC7] ring-2 ring-[#003FC7]/40"
                : "border-black/20 dark:border-white/25"
            }`}
            style={{ background: sw.hex }}
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="color"
          data-testid={`${testId}-picker`}
          aria-label={`${label} color picker`}
          value={effective}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-9 cursor-pointer rounded-md border border-black/10 bg-white p-0.5 dark:border-white/15 dark:bg-white/[0.06]"
        />
        <input
          type="text"
          data-testid={`${testId}-hex`}
          aria-label={`${label} hex value`}
          value={draft}
          spellCheck={false}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commitDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitDraft((e.target as HTMLInputElement).value);
            if (e.key === "Escape") setDraft(effective);
          }}
          placeholder="#003FC7"
          className="w-24 rounded-md border border-black/10 bg-white px-2 py-1 font-mono text-[11px] uppercase text-black/80 outline-none focus:border-[#003FC7] dark:border-white/15 dark:bg-white/[0.06] dark:text-white/80"
        />
      </div>
    </div>
  );
}

export function PageColorOverridePanel({
  accentOverride,
  primaryOverride,
  brandAccent,
  brandPrimary,
  onChange,
}: {
  accentOverride?: string;
  primaryOverride?: string;
  brandAccent: string;
  brandPrimary: string;
  onChange: (patch: { accentOverride?: string; primaryOverride?: string }) => void;
}) {
  return (
    <div data-testid="page-color-override-panel" className="space-y-2">
      <ColorRow
        label="Accent"
        testId="page-color-accent"
        value={accentOverride}
        fallback={brandAccent}
        onChange={(hex) => onChange({ accentOverride: hex ?? undefined })}
      />
      <div className="h-px bg-black/5 dark:bg-white/10" />
      <ColorRow
        label="Primary"
        testId="page-color-primary"
        value={primaryOverride}
        fallback={brandPrimary}
        onChange={(hex) => onChange({ primaryOverride: hex ?? undefined })}
      />
      <p className="pt-1 text-[10px] leading-relaxed text-black/45 dark:text-white/45">
        Overrides apply to this page only — headers, rules, stat chips, CTA band and the hero wash.
      </p>
    </div>
  );
}
