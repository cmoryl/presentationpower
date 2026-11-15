/** Shared build destinations; saved records and approval systems remain authoritative. */
export const BUILD_DESTINATIONS = [
  { id: "start", label: "Build", to: "/build", icon: "start" },
  { id: "modules", label: "Modules", to: "/library", icon: "modules" },
  { id: "print", label: "Templates", to: "/library/print", icon: "print" },
  { id: "work", label: "My work", to: "/files", icon: "work" },
  { id: "review", label: "Review", to: "/approvals", icon: "review" },
] as const;
export type BuildArea = typeof BUILD_DESTINATIONS[number]["id"] | "social" | "slides";
export const BUILD_CHANNELS = [
  { id: "print", label: "Print", to: "/library/print", format: "letter" },
  { id: "social", label: "Social", to: "/social/modules", format: "square" },
  { id: "slides", label: "Slides", to: "/decks", format: "slide" },
  { id: "events", label: "Events & brand kits", to: "/events", format: undefined },
] as const;