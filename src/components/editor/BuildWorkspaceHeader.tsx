import type { ReactNode } from "react";
import { BuildWorkspaceNav, type BuildWorkspaceNavProps } from "./BuildWorkspaceNav";

export interface BuildWorkspaceHeaderProps {
  active: BuildWorkspaceNavProps["active"];
  title: string;
  actions?: ReactNode;
  children?: ReactNode;
}

export function BuildWorkspaceHeader({ active, title, actions, children }: BuildWorkspaceHeaderProps) {
  return <header className="mb-6 border-b border-border bg-background">
    <BuildWorkspaceNav active={active} />
    <div className="flex flex-wrap items-center justify-between gap-4 py-6">
      <div><p className="mb-2 text-xs font-medium text-muted-foreground">TransPerfect Element</p><h1 className="text-3xl font-semibold leading-tight text-foreground">{title}</h1></div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
    {children && <div className="pb-4">{children}</div>}
  </header>;
}