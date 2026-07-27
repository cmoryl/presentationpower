// Toast helpers that pair sonner with an assertive live-region announcement
// for failures, so screen-reader users don't miss actionable errors.

import { toast } from "sonner";
import { announce } from "@/components/A11yAnnouncer";

export function errorToast(title: string, description?: string) {
  toast.error(title, { description, duration: 8000 });
  announce(description ? `${title}. ${description}` : title, "assertive");
}

export function successToast(title: string, options?: { id?: string; duration?: number }) {
  toast.success(title, options);
  announce(title, "polite");
}
