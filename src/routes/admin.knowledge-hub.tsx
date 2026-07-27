import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  Sparkles,
  Database,
  FolderKanban,
  ClipboardCheck,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/admin/knowledge-hub")({
  head: () => ({
    meta: [
      { title: "Knowledge hub · Admin · TransPerfect Modular" },
      {
        name: "description",
        content:
          "Unified knowledge workspace: browse, ask Oracle, manage the KB, and review approvals.",
      },
    ],
  }),
  component: MasterKnowledgeHub,
});

type Card = { to: string; label: string; description: string; icon: typeof BookOpen };

const cards: Card[] = [
  {
    to: "/knowledge",
    label: "Browse entries",
    description:
      "Division-scoped knowledge entries — owned, shared, and global across TransPerfect.",
    icon: BookOpen,
  },
  {
    to: "/knowledge/ask",
    label: "Ask Oracle",
    description:
      "Chat the knowledge base — cited answers from Oracle KB, entries, and brand chunks.",
    icon: Sparkles,
  },
  {
    to: "/admin/oracle",
    label: "Oracle KB",
    description: "Curate imported Oracle entries, sync into the main KB, edit metadata.",
    icon: Database,
  },
  {
    to: "/admin/knowledge",
    label: "KB manager",
    description: "Ingest, chunk, and tag brand PDFs and source decks feeding retrieval.",
    icon: FolderKanban,
  },
  {
    to: "/admin/approvals",
    label: "Approvals queue",
    description: "Review submitted knowledgebase entries before they go global.",
    icon: ClipboardCheck,
  },
];

function MasterKnowledgeHub() {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.3em] text-black/50 dark:text-white/50">
        Knowledge hub
      </div>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#03002C] dark:text-white">
        Master knowledge
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-black/60 dark:text-white/60">
        Every knowledge surface — browse, ask, ingest, curate, approve — organized in one console.
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
                  <ArrowRight
                    size={14}
                    className="opacity-40 transition group-hover:translate-x-0.5 group-hover:opacity-100"
                  />
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
