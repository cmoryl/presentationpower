import { toast } from "sonner";

/**
 * Tells the user when a file downloaded but arrived incomplete — a logo or
 * background that couldn't be fetched, a slide that fell back. The file still
 * downloads (a half file beats no file before a meeting), but shipping it
 * without saying so is how an unbranded deck reaches a client.
 */
export function toastExportWarnings(warnings: string[] | undefined | null) {
  if (!warnings || warnings.length === 0) return;
  toast.warning(
    warnings.length === 1
      ? "The file downloaded, with one thing missing"
      : `The file downloaded, with ${warnings.length} things missing`,
    {
      description: warnings.slice(0, 3).join(" · "),
      duration: 12000,
    },
  );
}
