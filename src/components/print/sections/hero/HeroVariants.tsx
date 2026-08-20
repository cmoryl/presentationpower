// HERO SECTION MODULES
// ---------------------------------------------------------------------------
// Page-opening lockups, portrait-native and cq-scaled like every other print
// section. Six treatments lifted from the curated collateral: full-bleed photo
// band, split photo, typographic stack, accent band, stat lockup, and the
// case-study client lockup.

import type { PrintHeroSection } from "@/lib/print-assets.types";
import { cq, sectionInk, sectionGlass } from "../shared";
import { clampLines } from "@/components/print/print-primitives";

type Props = {
  section: PrintHeroSection;
  mode: "light" | "dark";
  accent: string;
};

const EYEBROW = (accent: string, size = 9.5) =>
  ({
    fontSize: cq(size),
    fontWeight: 700,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: accent,
  }) as const;

function MetaRail({
  section,
  mode,
  accent,
  onDark,
}: Props & { onDark?: boolean }) {
  const rows = section.meta ?? [];
  if (!rows.length) return null;
  const ink = sectionInk(mode);
  const label = onDark ? "rgba(255,255,255,0.68)" : ink.faint;
  const value = onDark ? "#FFFFFF" : ink.strong;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: `${cq(6)} ${cq(18)}`,
        marginTop: cq(14),
      }}
    >
      {rows.map((r, i) => (
        <div key={i} style={{ display: "grid", gap: cq(2) }}>
          <span
            style={{
              fontSize: cq(8),
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: onDark ? "rgba(255,255,255,0.62)" : accent,
            }}
          >
            {r.label}
          </span>
          {r.value ? (
            <span style={{ fontSize: cq(10.5), fontWeight: 600, color: value }}>{r.value}</span>
          ) : (
            <span style={{ fontSize: cq(10.5), color: label }}>—</span>
          )}
        </div>
      ))}
    </div>
  );
}

function bg(section: PrintHeroSection) {
  return {
    backgroundImage: section.imageUrl ? `url(${section.imageUrl})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: `${section.focalX ?? 50}% ${section.focalY ?? 50}%`,
    backgroundColor: "#03002C",
  } as const;
}

/** 1 — Full-bleed photo band with the copy set over a bottom scrim. */
export function HeroPhotoBand({ section, mode, accent }: Props) {
  return (
    <section aria-label="Hero" style={{ margin: `${cq(4)} 0 ${cq(18)}` }}>
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: cq(18),
          height: cq(268),
          ...bg(section),
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(3,0,44,0.10) 0%, rgba(3,0,44,0.28) 42%, rgba(3,0,44,0.86) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: cq(28),
            right: cq(28),
            bottom: cq(24),
            textAlign: section.align === "center" ? "center" : "left",
          }}
        >
          {section.eyebrow && (
            <div style={{ ...EYEBROW("#FFFFFF"), opacity: 0.86, marginBottom: cq(8) }}>
              {section.eyebrow}
            </div>
          )}
          <h2
            style={{
              margin: 0,
              fontSize: cq(34),
              lineHeight: 1.04,
              letterSpacing: "-0.03em",
              fontWeight: 700,
              color: "#FFFFFF",
              ...clampLines(3),
            }}
          >
            {section.title}
          </h2>
          {section.summary && (
            <p
              style={{
                margin: `${cq(10)} 0 0`,
                maxWidth: cq(520),
                marginInline: section.align === "center" ? "auto" : undefined,
                fontSize: cq(12),
                lineHeight: 1.5,
                color: "rgba(255,255,255,0.86)",
                ...clampLines(3),
              }}
            >
              {section.summary}
            </p>
          )}
          <div
            style={{
              height: cq(3),
              width: cq(64),
              marginTop: cq(14),
              marginInline: section.align === "center" ? "auto" : undefined,
              background: accent,
              borderRadius: cq(2),
            }}
          />
          <MetaRail section={section} mode={mode} accent={accent} onDark />
        </div>
      </div>
    </section>
  );
}

/** 2 — Split hero: photo panel beside a copy column. */
export function HeroSplitPhoto({ section, mode, accent }: Props) {
  const ink = sectionInk(mode);
  const photo = (
    <div
      style={{
        borderRadius: cq(16),
        overflow: "hidden",
        minHeight: cq(220),
        ...bg(section),
      }}
    />
  );
  const copy = (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
      {section.kicker && (
        <div style={{ ...EYEBROW(ink.faint, 8.5), marginBottom: cq(6) }}>{section.kicker}</div>
      )}
      {section.eyebrow && (
        <div style={{ ...EYEBROW(accent), marginBottom: cq(8) }}>{section.eyebrow}</div>
      )}
      <h2
        style={{
          margin: 0,
          fontSize: cq(28),
          lineHeight: 1.06,
          letterSpacing: "-0.03em",
          fontWeight: 700,
          color: ink.strong,
          ...clampLines(4),
        }}
      >
        {section.title}
      </h2>
      {section.summary && (
        <p
          style={{
            margin: `${cq(10)} 0 0`,
            fontSize: cq(11.5),
            lineHeight: 1.55,
            color: ink.soft,
            ...clampLines(5),
          }}
        >
          {section.summary}
        </p>
      )}
      <MetaRail section={section} mode={mode} accent={accent} />
    </div>
  );
  return (
    <section aria-label="Hero" style={{ margin: `${cq(4)} 0 ${cq(18)}` }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: cq(22),
          alignItems: "stretch",
        }}
      >
        {section.reverse ? (
          <>
            {copy}
            {photo}
          </>
        ) : (
          <>
            {photo}
            {copy}
          </>
        )}
      </div>
    </section>
  );
}

/** 3 — Typographic stack: no photography, oversized title over a rule. */
export function HeroTypeStack({ section, mode, accent }: Props) {
  const ink = sectionInk(mode);
  const centered = section.align === "center";
  return (
    <section
      aria-label="Hero"
      style={{
        margin: `${cq(6)} 0 ${cq(20)}`,
        textAlign: centered ? "center" : "left",
        borderTop: `${cq(3)} solid ${accent}`,
        paddingTop: cq(18),
      }}
    >
      {section.eyebrow && (
        <div style={{ ...EYEBROW(accent), marginBottom: cq(10) }}>{section.eyebrow}</div>
      )}
      <h2
        style={{
          margin: 0,
          fontSize: cq(44),
          lineHeight: 0.98,
          letterSpacing: "-0.04em",
          fontWeight: 700,
          color: ink.strong,
          ...clampLines(3),
        }}
      >
        {section.title}
      </h2>
      {section.summary && (
        <p
          style={{
            margin: `${cq(14)} ${centered ? "auto" : "0"} 0`,
            maxWidth: cq(560),
            fontSize: cq(13),
            lineHeight: 1.55,
            color: ink.soft,
            ...clampLines(4),
          }}
        >
          {section.summary}
        </p>
      )}
      <MetaRail section={section} mode={mode} accent={accent} />
    </section>
  );
}

/** 4 — Accent band: solid brand band, reversed type. */
export function HeroAccentBand({ section, mode, accent }: Props) {
  return (
    <section aria-label="Hero" style={{ margin: `${cq(4)} 0 ${cq(18)}` }}>
      <div
        style={{
          borderRadius: cq(18),
          padding: `${cq(30)} ${cq(30)} ${cq(28)}`,
          background: `linear-gradient(135deg, ${accent} 0%, color-mix(in srgb, ${accent} 55%, #03002C) 100%)`,
          textAlign: section.align === "center" ? "center" : "left",
        }}
      >
        {section.eyebrow && (
          <div style={{ ...EYEBROW("rgba(255,255,255,0.82)"), marginBottom: cq(10) }}>
            {section.eyebrow}
          </div>
        )}
        <h2
          style={{
            margin: 0,
            fontSize: cq(32),
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            fontWeight: 700,
            color: "#FFFFFF",
            ...clampLines(3),
          }}
        >
          {section.title}
        </h2>
        {section.summary && (
          <p
            style={{
              margin: `${cq(12)} ${section.align === "center" ? "auto" : "0"} 0`,
              maxWidth: cq(540),
              fontSize: cq(12),
              lineHeight: 1.55,
              color: "rgba(255,255,255,0.88)",
              ...clampLines(4),
            }}
          >
            {section.summary}
          </p>
        )}
        <MetaRail section={section} mode={mode} accent={accent} onDark />
      </div>
    </section>
  );
}

/** 5 — Hero + inline proof numbers along the bottom edge. */
export function HeroStatLockup({ section, mode, accent }: Props) {
  const ink = sectionInk(mode);
  const stats = (section.stats ?? []).slice(0, 4);
  return (
    <section aria-label="Hero" style={{ margin: `${cq(4)} 0 ${cq(18)}` }}>
      <div
        style={{
          borderRadius: cq(18),
          padding: `${cq(26)} ${cq(28)} ${cq(20)}`,
          ...sectionGlass(mode, accent),
        }}
      >
        {section.eyebrow && (
          <div style={{ ...EYEBROW(accent), marginBottom: cq(8) }}>{section.eyebrow}</div>
        )}
        <h2
          style={{
            margin: 0,
            fontSize: cq(30),
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            fontWeight: 700,
            color: ink.strong,
            ...clampLines(3),
          }}
        >
          {section.title}
        </h2>
        {section.summary && (
          <p
            style={{
              margin: `${cq(10)} 0 0`,
              maxWidth: cq(560),
              fontSize: cq(11.5),
              lineHeight: 1.55,
              color: ink.soft,
              ...clampLines(3),
            }}
          >
            {section.summary}
          </p>
        )}
        {stats.length > 0 && (
          <div
            style={{
              marginTop: cq(18),
              paddingTop: cq(14),
              borderTop: `1px solid ${ink.hairline}`,
              display: "grid",
              gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))`,
              gap: cq(16),
            }}
          >
            {stats.map((s, i) => (
              <div key={i}>
                <div
                  style={{
                    fontSize: cq(24),
                    fontWeight: 700,
                    letterSpacing: "-0.03em",
                    color: accent,
                    lineHeight: 1,
                  }}
                >
                  {s.value}
                  {s.unit && <span style={{ fontSize: cq(14) }}>{s.unit}</span>}
                </div>
                <div
                  style={{
                    marginTop: cq(6),
                    fontSize: cq(9),
                    lineHeight: 1.4,
                    color: ink.faint,
                    ...clampLines(2),
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/** 6 — Case-study client lockup: client rule, subject, engagement summary. */
export function HeroClientLockup({ section, mode, accent }: Props) {
  const ink = sectionInk(mode);
  return (
    <section aria-label="Hero" style={{ margin: `${cq(6)} 0 ${cq(18)}` }}>
      <div style={{ display: "grid", gridTemplateColumns: `${cq(150)} 1fr`, gap: cq(22) }}>
        <div style={{ borderTop: `${cq(3)} solid ${accent}`, paddingTop: cq(12) }}>
          {section.eyebrow && <div style={EYEBROW(accent, 8.5)}>{section.eyebrow}</div>}
          {section.kicker && (
            <div
              style={{
                marginTop: cq(8),
                fontSize: cq(15),
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: ink.strong,
                ...clampLines(2),
              }}
            >
              {section.kicker}
            </div>
          )}
          <MetaRail section={section} mode={mode} accent={accent} />
        </div>
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: cq(30),
              lineHeight: 1.06,
              letterSpacing: "-0.03em",
              fontWeight: 700,
              color: ink.strong,
              ...clampLines(4),
            }}
          >
            {section.title}
          </h2>
          {section.summary && (
            <p
              style={{
                margin: `${cq(12)} 0 0`,
                fontSize: cq(11.5),
                lineHeight: 1.55,
                color: ink.soft,
                ...clampLines(5),
              }}
            >
              {section.summary}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
