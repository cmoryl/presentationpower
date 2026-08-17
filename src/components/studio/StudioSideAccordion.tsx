// Collapsible side accordion for the Open Canvas Studio right rail.
// Keeps the canvas as large as possible by collapsing the layers and inspector
// into a slim vertical tab bar; click a tab to slide out the panel.

import { useState } from "react";
import { Layers, SlidersHorizontal } from "lucide-react";

type Panel = "layers" | "inspector" | null;

type Props = {
  layers: React.ReactNode;
  inspector: React.ReactNode;
  /** Initial panel. Default is collapsed (null) to maximise the canvas. */
  defaultOpen?: Panel;
};

export function StudioSideAccordion({ layers, inspector, defaultOpen = null }: Props) {
  const [open, setOpen] = useState<Panel>(defaultOpen);

  const toggle = (panel: Panel) => {
    setOpen((current) => (current === panel ? null : panel));
  };

  return (
    <div className="flex h-full shrink-0">
      {/* Slide-out content panel */}
      <div
        className={`relative overflow-hidden transition-[width] duration-300 ease-out ${
          open ? "w-[280px]" : "w-0"
        }`}
        aria-hidden={!open}
      >
        <div className="flex h-full w-[280px] flex-col overflow-hidden rounded-l-2xl border border-r-0 border-black/10 bg-white/90 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.06]">
          <div className="flex-1 overflow-y-auto p-2">
            {open === "layers" && (
              <div className="h-full">
                {layers}
              </div>
            )}
            {open === "inspector" && (
              <div className="h-full">
                {inspector}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vertical tab bar */}
      <div className="flex w-11 shrink-0 flex-col gap-1 rounded-r-2xl border border-black/10 bg-white/80 p-1 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
        <AccordionTab
          icon={<Layers className="h-4 w-4" />}
          label="Layers"
          active={open === "layers"}
          onClick={() => toggle("layers")}
        />
        <AccordionTab
          icon={<SlidersHorizontal className="h-4 w-4" />}
          label="Inspect"
          active={open === "inspector"}
          onClick={() => toggle("inspector")}
        />
        <div className="flex-1" />
        <div className="px-1 pb-1 text-center text-[9px] leading-tight tracking-[0.14em] text-black/30 dark:text-white/30">
          RAIL
        </div>
      </div>
    </div>
  );
}

function AccordionTab({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={active ? `Close ${label}` : `Open ${label}`}
      className={`flex flex-col items-center gap-1.5 rounded-lg py-3 transition ${
        active
          ? "bg-[#003FC7] text-white"
          : "text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10"
      }`}
    >
      {icon}
      <span
        className="text-[10px] font-semibold uppercase tracking-[0.14em]"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        {label}
      </span>
    </button>
  );
}
