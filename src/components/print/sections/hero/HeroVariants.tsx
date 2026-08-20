// HERO SECTION MODULES
// ---------------------------------------------------------------------------
// Page-opening lockups, portrait-native and cq-scaled like every other print
// section. Six treatments lifted from the curated collateral: full-bleed photo
// band, split photo, typographic stack, accent band, stat lockup, and the
// case-study client lockup.

import type { PrintHeroSection } from "@/lib/print-assets.types";
import { cq, sectionInk, pageBleed, pageGutter } from "../shared";
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

/**
 * 1 — Photo masthead: the top band of the printed page. Runs to the trim on
 * three sides, sits flush with the top of the sheet, and sets the title over a
 * bottom scrim inside the page's own margin.
 */
export function HeroPhotoBand({ section, mode, accent }: Props) {
  const ink = sectionInk(mode);
  return (
    <section aria-label="Hero" style={{ ...pageBleed(), marginBottom: cq(20) }}>
      <div style={{ position: "relative", overflow: "hidden", height: cq(300), ...bg(section) }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(3,0,44,0.14) 0%, rgba(3,0,44,0.30) 44%, rgba(3,0,44,0.88) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: cq(26),
            ...pageGutter(),
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
              fontSize: cq(33),
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
                fontSize: cq(11.5),
                lineHeight: 1.5,
                color: "rgba(255,255,255,0.86)",
                ...clampLines(3),
              }}
            >
              {section.summary}
            </p>
          )}
        </div>
      </div>
      {/* Masthead rule: where the band ends and the document body begins. */}
      <div style={{ ...pageGutter() }}>
        <div style={{ height: cq(3), background: accent }} />
        <div style={{ borderBottom: `1px solid ${ink.hairline}`, paddingBottom: cq(2) }} />
        <MetaRail section={section} mode={mode} accent={accent} />
      </div>
    </section>
  );
}

/**
 * 2 — Split masthead: photo panel bled to one page edge with the title block
 * set in the opposite margin — the standard case-study opener.
 */
export function HeroSplitPhoto({ section, mode, accent }: Props) {
  const ink = sectionInk(mode);
  const reverse = Boolean(section.reverse);
  const photo = (
    <div
      style={{
        minHeight: cq(272),
        ...bg(section),
        marginLeft: reverse ? 0 : `calc(-1 * var(--print-page-pad, 0px))`,
        marginRight: reverse ? `calc(-1 * var(--print-page-pad, 0px))` : 0,
      }}
    />
  );
  const copy = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        paddingTop: cq(6),
      }}
    >
      {section.eyebrow && (
        <div
          style={{
            ...EYEBROW(accent),
            paddingBottom: cq(8),
            marginBottom: cq(10),
            borderBottom: `1px solid ${ink.hairline}`,
          }}
        >
          {section.eyebrow}
        </div>
      )}
      {section.kicker && (
        <div style={{ ...EYEBROW(ink.faint, 8.5), marginBottom: cq(6) }}>{section.kicker}</div>
      )}
      <h2
        style={{
          margin: 0,
          fontSize: cq(27),
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
            fontSize: cq(11),
            lineHeight: 1.55,
            color: ink.soft,
            ...clampLines(6),
          }}
        >
          {section.summary}
        </p>
      )}
      <MetaRail section={section} mode={mode} accent={accent} />
    </div>
  );
  return (
    <section aria-label="Hero" style={{ marginTop: `calc(-1 * var(--print-page-pad-top, 0px))` }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: cq(24),
          alignItems: "stretch",
          marginBottom: cq(20),
        }}
      >
        {reverse ? (
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
      <div style={{ borderTop: `${cq(2)} solid ${accent}` }} />
    </section>
  );
}

/** 3 — Typographic masthead: rules above and below a document title block. */
export function HeroTypeStack({ section, mode, accent }: Props) {
  const ink = sectionInk(mode);
  const centered = section.align === "center";
  return (
    <section
      aria-label="Hero"
      style={{
        marginBottom: cq(22),
        textAlign: centered ? "center" : "left",
        borderTop: `${cq(4)} solid ${accent}`,
        borderBottom: `1px solid ${ink.hairline}`,
        paddingTop: cq(16),
        paddingBottom: cq(18),
      }}
    >
      {section.eyebrow && (
        <div style={{ ...EYEBROW(accent), marginBottom: cq(10) }}>{section.eyebrow}</div>
      )}
      <h2
        style={{
          margin: 0,
          fontSize: cq(40),
          lineHeight: 1,
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
            maxWidth: cq(540),
            fontSize: cq(12),
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

/** 4 — Accent masthead: solid brand band bled to the page trim, reversed type. */
export function HeroAccentBand({ section, mode, accent }: Props) {
  return (
    <section aria-label="Hero" style={{ ...pageBleed(), marginBottom: cq(22) }}>
      <div
        style={{
          background: `linear-gradient(135deg, ${accent} 0%, color-mix(in srgb, ${accent} 55%, #03002C) 100%)`,
          paddingTop: cq(34),
          paddingBottom: cq(30),
          ...pageGutter(),
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
              fontSize: cq(11.5),
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

/** 5 — Title block with the proof numbers ruled off beneath it. */
export function HeroStatLockup({ section, mode, accent }: Props) {
  const ink = sectionInk(mode);
  const stats = (section.stats ?? []).slice(0, 4);
  return (
    <section
      aria-label="Hero"
      style={{ marginBottom: cq(22), borderTop: `${cq(4)} solid ${accent}`, paddingTop: cq(16) }}
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
            paddingBottom: cq(14),
            borderTop: `1px solid ${ink.hairline}`,
            borderBottom: `1px solid ${ink.hairline}`,
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
      <MetaRail section={section} mode={mode} accent={accent} />
    </section>
  );
}

/** 6 — Client lockup: client rule in the margin column, subject to its right. */
export function HeroClientLockup({ section, mode, accent }: Props) {
  const ink = sectionInk(mode);
  return (
    <section
      aria-label="Hero"
      style={{
        marginBottom: cq(22),
        borderTop: `${cq(4)} solid ${accent}`,
        paddingTop: cq(16),
        borderBottom: `1px solid ${ink.hairline}`,
        paddingBottom: cq(18),
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: `${cq(160)} 1fr`, gap: cq(24) }}>
        <div style={{ borderRight: `1px solid ${ink.hairline}`, paddingRight: cq(16) }}>
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
              fontSize: cq(29),
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
                ...clampLines(6),
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

/**
 * 7 — Photo fade masthead: the treatment the shipped Case Study, E-Brochure,
 * Spotlight and Adaptor Brief layouts actually use. The photograph bleeds from
 * the top of the sheet and feathers to nothing into the page stock, so the
 * title sits in the fade seam rather than on a hard-edged band.
 */
export function HeroPhotoFade({ section, mode, accent }: Props) {
  const ink = sectionInk(mode);
  const page = mode === "dark" ? "#03002C" : "#FFFFFF";
  const bandH = cq(Math.round(((section.heightPct ?? 46) / 100) * 1056));
  return (
    <section aria-label="Hero" style={{ ...pageBleed(), marginBottom: cq(18) }}>
      <div style={{ position: "relative", minHeight: bandH }}>
        {/* Photo layer, feathered to zero alpha over its bottom third. */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            ...bg(section),
            WebkitMaskImage:
              "linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 44%, rgba(0,0,0,0.78) 62%, rgba(0,0,0,0.35) 80%, rgba(0,0,0,0) 96%)",
            maskImage:
              "linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 44%, rgba(0,0,0,0.78) 62%, rgba(0,0,0,0.35) 80%, rgba(0,0,0,0) 96%)",
          }}
        />
        {/* Page-coloured fade so the seam resolves into the paper. */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(180deg, rgba(3,0,44,0.16) 0%, transparent 26%, color-mix(in srgb, ${page} 55%, transparent) 58%, ${page} 84%)`,
          }}
        />
        <div
          style={{
            position: "relative",
            ...pageGutter(),
            paddingTop: `calc(${bandH} * 0.78)`,
            paddingBottom: cq(6),
            display: "flex",
            flexDirection: "column",
          }}
        >
          {section.eyebrow && (
            <div style={{ ...EYEBROW(accent), marginBottom: cq(10) }}>{section.eyebrow}</div>
          )}

          <h2
            style={{
              margin: 0,
              fontSize: cq(34),
              lineHeight: 1.12,
              letterSpacing: "-0.02em",
              fontWeight: 700,
              color: ink.strong,
              maxWidth: cq(470),
              ...clampLines(3),
            }}
          >
            {section.title}
          </h2>
          {section.summary && (
            <p
              style={{
                margin: `${cq(12)} 0 0`,
                maxWidth: cq(400),
                fontSize: cq(11.5),
                lineHeight: 1.6,
                color: ink.soft,
                ...clampLines(4),
              }}
            >
              {section.summary}
            </p>
          )}
          <MetaRail section={section} mode={mode} accent={accent} />
        </div>
      </div>
    </section>
  );
}

/**
 * 8 — Quote split: the Client Spotlight opener. Title + intro in the left
 * column, the client pull-quote panelled on the right.
 */
export function HeroQuoteSplit({ section, mode, accent }: Props) {
  const ink = sectionInk(mode);
  const q = section.quote;
  return (
    <section
      aria-label="Hero"
      style={{ marginBottom: cq(22), borderTop: `${cq(4)} solid ${accent}`, paddingTop: cq(16) }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: cq(28) }}>
        <div>
          {section.eyebrow && (
            <div style={{ ...EYEBROW(accent), marginBottom: cq(10) }}>{section.eyebrow}</div>
          )}
          {section.kicker && (
            <div style={{ ...EYEBROW(ink.faint, 8.5), marginBottom: cq(6) }}>{section.kicker}</div>
          )}
          <h2
            style={{
              margin: 0,
              fontSize: cq(30),
              lineHeight: 1.12,
              letterSpacing: "-0.02em",
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
                lineHeight: 1.65,
                color: ink.soft,
                ...clampLines(6),
              }}
            >
              {section.summary}
            </p>
          )}
          <MetaRail section={section} mode={mode} accent={accent} />
        </div>
        {q?.text && (
          <div
            style={{
              borderLeft: `${cq(3)} solid ${accent}`,
              paddingLeft: cq(18),
              paddingTop: cq(2),
            }}
          >
            <div
              aria-hidden
              style={{
                fontFamily: "Georgia, serif",
                fontSize: cq(40),
                lineHeight: 0.7,
                fontWeight: 700,
                color: accent,
              }}
            >
              &ldquo;
            </div>
            <p
              style={{
                margin: `${cq(10)} 0 0`,
                fontSize: cq(12.5),
                lineHeight: 1.6,
                color: ink.strong,
                ...clampLines(7),
              }}
            >
              {q.text}
            </p>
            {q.role && (
              <div style={{ ...EYEBROW(accent, 9), marginTop: cq(14) }}>{q.role}</div>
            )}
            {q.author && (
              <div
                style={{ marginTop: cq(2), fontSize: cq(11), fontWeight: 700, color: ink.strong }}
              >
                — {q.author}
                {q.company ? ` · ${q.company}` : ""}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * 9 — Co-brand band: the MSA Partnership cover. Navy→accent band bled to the
 * trim with the two marks locked up centre, a positioning line, and the
 * headline proof numbers boxed along the base.
 */
export function HeroCobrandBand({ section, mode, accent }: Props) {
  const stats = (section.stats ?? []).slice(0, 4);
  return (
    <section aria-label="Hero" style={{ ...pageBleed(), marginBottom: cq(22) }}>
      <div
        style={{
          background: `linear-gradient(118deg, #03002C 0%, ${accent} 62%, color-mix(in srgb, ${accent} 62%, #A1FBF9) 100%)`,
          ...pageGutter(),
          paddingTop: cq(30),
          paddingBottom: cq(30),
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: cq(22),
            minHeight: cq(44),
          }}
        >
          <span
            style={{
              fontSize: cq(20),
              fontWeight: 700,
              letterSpacing: "-0.01em",
              color: "#FFFFFF",
            }}
          >
            {section.kicker ?? "TransPerfect"}
          </span>
          <span aria-hidden style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,0.4)" }} />
          {section.partnerLogoUrl ? (
            <img
              src={section.partnerLogoUrl}
              alt={section.partner ? `${section.partner} logo` : ""}
              style={{
                height: cq(30),
                width: "auto",
                maxWidth: cq(200),
                objectFit: "contain",
                filter: "brightness(0) invert(1)",
              }}
            />
          ) : (
            <span style={{ fontSize: cq(20), fontWeight: 700, color: "#FFFFFF" }}>
              {section.partner ?? "Partner"}
            </span>
          )}
        </div>
        <h2
          style={{
            margin: `${cq(18)} auto 0`,
            maxWidth: cq(560),
            fontSize: cq(22),
            lineHeight: 1.25,
            letterSpacing: "-0.02em",
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
              margin: `${cq(12)} auto 0`,
              maxWidth: cq(540),
              fontSize: cq(11.5),
              lineHeight: 1.55,
              color: "rgba(255,255,255,0.86)",
              ...clampLines(3),
            }}
          >
            {section.summary}
          </p>
        )}
        {stats.length > 0 && (
          <div
            style={{
              marginTop: cq(22),
              display: "grid",
              gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))`,
              gap: cq(10),
            }}
          >
            {stats.map((s, i) => (
              <div
                key={i}
                style={{
                  border: "1px solid rgba(255,255,255,0.42)",
                  background: "rgba(255,255,255,0.06)",
                  padding: `${cq(14)} ${cq(8)}`,
                }}
              >
                <div
                  style={{
                    fontSize: cq(24),
                    fontWeight: 700,
                    lineHeight: 1.05,
                    letterSpacing: "-0.02em",
                    color: "#FFFFFF",
                  }}
                >
                  {s.value}
                  {s.unit && <span style={{ fontSize: cq(14) }}>{s.unit}</span>}
                </div>
                <div
                  style={{
                    marginTop: cq(6),
                    fontSize: cq(8.5),
                    lineHeight: 1.35,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.78)",
                    ...clampLines(3),
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

/**
 * 10 — Brief lockup: the Adaptor Brief / E-Brochure header row — eyebrow left,
 * brand slot right, hairline under it, then an oversized title block.
 */
export function HeroBriefLockup({ section, mode, accent }: Props) {
  const ink = sectionInk(mode);
  return (
    <section aria-label="Hero" style={{ marginBottom: cq(22) }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: cq(12),
          paddingBottom: cq(10),
          borderBottom: `1px solid ${ink.hairline}`,
        }}
      >
        <span style={EYEBROW(accent)}>{section.eyebrow ?? "Brief"}</span>
        <span style={{ ...EYEBROW(ink.faint, 8.5) }}>{section.kicker ?? "TransPerfect"}</span>
      </div>
      <h2
        style={{
          margin: `${cq(20)} 0 0`,
          fontSize: cq(37),
          lineHeight: 1.12,
          letterSpacing: "-0.015em",
          fontWeight: 700,
          color: ink.strong,
          maxWidth: cq(480),
          ...clampLines(3),
        }}
      >
        {section.title}
      </h2>
      {section.summary && (
        <p
          style={{
            margin: `${cq(14)} 0 0`,
            maxWidth: cq(380),
            fontSize: cq(12.5),
            lineHeight: 1.6,
            color: ink.soft,
            ...clampLines(4),
          }}
        >
          {section.summary}
        </p>
      )}
      <MetaRail section={section} mode={mode} accent={accent} />
      <div style={{ marginTop: cq(18), height: cq(3), width: cq(72), background: accent }} />
    </section>
  );
}
