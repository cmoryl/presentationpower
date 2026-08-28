// Team family — MV-OP-INTRO-TEAM and the MV-TEAM-BIOS-* bios grids.
// Extracted from the legacy `VariantRenderer` switch onto the module registry
// so portrait sizing, the accent hairline cap and bare-surface behaviour have
// exactly one owner.

import React from "react";
import { registerSlideModule } from "../module-registry";
import { SlideFrame, SlideTitle, arr, s } from "../module-kit";
import { hexA } from "@/lib/accent-tokens";
import { fillPx } from "@/lib/open-space-fill";
import { pickHeadshot } from "@/assets/backdrops/portraits";


registerSlideModule({
  id: "family:team",
  variantIds: [
    "MV-OP-INTRO-TEAM",
    "MV-TEAM-BIOS-3",
    "MV-TEAM-BIOS-4",
  ],
  render: (args) => {
    const { slide, variant, brand, pageNumber, c, mode, clientName, clientLogoUrl, dash, bareSurfaces, isDark, ink, accentTone } = args;
    void slide; void clientLogoUrl; void dash; void accentTone; void clientName; void bareSurfaces; void mode; void isDark;
    switch (variant.id) {
    case "MV-OP-INTRO-TEAM":
    case "MV-TEAM-BIOS-3":
    case "MV-TEAM-BIOS-4": {
      const people = arr(c.items);
      const cols = people.length === 4 ? 4 : people.length === 2 ? 2 : 3;
      const portraitPx = cols === 4 ? 168 : 200;
      const roleColor = isDark ? "rgba(255,255,255,0.62)" : "rgba(10,15,28,0.58)";
      const cardBg = bareSurfaces
        ? "transparent"
        : isDark
          ? "rgba(255,255,255,0.03)"
          : "rgba(10,15,28,0.02)";
      const cardRing = bareSurfaces
        ? "transparent"
        : isDark
          ? "rgba(255,255,255,0.10)"
          : "rgba(10,15,28,0.08)";
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "Team")} />
          <div
            className={`mt-14 grid gap-8 ${cols === 4 ? "grid-cols-4" : cols === 2 ? "grid-cols-2" : "grid-cols-3"}`}
          >
            {people.map((p, i) => {
              const name = s(p.name);
              const initials = name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((w) => w[0]?.toUpperCase() ?? "")
                .join("");
              // Demo fidelity: when no headshot is authored we still show a
              // real face from the shared portrait pool (deterministic by
              // name/index) instead of an initials monogram.
              const photo =
                s(p.photoUrl ?? p.avatarUrl ?? p.imageUrl) || pickHeadshot(name || `person-${i}`);
              return (
                <div
                  key={i}
                  className="relative overflow-hidden rounded-3xl p-10"
                   style={{
                     background: cardBg,
                     border: bareSurfaces ? "none" : `1px solid ${cardRing}`,
                     backgroundImage: bareSurfaces
                       ? undefined
                       : `radial-gradient(120% 60% at 50% -20%, ${brand.tokens.accent}${isDark ? "1F" : "14"} 0%, transparent 60%)`,
                   }}
                 >
                   {!bareSurfaces && (
                     <div
                       aria-hidden
                       className="absolute inset-x-0 top-0 h-[3px]"
                       style={{
                         background: `linear-gradient(90deg, ${brand.tokens.accent} 0%, ${hexA(brand.tokens.accent, 0.0)} 85%)`,
                       }}
                     />
                   )}
                  <div className="flex flex-col items-start">
                    <div
                      className="relative mb-8 grid place-items-center rounded-full"
                      style={{
                        width: portraitPx,
                        height: portraitPx,
                        background: photo
                          ? undefined
                          : `radial-gradient(circle at 30% 25%, ${hexA(brand.tokens.accent, 0.333)} 0%, ${brand.tokens.primary}CC 70%)`,
                        boxShadow: `0 0 0 2px ${hexA(brand.tokens.accent, 0.333)}, 0 24px 60px -20px ${hexA(brand.tokens.accent, 0.4)}`,
                        overflow: "hidden",
                      }}
                    >
                      {photo ? (
                        <img src={photo} alt={name} className="h-full w-full object-cover" />
                      ) : (
                        <span
                          style={{
                            color: ink.strong,
                            fontSize: portraitPx * 0.36,
                            fontWeight: 600,
                            letterSpacing: "-0.02em",
                          }}
                        >
                          {initials || "•"}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: fillPx(32, "figure"),
                        fontWeight: 600,
                        letterSpacing: "-0.02em",
                        color: ink.strong,
                        lineHeight: 1.1,
                      }}
                    >
                      {name}
                    </div>
                    {s(p.role) && (
                      <div
                        className="mt-3 uppercase"
                        style={{
                          fontSize: fillPx(15, "kicker"),
                          letterSpacing: "0.24em",
                          color: roleColor,
                          fontWeight: 600,
                        }}
                      >
                        {s(p.role)}
                      </div>
                    )}
                    {s(p.bio ?? p.note) && (
                      <div
                        className="mt-6"
                        style={{
                          fontSize: fillPx(20, "body"),
                          lineHeight: 1.45,
                          color: ink.muted,
                          maxWidth: 420,
                        }}
                      >
                        {s(p.bio ?? p.note)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </SlideFrame>
      );
    }

    default:
      return null;
    }
  },
});
