/** v221 compatibility: display names change; saved names and source keys do not. */
export const SPXL_PROJECT = "Example: Templates";
export const SPXL_PROJECT_WAS = "Example: Spectrum templates";
export const SPXT_PROJECT = "Template masters";
export const SPXT_PROJECT_WAS = "Spectrum template masters";

export const TEMPLATE_NAV = {
  key: "spectrum",
  label: "Templates",
  iconKey: "nav-spx",
  order: 4,
  to: "/library/print",
} as const;

export interface TemplateProjectReference {
  name: string;
  deletedAt?: unknown;
}

/** Return the first live match in existing order; never mutate a saved project. */
export function findTemplateProject<T extends TemplateProjectReference>(
  projects: readonly T[] | null | undefined,
  kind: "example" | "masters",
): T | undefined {
  const names = kind === "example"
    ? [SPXL_PROJECT, SPXL_PROJECT_WAS]
    : [SPXT_PROJECT, SPXT_PROJECT_WAS];
  return projects?.find(project => !project.deletedAt && names.includes(project.name));
}

/** Shared spoken-name adapter for the source agent's eventual goTo integration. */
export function templateDestination(spokenName: string): typeof TEMPLATE_NAV | undefined {
  const name = spokenName.trim().toLowerCase();
  return name === "templates" || name === "spectrum" ? TEMPLATE_NAV : undefined;
}