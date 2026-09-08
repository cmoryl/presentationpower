// Kit QR download tracking.
//
// Every SVG / PNG a kit recipient pulls out of KitQrCreator is logged as one
// row so /admin/qr-downloads can show which event kits are actually being
// used. Logging is fire-and-forget: a failed write must never block the
// download the person asked for.

import { supabase } from "@/integrations/supabase/client";

export type KitQrFormat = "svg" | "png";

/** Record one QR download. Never throws. */
export async function logKitQrDownload(
  kitId: string,
  kitLabel: string | undefined,
  format: KitQrFormat,
): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    await supabase.from("kit_qr_downloads").insert({
      kit_id: kitId.slice(0, 200),
      kit_label: (kitLabel ?? "").slice(0, 200) || null,
      format,
      user_id: data.session?.user.id ?? null,
    } as never);
  } catch {
    /* tracking is best-effort */
  }
}
