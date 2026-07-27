// Curated icon library exposed to the deck editor so users can pick an icon
// per item/slide, overriding the label-based auto-match in VariantRenderer.

import {
  Sparkles,
  Workflow,
  Layers3,
  Users,
  ShieldCheck,
  Target,
  Rocket,
  LineChart,
  Search,
  Cog,
  MessageSquareQuote,
  Building2,
  Landmark,
  Cpu,
  Factory,
  Store,
  HeartPulse,
  Car,
  Plane,
  Coins,
  Calendar,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  GitBranch,
  Globe2,
  Lightbulb,
  ClipboardList,
  FileCheck2,
  Send,
  MessagesSquare,
  Mail,
  Phone,
  Timer,
  Trophy,
  Puzzle,
  Handshake,
  Play,
  BarChart3,
  Zap,
  ArrowUpRight,
  Award,
  Book,
  Briefcase,
  Cloud,
  Code2,
  Database,
  FileText,
  Flag,
  Gauge,
  Gift,
  Hammer,
  Heart,
  Home,
  Key,
  Layers,
  Link as LinkIcon,
  Lock,
  Map,
  MessageCircle,
  Package,
  PenTool,
  PieChart,
  Presentation,
  Scale,
  Server,
  Settings,
  Shield,
  Star,
  Table,
  ThumbsUp,
  Truck,
  Video,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type IconLibraryEntry = {
  name: string;
  label: string;
  group: "Core" | "Process" | "People" | "Data" | "Industry" | "Comms" | "Object";
  Icon: LucideIcon;
};

export const ICON_LIBRARY: IconLibraryEntry[] = [
  // Core
  { name: "Sparkles", label: "Sparkle", group: "Core", Icon: Sparkles },
  { name: "Target", label: "Target", group: "Core", Icon: Target },
  { name: "Rocket", label: "Rocket", group: "Core", Icon: Rocket },
  { name: "Lightbulb", label: "Idea", group: "Core", Icon: Lightbulb },
  { name: "Star", label: "Star", group: "Core", Icon: Star },
  { name: "Trophy", label: "Trophy", group: "Core", Icon: Trophy },
  { name: "Award", label: "Award", group: "Core", Icon: Award },
  { name: "Flag", label: "Flag", group: "Core", Icon: Flag },
  { name: "Zap", label: "Momentum", group: "Core", Icon: Zap },
  { name: "Heart", label: "Heart", group: "Core", Icon: Heart },
  { name: "CheckCircle2", label: "Approved", group: "Core", Icon: CheckCircle2 },
  { name: "ThumbsUp", label: "Thumbs up", group: "Core", Icon: ThumbsUp },
  { name: "AlertTriangle", label: "Risk", group: "Core", Icon: AlertTriangle },
  { name: "ShieldCheck", label: "Governance", group: "Core", Icon: ShieldCheck },
  { name: "Shield", label: "Shield", group: "Core", Icon: Shield },
  { name: "Lock", label: "Lock", group: "Core", Icon: Lock },
  { name: "Key", label: "Key", group: "Core", Icon: Key },
  { name: "Puzzle", label: "Puzzle piece", group: "Core", Icon: Puzzle },
  { name: "ArrowRight", label: "Arrow", group: "Core", Icon: ArrowRight },
  { name: "ArrowUpRight", label: "Growth arrow", group: "Core", Icon: ArrowUpRight },

  // Process
  { name: "Workflow", label: "Workflow", group: "Process", Icon: Workflow },
  { name: "Layers3", label: "Layered stack", group: "Process", Icon: Layers3 },
  { name: "Layers", label: "Layers", group: "Process", Icon: Layers },
  { name: "GitBranch", label: "Branch / integrate", group: "Process", Icon: GitBranch },
  { name: "ClipboardList", label: "Intake", group: "Process", Icon: ClipboardList },
  { name: "FileCheck2", label: "Review", group: "Process", Icon: FileCheck2 },
  { name: "Send", label: "Deliver", group: "Process", Icon: Send },
  { name: "Play", label: "Start", group: "Process", Icon: Play },
  { name: "Timer", label: "Time / speed", group: "Process", Icon: Timer },
  { name: "Calendar", label: "Calendar", group: "Process", Icon: Calendar },
  { name: "Cog", label: "Configure", group: "Process", Icon: Cog },
  { name: "Settings", label: "Settings", group: "Process", Icon: Settings },
  { name: "Wrench", label: "Wrench", group: "Process", Icon: Wrench },
  { name: "Hammer", label: "Build", group: "Process", Icon: Hammer },
  { name: "PenTool", label: "Design", group: "Process", Icon: PenTool },
  { name: "Search", label: "Discover", group: "Process", Icon: Search },
  { name: "TrendingUp", label: "Grow", group: "Process", Icon: TrendingUp },

  // People
  { name: "Users", label: "Team", group: "People", Icon: Users },
  { name: "Handshake", label: "Partnership", group: "People", Icon: Handshake },
  { name: "MessageSquareQuote", label: "Testimonial", group: "People", Icon: MessageSquareQuote },
  { name: "MessagesSquare", label: "Support", group: "People", Icon: MessagesSquare },
  { name: "MessageCircle", label: "Conversation", group: "People", Icon: MessageCircle },
  { name: "Mail", label: "Email", group: "People", Icon: Mail },
  { name: "Phone", label: "Phone", group: "People", Icon: Phone },
  { name: "Presentation", label: "Presentation", group: "People", Icon: Presentation },
  { name: "Book", label: "Learn", group: "People", Icon: Book },

  // Data
  { name: "LineChart", label: "Trend line", group: "Data", Icon: LineChart },
  { name: "BarChart3", label: "Bar chart", group: "Data", Icon: BarChart3 },
  { name: "PieChart", label: "Pie chart", group: "Data", Icon: PieChart },
  { name: "Gauge", label: "Gauge / KPI", group: "Data", Icon: Gauge },
  { name: "Database", label: "Database", group: "Data", Icon: Database },
  { name: "Table", label: "Table", group: "Data", Icon: Table },
  { name: "FileText", label: "Document", group: "Data", Icon: FileText },
  { name: "Server", label: "Server", group: "Data", Icon: Server },
  { name: "Cloud", label: "Cloud", group: "Data", Icon: Cloud },
  { name: "Code2", label: "Code", group: "Data", Icon: Code2 },
  { name: "Cpu", label: "Compute / AI", group: "Data", Icon: Cpu },
  { name: "LinkIcon", label: "Link", group: "Data", Icon: LinkIcon },

  // Industry
  { name: "Building2", label: "Enterprise", group: "Industry", Icon: Building2 },
  { name: "Landmark", label: "Finance", group: "Industry", Icon: Landmark },
  { name: "HeartPulse", label: "Life sciences", group: "Industry", Icon: HeartPulse },
  { name: "Store", label: "Retail", group: "Industry", Icon: Store },
  { name: "Factory", label: "Industrial", group: "Industry", Icon: Factory },
  { name: "Car", label: "Automotive", group: "Industry", Icon: Car },
  { name: "Plane", label: "Travel", group: "Industry", Icon: Plane },
  { name: "Truck", label: "Logistics", group: "Industry", Icon: Truck },
  { name: "Globe2", label: "Global", group: "Industry", Icon: Globe2 },
  { name: "Map", label: "Map", group: "Industry", Icon: Map },
  { name: "Scale", label: "Legal", group: "Industry", Icon: Scale },
  { name: "Briefcase", label: "Business", group: "Industry", Icon: Briefcase },
  { name: "Home", label: "Home", group: "Industry", Icon: Home },
  { name: "Video", label: "Video / media", group: "Industry", Icon: Video },

  // Object
  { name: "Coins", label: "Cost", group: "Object", Icon: Coins },
  { name: "Wallet", label: "Wallet", group: "Object", Icon: Wallet },
  { name: "Gift", label: "Gift", group: "Object", Icon: Gift },
  { name: "Package", label: "Package", group: "Object", Icon: Package },
];

const BY_NAME: Record<string, LucideIcon> = Object.fromEntries(
  ICON_LIBRARY.map((e) => [e.name, e.Icon]),
);

export function iconByName(name: string | undefined | null): LucideIcon | null {
  if (!name) return null;
  return BY_NAME[name] ?? null;
}

/**
 * Parse a `pack:name` icon reference (e.g. "lucide:home", "ph:rocket").
 * Returns null for plain curated names — those go through `iconByName`.
 */
export function parseIconRef(
  ref: string | undefined | null,
): { packId: string; name: string } | null {
  if (!ref) return null;
  const idx = ref.indexOf(":");
  if (idx <= 0 || idx === ref.length - 1) return null;
  return { packId: ref.slice(0, idx), name: ref.slice(idx + 1) };
}

export const ICON_GROUPS: Array<IconLibraryEntry["group"]> = [
  "Core",
  "Process",
  "People",
  "Data",
  "Industry",
  "Comms",
  "Object",
];
