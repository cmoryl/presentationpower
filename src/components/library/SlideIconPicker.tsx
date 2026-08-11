// Visual icon picker for Slide Studio cells.
//
// A large, browsable gallery: search, group filters, big previews and a size
// stepper, so a curator can see exactly what an icon looks like before
// swapping it in. Complements the compact dropdown IconPicker used inline.

import { useEffect, useMemo, useState } from "react";
import {
  ICON_GROUPS,
  ICON_LIBRARY,
  iconByName,
  parseIconRef,
} from "@/lib/icon-library";
import { IconRenderer } from "@/components/IconRenderer";

const SIZE_CHOICES = ["xs", "sm", "md", "lg", "xl", "display"] as const;
export type IconSizeToken = (typeof SIZE_CHOICES)[number];

export function SlideIconPicker({
  title = "Choose icon",
  value,
  size,
  onPick,
  onSize,
  onClose,
}: {
  title?: string;
  value?: string | null;
  /** Current size token, when the caller supports icon scaling. */
  size?: string;
  onPick: (name: string | null) => void;
  onSize?: (token: IconSizeToken) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string>("all");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const entries = useMemo(() => {
    const t = q.trim().toLowerCase();
    return ICON_LIBRARY.filter((e) => {
      if (group !== "all" && e.group !== group) return false;
      if (!t) return true;
      return (
        e.label.toLowerCase().includes(t) ||
        e.name.toLowerCase().includes(t) ||
        e.group.toLowerCase().includes(t)
      );
    });
  }, [q, group]);

  const Current = iconByName(value ?? undefined);
  const currentPack = parseIconRef(value ?? undefined);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#03002C]/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="max-h-[86vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-white/15 bg-[#0A0733] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/[0.06] text-white">
            {Current ? (
              <Current size={20} />
            ) : currentPack ? (
              <IconRenderer pack={currentPack.packId} name={currentPack.name} size={20} />
            ) : (
              <span className="text-[9px] uppercase tracking-widest text-white/40">auto</span>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-white">{title}</h2>
            <p className="truncate text-[11px] text-white/45">
              {value ? value : "Auto-matched icon"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onPick(null);
              onClose();
            }}
            className="rounded border border-white/15 px-2 py-1 text-[10px] uppercase tracking-widest text-white/60 hover:text-white"
            title="Reset to the auto-matched icon"
          >
            Auto
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close icon picker"
            className="rounded border border-white/15 px-2 py-1 text-xs text-white/70 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 border-b border-white/10 px-4 py-3">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search icons…"
            className="w-full rounded-lg border border-white/15 bg-[#03002C]/70 px-3 py-2 text-xs text-white focus:border-[#A1FBF9] focus:outline-none"
          />
          <div className="flex flex-wrap gap-1.5">
            {["all", ...ICON_GROUPS].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGroup(g)}
                aria-pressed={group === g}
                className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-widest transition ${
                  group === g
                    ? "border-[#A1FBF9]/70 bg-[#A1FBF9]/15 text-[#A1FBF9]"
                    : "border-white/15 text-white/55 hover:text-white"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          {onSize && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[10px] uppercase tracking-widest text-white/40">
                Size
              </span>
              {SIZE_CHOICES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onSize(s)}
                  aria-pressed={size === s}
                  className={`rounded border px-2 py-0.5 text-[10px] transition ${
                    size === s
                      ? "border-[#A1FBF9]/70 bg-[#A1FBF9]/15 text-[#A1FBF9]"
                      : "border-white/15 text-white/55 hover:text-white"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-4">
          {entries.length === 0 ? (
            <p className="py-6 text-center text-xs text-white/50">
              No icons match “{q}”.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {entries.map((e) => {
                const active = value === e.name;
                const Ic = e.Icon;
                return (
                  <button
                    key={e.name}
                    type="button"
                    onClick={() => {
                      onPick(e.name);
                      onClose();
                    }}
                    title={`${e.label} · ${e.group}`}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition ${
                      active
                        ? "border-[#A1FBF9] bg-[#A1FBF9]/12 text-[#A1FBF9]"
                        : "border-white/12 text-white/75 hover:border-[#A1FBF9]/60 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    <Ic size={26} />
                    <span className="w-full truncate text-center text-[10px] text-white/55">
                      {e.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
