/**
 * ModuleHeader — the single eyebrow + title lockup every non-hero print module
 * uses. Previously each module hand-rolled its own header (eyebrow at 9 or 9.5,
 * title at 14/15/16/18, header gap 8/9/10/12/14), which is exactly why newer
 * modules never sat comfortably next to the original template blocks.
 */
import { cq, MODULE, moduleEyebrowStyle, moduleTitleStyle } from "./shared";

export function ModuleHeader({
  eyebrow,
  title,
  mode,
  accent,
  scope = "module",
  align = "start",
  gap = MODULE.headerGap,
}: {
  eyebrow?: string;
  title?: string;
  mode: "light" | "dark";
  accent: string;
  /** `panel` = header lives inside a glass panel, so the title steps down. */
  scope?: "module" | "panel";
  align?: "start" | "center";
  gap?: number;
}) {
  if (!eyebrow && !title) return null;
  return (
    <header
      style={{
        marginBottom: cq(gap),
        textAlign: align === "center" ? "center" : undefined,
      }}
    >
      {eyebrow && <div style={moduleEyebrowStyle(accent)}>{eyebrow}</div>}
      {title && (
        <h3 style={{ ...moduleTitleStyle(mode, scope), marginTop: eyebrow ? undefined : 0 }}>
          {title}
        </h3>
      )}
    </header>
  );
}
