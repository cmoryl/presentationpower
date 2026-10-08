// Supplied live-file templates for one division (pillars, desks, surrounds…),
// as the same cards the assets page shows — including their "View in 3D" links.
import { useEffect, useState } from "react";
import { loadNextRegistry, type NextRegistryRow } from "@/lib/next-event";
import { RegistryCard } from "@/components/next/NextRegistry";

export function DivisionSuppliedTemplates({ divisionId, accent }: { divisionId: string; accent: string }) {
  const [rows, setRows] = useState<NextRegistryRow[] | null>(null);
  useEffect(() => {
    let live = true;
    void loadNextRegistry().then((all) => live && setRows(all.filter((r) => r.divisionId === divisionId && r.liveSignId)));
    return () => { live = false; };
  }, [divisionId]);
  if (!rows?.length) return null;
  return (
    <section aria-labelledby="supplied-templates" className="mt-10">
      <h2 id="supplied-templates" className="text-xl font-semibold">Supplied templates</h2>
      <p className="mt-1 text-sm text-muted-foreground">Designer files you can edit live. Signs with a 3D model open it in BoothHub.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <RegistryCard key={`${r.group}-${r.code}-${r.format}`} row={r} accent={accent}
            onPreview={() => r.exampleUrl && window.open(r.exampleUrl, "_blank", "noopener")} />
        ))}
      </div>
    </section>
  );
}
