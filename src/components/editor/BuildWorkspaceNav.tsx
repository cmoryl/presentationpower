import { Link } from "@tanstack/react-router";
import { Layers, Printer, PanelsTopLeft, Share2, FolderOpen, ClipboardCheck } from "lucide-react";

export interface BuildWorkspaceNavProps {
  active: "modules" | "print" | "social" | "slides";
  className?: string;
}

const AREAS = [
  { id: "modules", label: "Modules", to: "/library", icon: Layers },
  { id: "print", label: "Print", to: "/library/print", icon: Printer },
  { id: "social", label: "Social", to: "/social", icon: Share2 },
  { id: "slides", label: "Slides", to: "/decks", icon: PanelsTopLeft },
] as const;

export function BuildWorkspaceNav({ active, className = "" }: BuildWorkspaceNavProps) {
  return <nav aria-label="Build areas" className={`flex max-w-full items-center gap-1 overflow-x-auto border-b border-border [scrollbar-width:thin] ${className}`}>
    {AREAS.map(area => <Link key={area.id} to={area.to} aria-current={active === area.id ? "page" : undefined} className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${active === area.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}><area.icon size={16} />{area.label}</Link>)}
    <span className="mx-2 h-5 w-px shrink-0 bg-border" aria-hidden="true" />
    <Link to="/files" className="inline-flex shrink-0 items-center gap-2 px-3 py-3 text-sm text-muted-foreground hover:text-foreground"><FolderOpen size={16} />My work</Link>
    <Link to="/approvals" className="inline-flex shrink-0 items-center gap-2 px-3 py-3 text-sm text-muted-foreground hover:text-foreground"><ClipboardCheck size={16} />Review</Link>
  </nav>;
}