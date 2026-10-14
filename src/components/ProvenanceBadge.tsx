import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Table = "event_rooms" | "print_assets";

interface Prov {
  source_file: string | null;
  source_page?: string | null;
  verified_at: string | null;
}

/**
 * "Unverified" until a brand lead or admin signs off. The database trigger
 * stamps who signed and refuses anyone else, so the button is a convenience.
 */
export function ProvenanceBadge({ table, id }: { table: Table; id: string }) {
  const [p, setP] = useState<Prov | null>(null);
  const [canSign, setCanSign] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    supabase
      .from(table)
      .select("source_file,source_page,verified_at")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => live && setP((data as Prov) ?? null));
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id;
      if (!uid) return;
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      if (live) setCanSign(!!roles?.some((r) => r.role === "admin" || r.role === "brand_lead"));
    });
    return () => {
      live = false;
    };
  }, [table, id]);

  if (!p) return null;
  const verified = !!p.verified_at;

  async function toggle() {
    setBusy(true);
    setErr(null);
    const verified_at = verified ? null : new Date().toISOString();
    const { error } = await supabase.from(table).update({ verified_at }).eq("id", id);
    setBusy(false);
    if (error) setErr(error.message);
    else setP({ ...p!, verified_at });
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-xs">
      <span
        className={`rounded-sm px-1.5 py-0.5 font-medium ${verified ? "bg-green-100 text-green-900" : "bg-amber-100 text-amber-900"}`}
        title={p.source_file ? `Source: ${p.source_file}${p.source_page ? `, ${p.source_page}` : ""}` : "No source file recorded"}
      >
        {verified ? `Checked ${new Date(p.verified_at!).toLocaleDateString()}` : "Unverified"}
      </span>
      {p.source_file && <span className="text-black/55">Source: {p.source_file}</span>}
      {canSign && (
        <button type="button" disabled={busy} onClick={toggle} className="underline hover:no-underline disabled:opacity-50">
          {verified ? "Undo sign-off" : "Sign off as checked"}
        </button>
      )}
      {err && <span role="alert" className="text-red-800">{err}</span>}
    </span>
  );
}
