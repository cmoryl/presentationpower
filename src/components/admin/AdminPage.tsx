// Shared admin page primitives — consistency layer, not a redesign.
//
// AUDIT (July 2026): admin.*.tsx routes hand-rolled headers, loading states,
// and empty states with wildly different styles: hero eyebrow + H1 on
// admin.index/analytics, terse `<h2>` on users/approvals, no header at all
// on ab/ai/oracle/imagery-analytics, spinner icon on imagery, plain
// "Loading…" text on the rest. These primitives extract the closest thing
// to a canonical pattern (from admin.index.tsx and admin.analytics.tsx) and
// expose it as three tiny building blocks. Existing "good" pages don't
// need to change; the divergent ones get consistency for free.

import type { ReactNode } from "react";

/** Canonical eyebrow + title + description + actions block used on every
 *  admin route. Mirrors the pattern in admin.index.tsx and admin.analytics.tsx.
 *  Actions render top-right; on small screens they wrap below. */
export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 border-b border-black/10 pb-6 sm:flex-row sm:items-end sm:justify-between dark:border-white/10">
      <div className="min-w-0 space-y-1.5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-black/50 dark:text-white/50">
          {eyebrow}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-black/90 sm:text-3xl dark:text-white/90">
          {title}
        </h1>
        {description ? (
          <p className="max-w-3xl text-sm text-black/60 dark:text-white/60">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">{actions}</div>
      ) : null}
    </header>
  );
}

/** Consistent loading placeholder for query-driven admin lists. */
export function AdminLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-dashed border-black/10 bg-white/50 px-5 py-4 text-sm text-black/55 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/55">
      <span
        className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-[#003FC7]"
        aria-hidden
      />
      {label}
    </div>
  );
}

/** Consistent empty state — muted panel, centered copy, optional action. */
export function AdminEmpty({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-black/15 bg-white/60 p-10 text-center dark:border-white/10 dark:bg-white/[0.03]">
      <div className="mx-auto max-w-md space-y-2">
        <div className="text-base font-semibold text-black/80 dark:text-white/85">{title}</div>
        {description ? (
          <p className="text-sm text-black/55 dark:text-white/55">{description}</p>
        ) : null}
        {action ? <div className="pt-3">{action}</div> : null}
      </div>
    </div>
  );
}

/** Consistent section wrapper — eyebrow + optional actions + panel. */
export function AdminSection({
  eyebrow,
  title,
  actions,
  children,
  className,
}: {
  eyebrow?: string;
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`space-y-3 ${className ?? ""}`}>
      {(eyebrow || title || actions) && (
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            {eyebrow ? (
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-black/45 dark:text-white/45">
                {eyebrow}
              </div>
            ) : null}
            {title ? (
              <h2 className="mt-1 text-lg font-semibold text-black/85 dark:text-white/85">
                {title}
              </h2>
            ) : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}
