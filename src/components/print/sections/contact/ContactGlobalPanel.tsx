// Global contacts panel — the MSA footer: primary contact plus a region rail.
import type { PrintContactSection } from "@/lib/print-assets.types";
import { cq, sectionInk } from "../shared";

export function ContactGlobalPanel({
  section,
  mode,
  accent,
}: {
  section: PrintContactSection;
  mode: "light" | "dark";
  accent: string;
}) {
  const ink = sectionInk(mode);
  const rows = (section.rows ?? []).slice(0, 6);
  return (
    <section aria-label={section.title ?? "Global contacts"} style={{ margin: `${cq(18)} 0` }}>
      <div
        style={{
          borderRadius: cq(14),
          padding: `${cq(16)} ${cq(18)}`,
          background:
            mode === "dark"
              ? `linear-gradient(135deg, color-mix(in srgb, ${accent} 26%, #03002C), #03002C)`
              : `linear-gradient(135deg, color-mix(in srgb, ${accent} 16%, #03002C), #03002C)`,
        }}
      >
        <div
          className="grid"
          style={{ gridTemplateColumns: rows.length ? "0.9fr 1.1fr" : "1fr", gap: cq(16) }}
        >
          <div>
            <div
              style={{
                fontSize: cq(8.8),
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: `color-mix(in srgb, ${accent} 70%, #FFFFFF)`,
              }}
            >
              {section.eyebrow ?? "Global contacts"}
            </div>
            <div
              style={{
                marginTop: cq(5),
                fontSize: cq(15),
                fontWeight: 700,
                color: "#FFFFFF",
                letterSpacing: "-0.015em",
              }}
            >
              {section.title ?? section.name ?? "Talk to your account team"}
            </div>
            {section.role && (
              <div
                style={{ marginTop: cq(3), fontSize: cq(9.6), color: "rgba(255,255,255,0.72)" }}
              >
                {section.role}
              </div>
            )}
            {section.body && (
              <div
                style={{
                  marginTop: cq(7),
                  fontSize: cq(9.6),
                  lineHeight: 1.5,
                  color: "rgba(255,255,255,0.78)",
                }}
              >
                {section.body}
              </div>
            )}
            <div style={{ marginTop: cq(8) }}>
              {section.email && (
                <div style={{ fontSize: cq(9.6), fontWeight: 700, color: "#FFFFFF" }}>
                  {section.email}
                </div>
              )}
              {section.phone && (
                <div style={{ fontSize: cq(9.2), color: "rgba(255,255,255,0.72)" }}>
                  {section.phone}
                </div>
              )}
              {section.url && (
                <div
                  style={{
                    marginTop: cq(4),
                    fontSize: cq(9),
                    color: `color-mix(in srgb, ${accent} 72%, #FFFFFF)`,
                  }}
                >
                  {section.url}
                </div>
              )}
            </div>
          </div>
          {rows.length > 0 && (
            <div>
              {rows.map((r, i) => (
                <div
                  key={i}
                  className="flex items-baseline justify-between"
                  style={{
                    gap: cq(10),
                    padding: `${cq(7)} 0`,
                    borderTop:
                      i === 0 ? "none" : "1px solid rgba(255,255,255,0.16)",
                  }}
                >
                  <span
                    style={{ fontSize: cq(9.6), fontWeight: 600, color: "#FFFFFF" }}
                  >
                    {r.label}
                  </span>
                  <span style={{ fontSize: cq(9.2), color: "rgba(255,255,255,0.72)" }}>
                    {r.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="hidden" aria-hidden style={{ color: ink.faint }} />
    </section>
  );
}
