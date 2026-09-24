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
    <section className="mt-4 rounded-lg border border-black/10 bg-white p-5">
      <header>
        <h3 className="text-sm font-semibold text-[#03002C]">Slide media & background</h3>
        <p className="mt-1 text-sm text-black/65">{activeTab.hint}</p>
      </header>

      {tabs.filter((t) => t.available).length > 1 && (
        <div role="tablist" aria-label="Slide media" className="mt-4 inline-flex gap-1 rounded-md border border-black/10 bg-black/[0.03] p-1">
          {tabs
            .filter((t) => t.available)
            .map((t) => {
              const isActive = t.key === active;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActive(t.key)}
                  className={[
                    "rounded px-4 text-sm font-medium transition",
                    isActive ? "bg-[#03002C] text-white" : "text-black/70 hover:text-black",
                  ].join(" ")}
                  title={t.hint}
                >
                  {t.label}
                </button>
              );
            })}
        </div>
      )}

      <div className="mt-4">{activeTab.render()}</div>
    </section>
  );
}
