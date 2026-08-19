// Full-width CTA band — the closing lockup on every curated print piece.
import type { PrintContactSection } from "@/lib/print-assets.types";
import { cq, sectionInk } from "../shared";
import { EditableIcon } from "@/components/print/PrintIconEdit";
import { usePrintIcons } from "@/components/print/print-doc-mode";

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
  const icons = usePrintIcons();
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
            className="inline-flex items-center"
            style={{
              gap: cq(7),
              padding: `${cq(8)} ${cq(16)}`,
              borderRadius: cq(999),
              background: accent,
              color: "#FFFFFF",
              fontSize: cq(10),
              fontWeight: 700,
              letterSpacing: "-0.005em",
            }}
          >
            {icons ? (
              <EditableIcon
                slot={`sec.${section.id}.cta`}
                name="mail"
                size={cq(11)}
                color="#FFFFFF"
                strokeWidth={1.9}
              />
            ) : null}
            {section.ctaLabel ?? "Talk to us"}
          </div>
          {section.url && (
            <div
              className="flex items-center justify-end"
              style={{ gap: cq(5), marginTop: cq(6), fontSize: cq(9), color: ink.faint }}
            >
              {icons ? (
                <EditableIcon
                  slot={`sec.${section.id}.url`}
                  name="link"
                  label="Website"
                  size={cq(9)}
                  color={accent}
                  strokeWidth={1.9}
                />
              ) : null}
              {section.url}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
