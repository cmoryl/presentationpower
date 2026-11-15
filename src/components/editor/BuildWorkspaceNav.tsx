import { Link } from "@tanstack/react-router";
import { Layers, Printer, PanelsTopLeft, Share2, FolderOpen, ClipboardCheck, Hammer } from "lucide-react";
import { BUILD_DESTINATIONS, BUILD_CHANNELS, type BuildArea } from "@/lib/build-workspace";
import { audienceFor, showBuildDestination } from "@/lib/role-nav";
import { useWorkspacePersona } from "@/hooks/use-workspace-persona";

export interface BuildWorkspaceNavProps {
  active: BuildArea;
  className?: string;
}

const ICONS = { start: Hammer, modules: Layers, print: Printer, work: FolderOpen, review: ClipboardCheck };

export function BuildWorkspaceNav({ active, className = "" }: BuildWorkspaceNavProps) {
  const { roles, isLoading } = useWorkspacePersona(); const audience = audienceFor(roles, isLoading);
  return <nav aria-label="Build areas" className={`flex max-w-full items-center gap-1 overflow-x-auto border-b border-border [scrollbar-width:thin] ${className}`}>
    {BUILD_DESTINATIONS.filter(area => showBuildDestination(area.id, audience)).map(area => { const Icon = ICONS[area.icon]; return <Link key={area.id} to={area.to} aria-current={active === area.id ? "page" : undefined} className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${active === area.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}><Icon size={16} />{area.label}</Link>; })}
    {(active === "social" || active === "slides") && BUILD_CHANNELS.filter(c => c.id === active).map(c => <Link key={c.id} to={c.to} aria-current="page" className="inline-flex shrink-0 items-center gap-2 border-b-2 border-primary px-3 py-3 text-sm font-medium text-primary">{active === "social" ? <Share2 size={16} /> : <PanelsTopLeft size={16} />}{c.label}</Link>)}
  </nav>;
}