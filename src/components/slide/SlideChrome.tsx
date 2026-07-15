import type { BrandMode } from "@/lib/taxonomy";
import type { ReactNode } from "react";
import { BrandLockup } from "@/components/BrandLockup";

// A slide frame that owns the locked chrome — brand bar, footer, logo, page
// number. Locked fields live here so variant renderers cannot override them.

export function SlideFrame({
  brand,
  pageNumber,
  children,
  variant = "content",
  clientName,
}: {
  brand: BrandMode;
  pageNumber?: number;
  children: ReactNode;
  variant?: "content" | "cover" | "divider" | "close";
  clientName?: string;
}) {
  const isDark = variant === "cover" || variant === "divider" || variant === "close";
  const bg = isDark ? brand.tokens.primary : "#ffffff";
  const fg = isDark ? "#ffffff" : brand.tokens.ink;
  const logoColor = isDark ? "#ffffff" : brand.tokens.primary;

  return (
    <div className="relative h-full w-full" style={{ backgroundColor: bg, color: fg }}>
      {/* Brand bar (locked) */}
      <div
        className="absolute left-0 top-0 h-2 w-full"
        style={{ backgroundColor: brand.tokens.accent }}
      />
      {/* Brand lockup (locked) — driven by the selected brand mode */}
      <div className="absolute right-16 top-12">
        <BrandLockup brand={brand} color={logoColor} size="md" clientName={clientName} />
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
