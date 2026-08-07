// Curated icon set for oversized icon stat figures.
//
// Deliberately a fixed, hand-picked map rather than the whole lucide catalog:
// slides only ever need business/marketing metaphors, and a curated map keeps
// the slide bundle small while giving pickers a labelled, groupable list.

import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarClock,
  Clock,
  Coins,
  Compass,
  DollarSign,
  Gauge,
  Globe2,
  Handshake,
  Languages,
  LineChart,
  MapPin,
  Megaphone,
  MessagesSquare,
  Percent,
  PieChart,
  Rocket,
  Scale,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Timer,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type StatIconName =
  | "activity"
  | "arrow-down-right"
  | "arrow-up-right"
  | "award"
  | "badge-check"
  | "bar-chart"
  | "building"
  | "calendar-clock"
  | "clock"
  | "coins"
  | "compass"
  | "dollar"
  | "gauge"
  | "globe"
  | "handshake"
  | "languages"
  | "line-chart"
  | "map-pin"
  | "megaphone"
  | "messages"
  | "percent"
  | "pie-chart"
  | "rocket"
  | "scale"
  | "shield-check"
  | "sparkles"
  | "star"
  | "target"
  | "timer"
  | "trending-down"
  | "trending-up"
  | "trophy"
  | "users"
  | "zap";

export type StatIconGroup = "growth" | "money" | "reach" | "trust" | "time" | "performance";

export type StatIconPreset = {
  id: StatIconName;
  label: string;
  group: StatIconGroup;
  Icon: LucideIcon;
};

export const STAT_ICON_PRESETS: StatIconPreset[] = [
  { id: "trending-up", label: "Trending up", group: "growth", Icon: TrendingUp },
  { id: "trending-down", label: "Trending down", group: "growth", Icon: TrendingDown },
  { id: "arrow-up-right", label: "Arrow up", group: "growth", Icon: ArrowUpRight },
  { id: "arrow-down-right", label: "Arrow down", group: "growth", Icon: ArrowDownRight },
  { id: "rocket", label: "Rocket", group: "growth", Icon: Rocket },
  { id: "sparkles", label: "Sparkles", group: "growth", Icon: Sparkles },

  { id: "dollar", label: "Dollar", group: "money", Icon: DollarSign },
  { id: "coins", label: "Coins", group: "money", Icon: Coins },
  { id: "percent", label: "Percent", group: "money", Icon: Percent },
  { id: "scale", label: "Scale", group: "money", Icon: Scale },

  { id: "globe", label: "Globe", group: "reach", Icon: Globe2 },
  { id: "map-pin", label: "Map pin", group: "reach", Icon: MapPin },
  { id: "languages", label: "Languages", group: "reach", Icon: Languages },
  { id: "users", label: "Users", group: "reach", Icon: Users },
  { id: "building", label: "Enterprise", group: "reach", Icon: Building2 },
  { id: "megaphone", label: "Megaphone", group: "reach", Icon: Megaphone },
  { id: "messages", label: "Conversations", group: "reach", Icon: MessagesSquare },

  { id: "shield-check", label: "Shield", group: "trust", Icon: ShieldCheck },
  { id: "badge-check", label: "Verified", group: "trust", Icon: BadgeCheck },
  { id: "award", label: "Award", group: "trust", Icon: Award },
  { id: "trophy", label: "Trophy", group: "trust", Icon: Trophy },
  { id: "star", label: "Star", group: "trust", Icon: Star },
  { id: "handshake", label: "Partnership", group: "trust", Icon: Handshake },

  { id: "clock", label: "Clock", group: "time", Icon: Clock },
  { id: "timer", label: "Timer", group: "time", Icon: Timer },
  { id: "calendar-clock", label: "Schedule", group: "time", Icon: CalendarClock },

  { id: "gauge", label: "Gauge", group: "performance", Icon: Gauge },
  { id: "activity", label: "Activity", group: "performance", Icon: Activity },
  { id: "target", label: "Target", group: "performance", Icon: Target },
  { id: "zap", label: "Speed", group: "performance", Icon: Zap },
  { id: "bar-chart", label: "Bar chart", group: "performance", Icon: BarChart3 },
  { id: "line-chart", label: "Line chart", group: "performance", Icon: LineChart },
  { id: "pie-chart", label: "Pie chart", group: "performance", Icon: PieChart },
  { id: "compass", label: "Compass", group: "performance", Icon: Compass },
];

export const STAT_ICON_NAMES: StatIconName[] = STAT_ICON_PRESETS.map((p) => p.id);

export function isStatIconName(value: unknown): value is StatIconName {
  return typeof value === "string" && (STAT_ICON_NAMES as string[]).includes(value);
}

/** Resolve an icon name (tolerant of PascalCase / spaced aliases) to a preset. */
export function statIconPreset(name?: string | null): StatIconPreset | null {
  if (!name) return null;
  const norm = name
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
  return (
    STAT_ICON_PRESETS.find((p) => p.id === norm) ??
    STAT_ICON_PRESETS.find((p) => p.label.toLowerCase() === name.trim().toLowerCase()) ??
    null
  );
}

/** Heuristic icon for a stat when the author didn't pick one. */
export function inferStatIcon(input: {
  value?: string;
  unit?: string;
  label?: string;
}): StatIconName {
  const hay = `${input.value ?? ""} ${input.unit ?? ""} ${input.label ?? ""}`.toLowerCase();
  const rules: Array<[RegExp, StatIconName]> = [
    [/\b(down|reduc|lower|less|cut|churn|-\d)/, "trending-down"],
    [/(revenue|\$|usd|eur|cost|spend|budget|roi|arr|acv|pipeline)/, "dollar"],
    [/(language|locale|translat|word|linguis)/, "languages"],
    [/(countr|market|global|region|worldwide)/, "globe"],
    [/(office|city|location|site)/, "map-pin"],
    [/(client|customer|user|people|team|attendee|audience)/, "users"],
    [/(enterprise|brand|compan|fortune)/, "building"],
    [/(hour|day|week|month|time|turnaround|sla|speed|faster)/, "timer"],
    [/(nps|satisfaction|rating|score|csat)/, "star"],
    [/(secure|complian|iso|risk|privacy)/, "shield-check"],
    [/(award|winner|leader|rank)/, "trophy"],
    [/(accura|quality|precision|target|goal)/, "target"],
    [/(uptime|availability|performance|throughput|capacity)/, "gauge"],
    [/(growth|increase|lift|up|more|expand|%)/, "trending-up"],
  ];
  for (const [re, icon] of rules) if (re.test(hay)) return icon;
  return "bar-chart";
}
