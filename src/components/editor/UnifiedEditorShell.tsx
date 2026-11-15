// One editor layout for every surface: left rail (slides / palette), a centred
// stage, and a collapsible right rail of tabbed tool panels.
//
// Both the Deck Editor and the Open Canvas Studio render through this shell so
// navigation, widths and collapse behaviour stay identical between them.

import { useState, type CSSProperties, type ReactNode } from "react";

import { CreateOnlyNotice } from "@/components/access/CreateOnlyNotice";
import { useWorkspaceCapabilities } from "@/hooks/use-workspace-capabilities";
import { Button } from "@/design-system/element";

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
    <div className={`flex h-full w-full max-w-full shrink-0 flex-col rounded-md border border-border bg-card text-card-foreground ${className}`}>
      <div role="group" aria-label="Editor panels" className="flex max-w-full flex-wrap gap-1 border-b border-border p-2">
        {tabs.map(tab => <RailTab key={tab.id} icon={tab.icon} label={tab.label} badge={tab.badge} active={open === tab.id} onClick={() => setOpen(open === tab.id ? null : tab.id)} />)}
      </div>
      <div
        className={activeTab ? "relative min-w-0 overflow-hidden" : "hidden"}
        style={{ width: `min(${width}px, 100%)` }}
        aria-hidden={!activeTab}
      >
        <div
          className="flex h-full w-full min-w-0 flex-col overflow-hidden"
        >
          {/* EVERY tab stays mounted. Panels host portal targets (the studio
              toolbar, the layers list), so unmounting a closed tab would send
              those controls back to their overlay fallback on top of the slide.
              Inactive panels are hidden, never destroyed. */}
          <div className="flex-1 overflow-y-auto p-2">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={tab.id === open ? "h-full" : "hidden"}
                aria-hidden={tab.id !== open}
              >
                {tab.content}
              </div>
            ))}
          </div>
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
    <Button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={active ? `Close ${label}` : `Open ${label}`}
      variant={active ? "default" : "ghost"}
      size="sm"
      className="relative gap-1.5"
    >
      {icon}
      <span className="text-xs font-medium">
        {label}
      </span>
      {badge != null && <span className="absolute right-0.5 top-0.5">{badge}</span>}
    </Button>
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
  // Sales-enablement / viewer accounts get a read-only frame: the stage still
  // renders (present, review, export) but the authoring rails are inert.
  const caps = useWorkspaceCapabilities();
  const locked = caps.createOnly;
  const lockProps = locked
    ? { "aria-disabled": true, className: "pointer-events-none select-none opacity-55" }
    : { className: "" };

  // Below `lg` the three zones stack: a 260px palette plus a 320px tool rail
  // cannot coexist with the stage at phone widths, so the rails become
  // full-width sections above/below the canvas instead of shoving it offscreen.
  return (
    <div className="flex flex-col gap-4">
      {locked ? <CreateOnlyNotice /> : null}
      <div className={`flex flex-col gap-4 lg:flex-row ${className}`}>
        {left ? (
          <div
            {...lockProps}
            className={`w-full min-w-0 shrink-0 lg:w-[var(--editor-left-w)] ${lockProps.className}`}
            style={{ "--editor-left-w": `${leftWidth}px` } as CSSProperties}
          >
            {left}
          </div>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col">{center}</div>
        <div {...lockProps} className={`min-w-0 max-w-full ${lockProps.className}`}>
          {rail}
        </div>
      </div>
    </div>
  );
}
