/**
 * PRINT VARIANT PICKER — per-surface style swapping
 * ---------------------------------------------------------------------------
 * One compact control that swaps the three style axes of a print surface —
 * hero lockup, title style, body style (plus the masthead rule) — without
 * touching authored content or rebuilding the layout. Used by the document
 * masthead panel and by every modular hero section inspector, so the same
 * chips behave the same way wherever a surface is edited.
 */

import type { PrintHeroModuleVariant, PrintHeroRule, PrintHeroTitleType } from "@/lib/print-assets.types";
import { PRINT_HERO_VARIANTS } from "./sections/PrintSectionRenderer";
import {
  PRINT_BODY_STYLE_PRESETS,
  PRINT_RULE_STYLE_PRESETS,
  PRINT_TITLE_STYLE_PRESETS,
  applyBodyStylePreset,
  applyRuleStylePreset,
  applyTitleStylePreset,
  matchBodyStylePreset,
  matchRuleStylePreset,
  matchTitleStylePreset,
} from "@/lib/print-style-presets";

type Props = {
  /** Current hero lockup. Omit to hide the lockup row (non-hero surfaces). */
  heroVariant?: PrintHeroModuleVariant;
  onHeroVariant?: (id: PrintHeroModuleVariant) => void;
  titleType: PrintHeroTitleType | undefined;
  rule: PrintHeroRule | undefined;
  /** Patch callback — only the changed axis is sent. */
  onChange: (next: { titleType?: PrintHeroTitleType; rule?: PrintHeroRule }) => void;
  /** Label for the surface being styled, shown in the header. */
  surfaceLabel?: string;
  accent?: string;
};

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/50 dark:text-white/50">
          {label}
        </p>
        {hint ? (
          <span className="text-[10px] text-black/40 dark:text-white/40">{hint}</span>
        ) : null}
      </div>
      <div className="mt-1 flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function Chip({
  on,
  label,
  title,
  accent,
  onClick,
  style,
}: {
  on: boolean;
  label: string;
  title?: string;
  accent: string;
  onClick: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={on}
      className="rounded-full border px-2.5 py-1 text-[11px] font-medium transition hover:border-black/30 dark:hover:border-white/30"
      style={{
        ...(on
          ? { background: accent, borderColor: accent, color: "#fff" }
          : { borderColor: "rgba(0,0,0,0.14)" }),
        ...style,
      }}
    >
      {label}
    </button>
  );
}

export function PrintVariantPicker({
  heroVariant,
  onHeroVariant,
  titleType,
  rule,
  onChange,
  surfaceLabel = "This surface",
  accent = "#003FC7",
}: Props) {
  const titleId = matchTitleStylePreset(titleType);
  const bodyId = matchBodyStylePreset(titleType);
  const ruleId = matchRuleStylePreset(rule);

  return (
    <div
      className="space-y-2.5 rounded-lg border border-black/10 p-2.5 dark:border-white/10"
      data-testid="print-variant-picker"
    >
      <p className="text-[11px] leading-snug text-black/55 dark:text-white/55">
        {surfaceLabel} — swap a look; copy, photos and module order stay exactly as authored.
      </p>

      {heroVariant && onHeroVariant ? (
        <Row label="Hero lockup" hint={`${PRINT_HERO_VARIANTS.length} options`}>
          {PRINT_HERO_VARIANTS.map((v) => (
            <Chip
              key={v.id}
              on={v.id === heroVariant}
              label={v.label}
              title={v.description}
              accent={accent}
              onClick={() => onHeroVariant(v.id)}
            />
          ))}
        </Row>
      ) : null}

      <Row label="Title style" hint={titleId ? undefined : "custom"}>
        {PRINT_TITLE_STYLE_PRESETS.map((p) => (
          <Chip
            key={p.id}
            on={p.id === titleId}
            label={p.label}
            title={p.desc}
            accent={accent}
            onClick={() => onChange({ titleType: applyTitleStylePreset(titleType, p.id) })}
            style={{
              fontWeight: p.type.titleWeight && p.type.titleWeight >= 700 ? 700 : 500,
              textTransform: p.type.titleCase === "upper" ? "uppercase" : "none",
            }}
          />
        ))}
      </Row>

      <Row label="Body style" hint={bodyId ? undefined : "custom"}>
        {PRINT_BODY_STYLE_PRESETS.map((p) => (
          <Chip
            key={p.id}
            on={p.id === bodyId}
            label={p.label}
            title={p.desc}
            accent={accent}
            onClick={() => onChange({ titleType: applyBodyStylePreset(titleType, p.id) })}
          />
        ))}
      </Row>

      <Row label="Masthead rule" hint={ruleId ? undefined : "custom"}>
        {PRINT_RULE_STYLE_PRESETS.map((p) => (
          <Chip
            key={p.id}
            on={p.id === ruleId}
            label={p.label}
            title={p.desc}
            accent={accent}
            onClick={() => onChange({ rule: applyRuleStylePreset(rule, p.id) })}
          />
        ))}
      </Row>
    </div>
  );
}
