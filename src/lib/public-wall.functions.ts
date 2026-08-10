// Public client-logo wall feed.
//
// The public module library (/public/modules) has no session, so it cannot call
// the authenticated LogoHub list. This endpoint exposes a *read-only*, minimal
// projection of the approved client-logo repository — client name, industry and
// short-lived signed URLs for the light and dark marks. No paths, no ids, no
// ownership metadata, and only rows flagged active.

import { createServerFn } from "@tanstack/react-start";

export type PublicWallLogo = {
  name: string;
  industry: string | null;
  /** Mark for light backgrounds (dark/color artwork). */
  logoUrl: string;
  /** Mark for dark backgrounds (white artwork). */
  logoUrlDark: string;
};

type Sb = {
  from: (t: string) => any;
  storage: {
    from: (b: string) => {
      createSignedUrls: (
        paths: string[],
        expires: number,
      ) => Promise<{
        data: Array<{ path: string; signedUrl: string | null }> | null;
        error: unknown;
      }>;
    };
  };
};

const BUCKET = "client-logos";

export const listPublicWallLogos = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicWallLogo[]> => {
    // Read-only, non-sensitive projection: the admin client is only used
    // because the storage bucket is private and needs signed reads.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const s = supabaseAdmin as unknown as Sb;

    const { data, error } = await s
      .from("client_logos")
      .select("client_name, industry, primary_path, light_path, dark_path")
      .eq("is_active", true)
      .order("client_name", { ascending: true })
      .limit(1000);
    if (error) throw new Error((error as { message?: string }).message ?? "Failed to load logos");

    const rows = (data ?? []) as Array<Record<string, string | null>>;
    const paths = Array.from(
      new Set(
        rows.flatMap((r) =>
          [r.primary_path, r.light_path, r.dark_path].filter((p): p is string => !!p),
        ),
      ),
    );
    const urls = new Map<string, string>();
    const BATCH = 200;
    for (let i = 0; i < paths.length; i += BATCH) {
      const { data: signed } = await s.storage
        .from(BUCKET)
        .createSignedUrls(paths.slice(i, i + BATCH), 3600);
      for (const e of signed ?? []) if (e.signedUrl) urls.set(e.path, e.signedUrl);
    }

    const out: PublicWallLogo[] = [];
    for (const r of rows) {
      const light = (r.light_path && urls.get(r.light_path)) || (r.primary_path && urls.get(r.primary_path));
      const dark = (r.dark_path && urls.get(r.dark_path)) || light;
      if (!light || !dark || !r.client_name) continue;
      out.push({
        name: r.client_name,
        industry: r.industry ?? null,
        logoUrl: light,
        logoUrlDark: dark,
      });
    }
    return out;
  },
);
