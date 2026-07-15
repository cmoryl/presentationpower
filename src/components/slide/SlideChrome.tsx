import type { BrandMode } from "@/lib/taxonomy";
import type { ReactNode } from "react";

// A slide frame that owns the locked chrome — brand bar, footer, logo, page
// number. Locked fields live here so variant renderers cannot override them.

export function SlideFrame({
  brand,
  pageNumber,
  children,
  variant = "content",
}: {
  brand: BrandMode;
  pageNumber?: number;
  children: ReactNode;
  variant?: "content" | "cover" | "divider" | "close";
}) {
  const isDark = variant === "cover" || variant === "divider" || variant === "close";
  const bg = isDark ? brand.tokens.primary : "#ffffff";
  const fg = isDark ? "#ffffff" : brand.tokens.ink;

  return (
    <div className="relative h-full w-full" style={{ backgroundColor: bg, color: fg }}>
      {/* Brand bar (locked) */}
      <div
        className="absolute left-0 top-0 h-2 w-full"
        style={{ backgroundColor: brand.tokens.accent }}
      />
      {/* Logo (locked) */}
      <div className="absolute right-16 top-14 text-lg font-semibold tracking-wide" style={{ color: isDark ? "#ffffff" : brand.tokens.primary }}>
        TRANSPERFECT
      </div>
      {/* Content */}
      <div className="absolute inset-0 pt-32 pb-24 px-24">{children}</div>
      {/* Footer (locked) */}
      <div
        className="absolute bottom-10 left-24 right-24 flex items-center justify-between text-sm"
        style={{ color: isDark ? "rgba(255,255,255,0.7)" : "rgba(10,15,28,0.55)" }}
      >
        <span>Confidential — for internal review</span>
        {pageNumber !== undefined && <span>{String(pageNumber).padStart(2, "0")}</span>}
      </div>
    </div>
  );
}
