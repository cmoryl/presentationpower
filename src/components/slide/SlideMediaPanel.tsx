// Unified media panel that consolidates Slide Imagery, Slide Video, and
// Background & Imagery into a single tabbed surface. Each tab renders the
// existing dedicated panel so all behavior/logic is preserved — this is a
// UX consolidation, not a logic change.

import { useState, type ReactNode } from "react";

type TabKey = "image" | "video" | "background";

type Tab = {
  key: TabKey;
  label: string;
  hint: string;
  available: boolean;
  render: () => ReactNode;
};

export function SlideMediaPanel({
  imagery,
  video,
  background,
}: {
  imagery?: { available: boolean; render: () => ReactNode };
  video?: { available: boolean; render: () => ReactNode };
  background: { render: () => ReactNode };
}) {
  const tabs: Tab[] = [
    {
      key: "image",
      label: "Image",
      hint: "Photo or upload behind this slide",
      available: !!imagery?.available,
      render: () => imagery?.render() ?? null,
    },
    {
      key: "video",
      label: "Video",
      hint: "Background motion (overrides image)",
      available: !!video?.available,
      render: () => video?.render() ?? null,
    },
    {
      key: "background",
      label: "Background",
      hint: "Solid, gradient, pattern, or library backdrop",
      available: true,
      render: () => background.render(),
    },
  ];

  const firstAvailable = tabs.find((t) => t.available)?.key ?? "background";
  const [active, setActive] = useState<TabKey>(firstAvailable);
  const activeTab = tabs.find((t) => t.key === active) ?? tabs[tabs.length - 1];

  return (
    <section className="mt-4 rounded-3xl border border-black/10 bg-white/70 p-5 shadow-[0_1px_0_rgba(0,0,0,0.04)] backdrop-blur">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-[11px] uppercase tracking-[0.18em] text-black/60">
            Slide media & background
          </h3>
          <p className="mt-1 text-xs text-black/55">{activeTab.hint}</p>
        </div>
        <div className="text-[10px] uppercase tracking-widest text-black/40">
          One place for imagery, video, and backdrops
        </div>
      </header>

      <div className="mt-4 inline-flex rounded-full border border-black/10 bg-black/[0.03] p-1">
        {tabs.map((t) => {
          const isActive = t.key === active;
          const disabled = !t.available;
          return (
            <button
              key={t.key}
              type="button"
              disabled={disabled}
              onClick={() => setActive(t.key)}
              className={[
                "rounded-full px-4 py-1.5 text-[11px] uppercase tracking-widest transition",
                isActive
                  ? "bg-[#03002C] text-white shadow-sm"
                  : disabled
                    ? "cursor-not-allowed text-black/25"
                    : "text-black/60 hover:text-black",
              ].join(" ")}
              title={disabled ? "Not available for this module" : t.hint}
            >
              {t.label}
              {disabled && <span className="ml-1 text-[9px] opacity-60">·</span>}
            </button>
          );
        })}
      </div>

      <div className="mt-4">{activeTab.render()}</div>
    </section>
  );
}
