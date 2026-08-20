/**
 * Canvas-level image / logo editing for print assets.
 *
 * Mirrors the `PrintIconEdit` contract: every replaceable picture in a print
 * layout gets a stable *slot key*. When the editor supplies a
 * `PrintImageEditContext`, the picture becomes a drop target and a click
 * target — drag an image file straight onto the logo, map or photo, or click
 * to pick one from disk. The resolved URL is stored in
 * `content.imageOverrides` keyed by slot, so the change persists with the
 * document and re-renders everywhere (editor, preview, PDF/PPTX export).
 *
 * Outside the editor the context is absent and the component renders a plain,
 * non-interactive image — exports never see authoring chrome.
 */

import { createContext, useContext, useId, useRef, useState } from "react";

export type PrintImageOverrides = Record<string, string>;

type ImageEditCtx = {
  active: boolean;
  overrides: PrintImageOverrides;
  /** Upload/accept a dropped or picked file and persist it to the slot. */
  onDropFile: (slot: string, file: File) => void | Promise<void>;
  /** Clear an override, restoring the layout default. */
  onClear?: (slot: string) => void;
  /** True while an upload is in flight (any slot). */
  busy?: boolean;
};

export const PrintImageEditContext = createContext<ImageEditCtx | null>(null);

export function usePrintImageEdit() {
  return useContext(PrintImageEditContext);
}

/** Resolve a slot to its URL, honouring any stored override. */
export function resolveImageSlot(
  overrides: PrintImageOverrides | undefined,
  slot: string,
  fallback: string,
): string {
  const ov = overrides?.[slot];
  return ov && ov.trim() ? ov : fallback;
}

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/avif";

/**
 * Replaceable picture. Fills its parent box (position the parent), so it drops
 * into the same slots the layouts already use for `<img>`.
 */
export function EditableImage({
  slot,
  src,
  alt = "",
  fit = "contain",
  align = "center",
  radius,
  label,
}: {
  slot: string;
  src: string;
  alt?: string;
  fit?: "contain" | "cover";
  align?: "left" | "center" | "right";
  radius?: string | number;
  /** Hint shown in the hover affordance, e.g. "logo" or "photo". */
  label?: string;
}) {
  const ctx = usePrintImageEdit();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [over, setOver] = useState(false);
  const url = resolveImageSlot(ctx?.overrides, slot, src);

  const img = (
    <img
      alt={alt}
      src={url}
      style={{
        width: "100%",
        height: "100%",
        objectFit: fit,
        objectPosition: align === "center" ? "center" : `${align} center`,
        borderRadius: radius,
        display: "block",
      }}
    />
  );

  if (!ctx?.active) return img;

  const take = (files: FileList | null) => {
    const file = Array.from(files ?? []).find((f) => f.type.startsWith("image/"));
    if (file) void ctx.onDropFile(slot, file);
  };

  return (
    <div
      className="group relative h-full w-full"
      data-export-ignore-chrome
      onDragOver={(e) => {
        if (!Array.from(e.dataTransfer?.types ?? []).includes("Files")) return;
        e.preventDefault();
        e.stopPropagation();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOver(false);
        take(e.dataTransfer?.files ?? null);
      }}
    >
      {img}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(e) => {
          take(e.target.files);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        aria-label={`Replace ${label ?? alt ?? "image"}`}
        onClick={(e) => {
          e.stopPropagation();
          inputRef.current?.click();
        }}
        data-export-ignore
        className="absolute inset-0 flex items-center justify-center rounded-[inherit] text-[9px] font-semibold uppercase tracking-[0.14em] outline-none transition"
        style={{
          background: over ? "rgba(0,63,199,0.22)" : "transparent",
          // Slots stay visible while editing so every replaceable logo/photo
          // reads as a drop target without hunting for it on hover.
          border: over ? "2px dashed #003FC7" : "1px dashed rgba(0,63,199,0.38)",
          color: "#03002C",
        }}
      >
        <span
          className="opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"
          style={{
            background: "rgba(255,255,255,0.92)",
            borderRadius: 999,
            padding: "2px 8px",
            boxShadow: "0 1px 6px rgba(3,0,44,0.24)",
            whiteSpace: "nowrap",
          }}
        >
          {ctx.busy ? "Uploading…" : over ? "Drop to replace" : `Replace ${label ?? "image"}`}
        </span>
      </button>
      {ctx.onClear && ctx.overrides?.[slot] && (
        <button
          type="button"
          aria-label={`Reset ${label ?? alt ?? "image"} to the template default`}
          data-export-ignore
          onClick={(e) => {
            e.stopPropagation();
            ctx.onClear?.(slot);
          }}
          className="absolute right-0 top-0 rounded-full opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"
          style={{
            background: "rgba(255,255,255,0.94)",
            color: "#03002C",
            fontSize: 9,
            lineHeight: 1,
            padding: "3px 6px",
            boxShadow: "0 1px 6px rgba(3,0,44,0.24)",
          }}
        >
          Reset
        </button>
      )}
    </div>
  );
}
