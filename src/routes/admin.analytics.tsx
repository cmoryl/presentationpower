import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Bot, Image as ImageIcon, FlaskConical, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Master analytics · Admin · TransPerfect Modular" },
      { name: "description", content: "Unified analytics: deck engagement, AI usage, imagery, and A/B experiments." },
    ],
  }),
  component: MasterAnalyticsHub,
});

type Card = {
  to: string;
  label: string;
  description: string;
  icon: typeof BarChart3;
};

const cards: Card[] = [
  {
    to: "/analytics",
    label: "Deck engagement",
    description: "Views, unique viewers, share activity, and top-performing decks across the library.",
    icon: BarChart3,
  },
  {
    to: "/admin/ai",
    label: "AI usage & cost",
    description: "Requests by model, tokens, cost per feature, and error rates across the platform.",
    icon: Bot,
  },
  {
    to: "/admin/imagery-analytics",
    label: "Imagery analytics",
    description: "Image generations, adoption in decks, and cost by brand.",
    icon: ImageIcon,
  },
  {
    to: "/admin/ab",
    label: "A/B color testing",
    description: "Palette experiments, exposure counts, and conversion signal by variant.",
    icon: FlaskConical,
  },
];

function MasterAnalyticsHub() {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.3em] text-black/50 dark:text-white/50">Master analytics</div>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#03002C] dark:text-white">Analytics command</h1>
      <p className="mt-2 max-w-2xl text-sm text-black/60 dark:text-white/60">
        Every signal, one place. Jump into deck engagement, AI cost, imagery adoption, or experiments.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.to}
              to={c.to as never}
              className="group flex items-start gap-4 rounded-2xl border border-black/10 bg-white/70 p-5 backdrop-blur transition hover:-translate-y-0.5 hover:border-[#003FC7]/40 hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-[#A1FBF9]/40 dark:hover:bg-white/[0.06]"
            >
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#03002C] text-white dark:bg-white/10">
                <Icon size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-base font-semibold text-[#03002C] dark:text-white">
                  {c.label}
                  <ArrowRight size={14} className="opacity-40 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                </div>
                <p className="mt-1 text-sm text-black/60 dark:text-white/60">{c.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
