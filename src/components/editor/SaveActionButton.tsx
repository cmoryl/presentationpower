import { useEffect } from "react";
import { Check, CloudUpload, Loader2 } from "lucide-react";

export type SaveActionState = "saved" | "dirty" | "saving";

/**
 * Shared, always-visible primary Save control used by every editing surface
 * (deck editor, Open Canvas Studio, Module Studio). Keeps the label, keyboard
 * shortcut (Cmd/Ctrl+S) and state wording consistent so users never have to
 * hunt through a menu to save their work.
 */
export function SaveActionButton({
  state,
  onSave,
  label = "Save",
  savedLabel = "Saved",
  title,
  shortcut = true,
  disabled,
}: {
  state: SaveActionState;
  onSave: () => void;
  label?: string;
  savedLabel?: string;
  title?: string;
  shortcut?: boolean;
  disabled?: boolean;
}) {
  useEffect(() => {
    if (!shortcut) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!disabled && state !== "saving") onSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut, disabled, state, onSave]);

  const saving = state === "saving";
  const dirty = state === "dirty";

  return (
    <button
      type="button"
      onClick={onSave}
      disabled={disabled || saving}
      aria-label={saving ? "Saving" : dirty ? `${label} (unsaved changes)` : savedLabel}
      title={title ?? (shortcut ? `${label} — ⌘S / Ctrl+S` : label)}
      className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-semibold transition disabled:opacity-60 ${
        dirty
          ? "bg-primary text-primary-foreground shadow-sm hover:brightness-110"
          : "border border-border bg-card text-foreground/70 hover:bg-muted hover:text-foreground"
      }`}
    >
      {saving ? (
        <Loader2 size={13} className="animate-spin" />
      ) : dirty ? (
        <CloudUpload size={13} />
      ) : (
        <Check size={13} />
      )}
      <span>{saving ? "Saving…" : dirty ? label : savedLabel}</span>
    </button>
  );
}
