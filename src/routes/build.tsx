import { createFileRoute, Link } from "@tanstack/react-router";
import { Layers, LayoutTemplate, FolderOpen, ArrowRight, ClipboardCheck, Sparkles, Printer, Share2, PanelsTopLeft, CalendarDays } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { BuildWorkspaceHeader } from "@/components/editor/BuildWorkspaceHeader";
import { BUILD_CHANNELS } from "@/lib/build-workspace";
import { useWorkspacePersona } from "@/hooks/use-workspace-persona";
import { audienceFor, showBuildDestination } from "@/lib/role-nav";

export const Route = createFileRoute("/build")({
  head: () => ({ meta: [
    { title: "Build workspace · TransPerfect Element" },
    { name: "description", content: "Start an Element material, reuse saved work, choose modules and sizes, and prepare reviewed deliverables." },
    { property: "og:title", content: "Build workspace · TransPerfect Element" },
    { property: "og:description", content: "Your Element build workspace for modules, templates, saved materials and reviews." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: BuildWorkspace,
});

function BuildWorkspace() {
  const { roles, isLoading } = useWorkspacePersona(); const audience = audienceFor(roles, isLoading);
  const choices = [
    { to: "/library/print", title: "Start from a template", icon: LayoutTemplate },
    ...(showBuildDestination("modules", audience) ? [{ to: "/library", title: "Compose with modules", icon: Layers }] : []),
    { to: "/files", title: "Continue saved work", icon: FolderOpen },
    ...(showBuildDestination("review", audience) ? [{ to: "/approvals", title: "Review and approve", icon: ClipboardCheck }] : []),
  ] as const;
  const icons = { print: Printer, social: Share2, slides: PanelsTopLeft, events: CalendarDays };
  return <AppShell><BuildWorkspaceHeader active="start" title="Build workspace" />
    <section aria-label="Start building" className="grid gap-4 sm:grid-cols-2">{choices.map(choice => <Link key={choice.to} to={choice.to} className="group flex min-h-32 items-center gap-4 rounded-md border border-border bg-card p-6 transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-ring"><choice.icon className="size-7 shrink-0 text-muted-foreground" /><h2 className="flex-1 text-xl font-semibold">{choice.title}</h2><ArrowRight className="size-5 shrink-0 text-muted-foreground group-hover:text-primary" /></Link>)}</section>
    <section className="mt-10 border-t border-border pt-6" aria-labelledby="build-output"><h2 id="build-output" className="mb-4 text-lg font-semibold">Materials & outputs</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{BUILD_CHANNELS.map(channel => { const Icon = icons[channel.id]; const target = channel.id === "social" && !showBuildDestination("modules", audience) ? "/social" : channel.id === "slides" && audience.createOnly ? "/agent" : channel.to; return <Link key={channel.id} to={target} className="flex items-center gap-3 border-b border-border py-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring"><Icon size={19} /><span className="flex-1">{channel.label}</span><ArrowRight size={16} /></Link>; })}</div></section>
    <section className="mt-8 border-t border-border pt-6"><h2 className="mb-3 text-lg font-semibold">Build with an agent</h2><div className="flex flex-wrap gap-5">{[{ to: "/agent", label: "Presentation" }, { to: "/print-agent", label: "Print" }, { to: "/social-agent", label: "Social" }, { to: "/events-agent", label: "Events" }].map(a => <Link key={a.to} to={a.to} className="inline-flex items-center gap-2 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring"><Sparkles size={16} />{a.label}<ArrowRight size={14} /></Link>)}</div></section>
  </AppShell>;
}