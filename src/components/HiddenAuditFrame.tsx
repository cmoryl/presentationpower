import { useEffect, useRef } from "react";
import { auditNode, type WcagReport } from "@/lib/wcag";

/**
 * Renders `children` into an off-screen, absolutely-positioned slide-sized
 * container so its DOM can be audited for WCAG contrast without appearing
 * on screen. Reports the result via `onReport`.
 */
export function HiddenAuditFrame({
  bg,
  children,
  onReport,
  deps,
}: {
  bg: string;
  children: React.ReactNode;
  onReport: (r: WcagReport) => void;
  deps: unknown[];
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const t = window.setTimeout(() => {
      try {
        onReport(auditNode(el));
      } catch {
        /* ignore */
      }
    }, 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: -10000,
        left: -10000,
        width: 1280,
        height: 800,
        pointerEvents: "none",
        overflow: "hidden",
        background: bg,
      }}
    >
      <div ref={ref} style={{ width: 1280, height: 800 }}>
        {children}
      </div>
    </div>
  );
}
