// Toast helpers used by upload/drop flows.
//
// Errors go through sonner's patched `toast.error` (see lib/toast-a11y.tsx),
// which mirrors the message into an assertive live region. We add a longer
// duration and a close button so keyboard/SR users have time to read and
// dismiss actionable failures.

import { toast } from "sonner";

export function errorToast(title: string, description?: string) {
  toast.error(title, { description, duration: 8000, closeButton: true });
}

export function successToast(title: string, options?: { id?: string; duration?: number }) {
  toast.success(title, options);
}
