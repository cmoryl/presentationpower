// Full-width CTA band — the closing lockup on every curated print piece.
import type { PrintContactSection } from "@/lib/print-assets.types";
import { cq, sectionInk } from "../shared";

export function ContactCtaBand({
  section,
  mode,
  accent,
}: {
  section: PrintContactSection;
  mode: "light" | "dark";
  accent: string;
}) {
  const ink = sectionInk(mode);
  return (
    <section aria-label={section.title ?? "Call to action"} style={{ margin: `${cq(18)} 0` }}>
      <div
        className="flex items-center justify-between"
        style={{
          gap: cq(16),
          borderRadius: cq(14),
          padding: `${cq(15)} ${cq(18)}`,
          background: `color-mix(in srgb, ${accent} ${mode === "dark" ? 26 : 14}%, ${mode === "dark" ? "#03002C" : "#FFFFFF"})`,
          border: `1px solid color-mix(in srgb, ${accent} 34%, transparent)`,
        }}
      >
        <div style={{ minWidth: 0 }}>
          {section.eyebrow && (
            <div
              style={{
                fontSize: cq(8.6),
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: accent,
              }}
            >
              {section.eyebrow}
            </div>
          )}
          <div
            style={{
              marginTop: cq(4),
              fontSize: cq(15),
              fontWeight: 700,
              color: ink.strong,
              letterSpacing: "-0.02em",
            }}
          >
            {section.title ?? "Ready to go global?"}
          </div>
          {section.body && (
            <div style={{ marginTop: cq(5), fontSize: cq(9.8), lineHeight: 1.5, color: ink.soft }}>
              {section.body}
            </div>
          )}
        </div>
        <div className="text-right" style={{ flexShrink: 0 }}>
          <div
            style={{
              display: "inline-block",
              padding: `${cq(8)} ${cq(16)}`,
              borderRadius: cq(999),
              background: accent,
              color: "#FFFFFF",
              fontSize: cq(10),
              fontWeight: 700,
              letterSpacing: "-0.005em",
            }}
          >
            {section.ctaLabel ?? "Talk to us"}
          </div>
          {section.url && (
            <div style={{ marginTop: cq(6), fontSize: cq(9), color: ink.faint }}>{section.url}</div>
          )}
        </div>
      </div>
    </section>
  );
}
