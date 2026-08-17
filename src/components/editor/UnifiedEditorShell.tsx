// One editor layout for every surface: left rail (slides / palette), a centred
// stage, and a collapsible right rail of tabbed tool panels.
//
// Both the Deck Editor and the Open Canvas Studio render through this shell so
// navigation, widths and collapse behaviour stay identical between them.

import { useState, type ReactNode } from "react";

export type EditorRailTab = {
  id: string;
  label: string;
  icon: ReactNode;
  content: ReactNode;
  /** Optional small badge (counts, warnings). */
  badge?: ReactNode;
};

export function EditorSideRail({
  tabs,
  defaultOpenId = null,
  openId,
  onOpenChange,
  width = 320,
  className = "",
}: {
  tabs: readonly EditorRailTab[];
  defaultOpenId?: string | null;
  /** Controlled open tab. Omit for the internal (uncontrolled) state. */
  openId?: string | null;
  onOpenChange?: (id: string | null) => void;
  width?: number;
  className?: string;
}) {
  const [internalOpen, setInternalOpen] = useState<string | null>(defaultOpenId);
  const controlled = openId !== undefined;
  const open = controlled ? openId : internalOpen;
  const setOpen = (next: string | null) => {
    if (!controlled) setInternalOpen(next);
    onOpenChange?.(next);
  };
  const activeTab = tabs.find((t) => t.id === open) ?? null;

  return (
    <div className={`flex h-full shrink-0 ${className}`}>
      <div
        className="relative overflow-hidden transition-[width] duration-300 ease-out"
        style={{ width: activeTab ? width : 0 }}
        aria-hidden={!activeTab}
      >
        <div
          className="flex h-full flex-col overflow-hidden rounded-l-2xl border border-r-0 border-black/10 bg-white/90 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.06]"
          style={{ width }}
        >
          <div className="flex-1 overflow-y-auto p-2">
            {activeTab && <div className="h-full">{activeTab.content}</div>}
          </div>
        </div>
      </div>

      <div className="flex w-11 shrink-0 flex-col gap-1 self-start rounded-r-2xl border border-black/10 bg-white/80 p-1 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
        {tabs.map((tab) => (
          <RailTab
            key={tab.id}
            icon={tab.icon}
            label={tab.label}
            badge={tab.badge}
            active={open === tab.id}
            onClick={() => setOpen(open === tab.id ? null : tab.id)}
          />
        ))}
        <div className="flex-1" />
        <div className="px-1 pb-1 text-center text-[9px] leading-tight tracking-[0.14em] text-black/30 dark:text-white/30">
          RAIL
        </div>
      </div>
    </div>
  );
}

function RailTab({
  icon,
  label,
  badge,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  badge?: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={active ? `Close ${label}` : `Open ${label}`}
      className={`relative flex flex-col items-center gap-1.5 rounded-lg py-3 transition ${
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
      {badge != null && <span className="absolute right-0.5 top-0.5">{badge}</span>}
    </button>
  );
}

/**
 * Three-zone editor frame. `left` is optional so studio-style surfaces with a
 * palette and deck-style surfaces with a slide rail share the same geometry.
 */
export function UnifiedEditorShell({
  left,
  leftWidth = 260,
  center,
  rail,
  className = "",
}: {
  left?: ReactNode;
  leftWidth?: number;
  center: ReactNode;
  rail: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex gap-4 ${className}`}>
      {left ? (
        <div className="shrink-0" style={{ width: leftWidth }}>
          {left}
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">{center}</div>
      {rail}
    </div>
  );
}
