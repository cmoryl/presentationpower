/**
 * One byte-size label for the whole app.
 *
 * Six copies of this used to live in routes, components and a server function,
 * each rounding differently — so the same 1.25 MB upload read as "1.3 MB" in
 * one place and "1.25 MB" in another. This is the single source of truth.
 */
export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
