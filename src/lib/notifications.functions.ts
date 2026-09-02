// Notification inbox: the signed-in member reads and clears their own alerts
// and controls which channels they receive.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type NotificationRow = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  subject_type: string | null;
  subject_id: string | null;
  request_id: string | null;
  read_at: string | null;
  created_at: string;
};

export const listNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) =>
    z
      .object({ unreadOnly: z.boolean().optional(), limit: z.number().min(1).max(100).optional() })
      .parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase
      .from("notifications")
      .select(
        "id, kind, title, body, link, subject_type, subject_id, request_id, read_at, created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 30);
    if (data.unreadOnly) q = q.is("read_at", null);

    const { data: rows, error } = await q.returns<NotificationRow[]>();
    if (error) throw new Error(error.message);

    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null);

    return { notifications: rows ?? [], unread: count ?? 0 };
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) =>
    z
      .object({ ids: z.array(z.string().uuid()).max(100).optional(), all: z.boolean().optional() })
      .parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const now = new Date().toISOString();
    let q = supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("user_id", userId)
      .is("read_at", null);
    if (!data.all) {
      if (!data.ids?.length) return { ok: true, count: 0 };
      q = q.in("id", data.ids);
    }
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true, count: data.ids?.length ?? -1 };
  });

export const getNotificationPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("notification_prefs")
      .select("inapp_enabled, email_enabled")
      .eq("user_id", userId)
      .maybeSingle();
    // No row yet means nothing has been customised — both channels are on.
    return {
      inappEnabled: row?.inapp_enabled ?? true,
      emailEnabled: row?.email_enabled ?? true,
    };
  });

export const updateNotificationPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) =>
    z.object({ inappEnabled: z.boolean(), emailEnabled: z.boolean() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("notification_prefs").upsert(
      {
        user_id: userId,
        inapp_enabled: data.inappEnabled,
        email_enabled: data.emailEnabled,
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
