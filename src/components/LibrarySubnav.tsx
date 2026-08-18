import { Link } from "@tanstack/react-router";
import { Layers, Package, Bookmark, Printer, Palette } from "lucide-react";

type Item = {
  to:
    | "/library"
    | "/library/industry-backgrounds"
    | "/library/my"
    | "/library/imported"
    | "/library/print";
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
};

const ITEMS: Item[] = [
  { to: "/library", label: "Modules", icon: <Layers size={12} />, exact: true },
  {
    to: "/library/industry-backgrounds",
    label: "Backgrounds",
    icon: <Palette size={12} />,
  },
  { to: "/library/my", label: "My library", icon: <Bookmark size={12} /> },
  { to: "/library/imported", label: "Imported slides", icon: <Package size={12} /> },
  { to: "/library/print", label: "Print templates", icon: <Printer size={12} /> },
];

export function LibrarySubnav({ active }: { active: Item["to"] }) {
  return (
    <nav aria-label="Library sections" className="flex flex-wrap items-center gap-1.5">
      {ITEMS.map((it) => {
        const isActive = it.to === active;
        return (
          <Link
            key={it.to}
            to={it.to}
            className={
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition " +
              (isActive
                ? "border-[#003FC7] bg-[#003FC7] text-white"
                : "border-black/15 bg-white text-black/70 hover:border-[#003FC7] hover:text-[#003FC7]")
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
