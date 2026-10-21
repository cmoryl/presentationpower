// "Edit in Element" list of a kit's editable sign templates (supplied kits and the Bowl kit).
import { Link } from "@tanstack/react-router";
import { PencilRuler } from "lucide-react";
import { Button } from "@/design-system/element";
import { kitSigns } from "@/lib/legal-next-signage";

export function KitSignList({ kit }: { kit: string }) {
  const signs = kitSigns(kit);
  if (!signs.length) return null;
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-foreground">Edit in Element</h2>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        These pieces open in the sign editor: retype the wording, move or hide pieces, make new sizes and download print files. The supplied files stay unchanged.
        Pieces marked “first version” were made in Element and need brand approval before use.
      </p>
      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {signs.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-card p-3">
            <span className="text-sm">
              <span className="block font-semibold text-foreground">{s.title}</span>
              <span className="text-xs text-muted-foreground">{s.size}</span>
            </span>
            <Button asChild variant="outline" size="sm">
              <Link to="/events/next/sign-editor/$signId" params={{ signId: s.id }}><PencilRuler className="h-4 w-4" /> Edit</Link>
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
