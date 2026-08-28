// Client logo-wall family — extracted from the legacy `VariantRenderer` switch
// onto the module registry. Seven treatments (grid, strip, marquee, featured,
// categorized, mosaic) share the same mark-resolution rules and the "logo wins
// over the client name" contract, so they belong to one owner.

import { registerSlideModule } from "../module-registry";
import { SlideFrame, SlideTitle, arr, s, type Item } from "../module-kit";
import { Hairline, Kicker, SupportingText } from "../primitives";
import { ClientLogoImg, pickLogoForMode } from "../client-logo";
import { accentInk } from "@/lib/accent-tokens";
import { fillPx } from "@/lib/open-space-fill";

registerSlideModule({
  id: "family:logos",
  variantIds: [
    "MV-PROOF-LOGOS",
    "MV-CASE-LOGO-GRID",
    "MV-PROOF-LOGOS-STRIP",
    "MV-PROOF-LOGOS-MARQUEE",
    "MV-PROOF-LOGOS-FEATURED",
    "MV-PROOF-LOGOS-CATEGORIZED",
    "MV-PROOF-LOGOS-MOSAIC",
  ],
  render: ({ variant, brand, pageNumber, c, mode, ink, isDark, bareSurfaces }) => {
    switch (variant.id) {
    case "MV-PROOF-LOGOS":
    case "MV-CASE-LOGO-GRID": {
      const tileText = ink.strong;
      // Mode-aware accent: on dark grounds the raw division accent (Blue 500)
      // is too deep to read as text or as a hairline, so lift it onto the
      // shared accentInk ramp. Light mode is unchanged.
      const accent = accentInk(brand.tokens.accent, mode, 4.5);
      const tileBg = bareSurfaces
        ? "transparent"
        : isDark
          ? "rgba(255,255,255,0.04)"
          : "rgba(10,15,28,0.02)";
      const tileRing = bareSurfaces
        ? "transparent"
        : isDark
          ? "rgba(255,255,255,0.08)"
          : "rgba(10,15,28,0.06)";
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="mt-14 grid grid-cols-4 gap-6">
            {arr(c.items).map((it, i) => {
              const name = s(it.name ?? it.client);
              const logoUrl = pickLogoForMode(it, mode);
              const logoPath = s(it.logoPath);
              const result = s(it.result);
              return (
                <div
                  key={i}
                  className="relative flex aspect-[3/2] flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl px-6 py-8 text-center"
                   style={{
                     color: tileText,
                     background: tileBg,
                     border: bareSurfaces ? "none" : `1px solid ${tileRing}`,
                     backgroundImage: bareSurfaces
                       ? undefined
                       : `radial-gradient(120% 80% at 50% 0%, ${accent}${isDark ? "18" : "0C"} 0%, transparent 65%)`,
                   }}
                 >
                   {!bareSurfaces && (
                     <div
                       aria-hidden
                       className="absolute inset-x-0 top-0 h-[2px]"
                       style={{
                         background: `linear-gradient(90deg, ${accent}00, ${accent}, ${accent}00)`,
                       }}
                     />
                   )}
                  <div className="flex w-full flex-1 items-center justify-center">
                    {logoUrl || logoPath ? (
                      <ClientLogoImg
                        path={logoPath}
                        url={logoUrl}
                        alt={name ? `${name} logo` : "Client logo"}
                        className="max-h-[110px] max-w-[80%] object-contain"
                        style={{ filter: isDark ? "brightness(1.05)" : undefined }}
                      />
                    ) : (
                      <div
                        style={{
                          fontSize: fillPx(24, "body"),
                          fontWeight: 600,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {name}
                      </div>
                    )}
                  </div>
                  {result && (
                    <div
                      className="tabular-nums"
                      style={{
                        color: accentInk(accent, mode),
                        fontSize: fillPx(22, "body"),
                        fontWeight: 700,
                        letterSpacing: "-0.01em",
                        lineHeight: 1.15,
                      }}
                    >
                      {result}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SlideFrame>
      );
    }

    case "MV-PROOF-LOGOS-STRIP": {
      const items = arr(c.items).slice(0, 6);
      const rule = mode === "dark" ? "rgba(255,255,255,0.10)" : "rgba(10,15,28,0.08)";
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          {s(c.kicker) && <Kicker brand={brand}>{s(c.kicker)}</Kicker>}
          <SlideTitle brand={brand} title={s(c.title)} />
          <Hairline
            color={"var(--slide-accent-text)"}
            widthPx={96}
            thicknessPx={2}
            className="mt-10"
          />
          <div
            className="slide-fill-stretch mt-16 flex items-center justify-between gap-10 px-4 py-14"
            style={{ borderTop: `1px solid ${rule}`, borderBottom: `1px solid ${rule}` }}
          >
            {items.map((it, i) => {
              const url = pickLogoForMode(it, mode);
              const path = s(it.logoPath);
              const name = s(it.name);
              return (
                <div key={i} className="flex h-24 flex-1 items-center justify-center">
                  {url || path ? (
                    <ClientLogoImg
                      url={url}
                      path={path}
                      alt={`${name} logo`}
                      className="max-h-16 max-w-full object-contain"
                    />
                  ) : (
                    <div className="text-xl font-semibold" style={{ color: ink.strong }}>
                      {name}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SlideFrame>
      );
    }

    case "MV-PROOF-LOGOS-MARQUEE": {
      const items = arr(c.items).slice(0, 10);
      const row1 = items.slice(0, 5);
      const row2 = items.slice(5, 10);
      const renderRow = (row: Item[], offset: boolean, key: string) => (
        <div key={key} className={`grid grid-cols-5 items-center gap-10 ${offset ? "px-16" : ""}`}>
          {row.map((it, i) => {
            const url = pickLogoForMode(it, mode);
            const path = s(it.logoPath);
            const name = s(it.name);
            return (
              <div key={i} className="flex h-full min-h-[88px] items-center justify-center p-4">
                {url || path ? (
                  <ClientLogoImg
                    url={url}
                    path={path}
                    alt={`${name} logo`}
                    className="max-h-14 max-w-[88%] object-contain"
                  />
                ) : (
                  <div className="text-lg font-semibold" style={{ color: ink.strong }}>
                    {name}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          {s(c.subtitle) && (
            <SupportingText size="md" opacity={0.75} maxWidthPx={1180} className="mt-6">
              {s(c.subtitle)}
            </SupportingText>
          )}
          <div className="slide-fill-stretch mt-12 flex flex-col justify-evenly gap-8">
            {renderRow(row1, false, "row1")}
            {renderRow(row2, true, "row2")}
          </div>
        </SlideFrame>
      );
    }

    case "MV-PROOF-LOGOS-FEATURED": {
      const featuredUrl = pickLogoForMode(
        { logoUrl: c.featuredLogoUrl, logoUrlDark: c.featuredLogoUrlDark },
        mode,
      );
      const featuredName = s(c.featuredName, "Anchor partner");
      const featuredNote = s(c.featuredNote);
      const supports = arr(c.items).slice(0, 4);
      const divider = mode === "dark" ? "rgba(255,255,255,0.10)" : "rgba(10,15,28,0.08)";
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div
            className="mt-14 grid h-[540px] grid-cols-[1.4fr_1fr] gap-14"
            style={{ borderTop: `1px solid ${divider}` }}
          >
            <div
              className="flex flex-col items-center justify-center p-8 text-center"
              style={{ borderRight: `1px solid ${divider}` }}
            >
              {featuredUrl ? (
                <ClientLogoImg
                  url={featuredUrl}
                  alt={`${featuredName} logo`}
                  className="max-h-44 max-w-[72%] object-contain"
                />
              ) : (
                <div className="text-4xl font-semibold" style={{ color: ink.strong }}>
                  {featuredName}
                </div>
              )}
              {featuredNote && (
                <div className="mt-10 max-w-md text-lg opacity-75" style={{ color: ink.strong }}>
                  {featuredNote}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 grid-rows-2">
              {supports.map((it, i) => {
                const url = pickLogoForMode(it, mode);
                const path = s(it.logoPath);
                const name = s(it.name);
                // Inner hairline grid for structure without card chrome
                const cellBorders = {
                  borderRight: i % 2 === 0 ? `1px solid ${divider}` : undefined,
                  borderBottom: i < 2 ? `1px solid ${divider}` : undefined,
                };
                return (
                  <div key={i} className="flex items-center justify-center p-6" style={cellBorders}>
                    {url || path ? (
                      <ClientLogoImg
                        url={url}
                        path={path}
                        alt={`${name} logo`}
                        className="max-h-14 max-w-[80%] object-contain"
                      />
                    ) : (
                      <div className="text-lg font-semibold" style={{ color: ink.strong }}>
                        {name}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-PROOF-LOGOS-CATEGORIZED": {
      const groups = arr(c.items).slice(0, 2);
      const textColor = ink.strong;
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="mt-14 grid grid-cols-2 gap-14">
            {groups.map((g, gi) => {
              const logos = arr(g.logos).slice(0, 4);
              return (
                <div key={gi} className="flex flex-col gap-6">
                  <div className="flex items-baseline gap-3">
                    <div
                      className="text-xl font-semibold uppercase tracking-[0.14em]"
                      style={{ color: "var(--slide-accent-text)" }}
                    >
                      {String.fromCharCode(65 + gi)}
                    </div>
                    <div className="text-2xl font-medium" style={{ color: textColor }}>
                      {s(g.label)}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                    {logos.map((it, i) => {
                      const url = pickLogoForMode(it, mode);
                      const path = s(it.logoPath);
                      const name = s(it.name);
                      return (
                        <div key={i} className="flex aspect-[3/2] items-center justify-center p-3">
                          {url || path ? (
                            <ClientLogoImg
                              url={url}
                              path={path}
                              alt={`${name} logo`}
                              className="max-h-12 max-w-[86%] object-contain"
                            />
                          ) : (
                            <div className="text-base font-semibold" style={{ color: textColor }}>
                              {name}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </SlideFrame>
      );
    }

    case "MV-PROOF-LOGOS-MOSAIC": {
      const items = arr(c.items).slice(0, 7);
      const textColor = ink.strong;
      // Mosaic grid template: 4 cols × 3 rows, asymmetric spans.
      const spans = [
        "col-span-2 row-span-2", // 0 anchor
        "col-span-1 row-span-1",
        "col-span-1 row-span-1",
        "col-span-1 row-span-2",
        "col-span-1 row-span-1",
        "col-span-1 row-span-1",
        "col-span-2 row-span-1",
      ];
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          {s(c.kicker) && <Kicker brand={brand}>{s(c.kicker)}</Kicker>}
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="mt-14 grid h-[560px] grid-cols-4 grid-rows-3 gap-6">
            {items.map((it, i) => {
              const url = pickLogoForMode(it, mode);
              const path = s(it.logoPath);
              const name = s(it.name);
              const isAnchor = i === 0;
              return (
                <div
                  key={i}
                  className={`flex items-center justify-center p-6 ${spans[i] ?? "col-span-1 row-span-1"}`}
                >
                  {url || path ? (
                    <ClientLogoImg
                      url={url}
                      path={path}
                      alt={`${name} logo`}
                      className={`object-contain ${isAnchor ? "max-h-[75%] max-w-[85%]" : "max-h-[65%] max-w-[80%]"}`}
                    />
                  ) : (
                    <div
                      className={`font-semibold ${isAnchor ? "text-3xl" : "text-xl"}`}
                      style={{ color: textColor }}
                    >
                      {name}
                    </div>
                  )}
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
