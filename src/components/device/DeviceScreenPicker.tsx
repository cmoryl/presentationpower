/**
 * DEVICE SCREEN PICKER — authoring affordance for the laptop / monitor
 * showcase modules in print layouts.
 *
 * The screen itself stays a click / drop target (see `EditableImage`), but
 * hunting for a hover affordance inside a small chassis is fiddly. This adds an
 * explicit control: upload a screenshot from disk, paste an image URL, or reset
 * the slot back to the template default. It only mounts while the print editor
 * supplies a `PrintImageEditContext`, and every element is tagged
 * `data-export-ignore` so PDF / PPTX exports never see it.
 */

import { useRef, useState } from "react";
import { usePrintImageEdit } from "@/components/print/PrintImageEdit";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/avif";

export function DeviceScreenPicker({
  slot,
  label = "screen",
}: {
  slot: string;
  /** Human label, e.g. "Laptop screen". */
  label?: string;
}) {
  const ctx = usePrintImageEdit();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!ctx?.active) return null;
  const current = ctx.overrides?.[slot];

  const apply = () => {
    const v = url.trim();
    if (!v) return;
    if (!/^(https?:\/\/|data:image\/)/i.test(v)) {
      setError("Enter an https:// image URL.");
      return;
    }
    setError(null);
    ctx.onSetUrl?.(slot, v);
    setUrl("");
    setOpen(false);
  };

  return (
    <div
      data-export-ignore
      data-export-ignore-chrome
      style={{ position: "absolute", right: 6, bottom: 6, zIndex: 40 }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        style={{
          background: "rgba(255,255,255,0.95)",
          border: "1px solid rgba(3,0,44,0.18)",
          borderRadius: 999,
          color: "#03002C",
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          padding: "4px 9px",
          boxShadow: "0 1px 6px rgba(3,0,44,0.22)",
        }}
      >
        {ctx.busy ? "Uploading…" : `${label} image`}
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            right: 0,
            bottom: "calc(100% + 6px)",
            width: 260,
            background: "#fff",
            border: "1px solid rgba(3,0,44,0.14)",
            borderRadius: 12,
            boxShadow: "0 10px 30px rgba(3,0,44,0.22)",
            padding: 12,
            textAlign: "left",
          }}
        >
          <div
            style={{
              fontSize: 9,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(3,0,44,0.55)",
            }}
          >
            {label} image
          </div>

          <div
            style={{
              marginTop: 8,
              height: 68,
              borderRadius: 8,
              border: "1px solid rgba(3,0,44,0.12)",
              background: "rgba(3,0,44,0.04)",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {current ? (
              <img
                src={current}
                alt={`Current ${label} image`}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : (
              <span style={{ fontSize: 10, color: "rgba(3,0,44,0.45)" }}>Template default</span>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            style={{ display: "none" }}
            onChange={(e) => {
              const file = Array.from(e.target.files ?? []).find((f) =>
                f.type.startsWith("image/"),
              );
              e.target.value = "";
              if (!file) return;
              void ctx.onDropFile(slot, file);
              setOpen(false);
            }}
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            style={{
              marginTop: 10,
              width: "100%",
              borderRadius: 999,
              background: "#003FC7",
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
              padding: "7px 10px",
            }}
          >
            Upload image
          </button>

          <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  apply();
                }
              }}
              placeholder="Paste image URL"
              aria-label={`${label} image URL`}
              style={{
                flex: 1,
                minWidth: 0,
                borderRadius: 8,
                border: "1px solid rgba(3,0,44,0.16)",
                padding: "6px 8px",
                fontSize: 11,
              }}
            />
            <button
              type="button"
              onClick={apply}
              style={{
                borderRadius: 8,
                border: "1px solid rgba(3,0,44,0.18)",
                padding: "6px 9px",
                fontSize: 11,
                fontWeight: 600,
                color: "#03002C",
              }}
            >
              Use
            </button>
          </div>

          {error && <div style={{ marginTop: 6, fontSize: 10, color: "#E53D2E" }}>{error}</div>}

          <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", gap: 8 }}>
            {current && ctx.onClear ? (
              <button
                type="button"
                onClick={() => {
                  ctx.onClear?.(slot);
                  setOpen(false);
                }}
                style={{ fontSize: 10, color: "rgba(3,0,44,0.6)", textDecoration: "underline" }}
              >
                Reset to default
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{ fontSize: 10, color: "rgba(3,0,44,0.6)" }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
