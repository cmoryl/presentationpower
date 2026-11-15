import { Link } from "@tanstack/react-router";
import { Layers, Package, Bookmark, Printer, Palette, FileText, Image } from "lucide-react";

type Target =
  | "/library"
  | "/library/audit"
  | "/library/spec"
  | "/library/industry-backgrounds"
  | "/library/my"
  | "/library/imported"
  | "/library/print"
  | "/library/print/modules"
  | "/library/print/heroes";

type Item = {
  to: Target;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
};

const PRESENTATION_ITEMS: Item[] = [
  { to: "/library", label: "Modules", icon: <Layers size={12} />, exact: true },
  { to: "/library/audit", label: "Guide audit", icon: <FileText size={12} /> },
  { to: "/library/spec", label: "Living spec", icon: <FileText size={12} /> },
  {
    to: "/library/industry-backgrounds",
    label: "Backgrounds",
    icon: <Palette size={12} />,
  },
  { to: "/library/my", label: "My library", icon: <Bookmark size={12} /> },
  { to: "/library/imported", label: "Imported slides", icon: <Package size={12} /> },
  { to: "/library/print", label: "Print templates", icon: <Printer size={12} /> },
];

/**
 * On print routes the "Modules" pill must resolve to the print section-module
 * library, not the presentation module library.
 */
const PRINT_ITEMS: Item[] = [
  { to: "/library/print", label: "Print templates", icon: <Printer size={12} /> },
  { to: "/library/print/modules", label: "Issued modules", icon: <FileText size={12} /> },
  { to: "/library/print/heroes", label: "Hero gallery", icon: <Image size={12} /> },
  { to: "/library", label: "Element modules", icon: <Layers size={12} />, exact: true },
  { to: "/library/my", label: "My library", icon: <Bookmark size={12} /> },
];

export function LibrarySubnav({ active }: { active: Target }) {
  const inPrint = active.startsWith("/library/print");
  const items = inPrint ? PRINT_ITEMS : PRESENTATION_ITEMS;
  return (
    <nav aria-label="Library sections" className="flex max-w-full items-center gap-1 overflow-x-auto [scrollbar-width:thin]">
      {items.map((it) => {
        const isActive = it.to === active;
        return (
          <Link
            key={it.to}
            to={it.to}
            aria-current={isActive ? "page" : undefined}
            className={
              "inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring " +
              (isActive
                ? "bg-muted text-foreground font-semibold"
                : "text-muted-foreground hover:bg-muted hover:text-foreground")
            }
          >
            {it.icon}
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
