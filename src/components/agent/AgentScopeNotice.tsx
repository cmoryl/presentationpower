// Sales-enablement / viewer accounts can talk to every Element agent — this
// strip tells them, in plain language, what the agent will and won't do at
// their permission level.
import { ShieldCheck } from "lucide-react";
import { useWorkspaceCapabilities } from "@/hooks/use-workspace-capabilities";

export function AgentScopeNotice({ surface }: { surface: string }) {
  const caps = useWorkspaceCapabilities();
  if (!caps.createOnly) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#003FC7]/20 bg-[#E0E8F5]/70 px-4 py-3 text-[13px] leading-[1.45] text-[#03002C] dark:border-white/15 dark:bg-white/[0.06] dark:text-white/85">
      <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#003FC7] dark:text-[#A1FBF9]" />
      <p>
        <span className="font-semibold">Approved sets only.</span> The {surface} builds your{" "}
        {surface === "presentation agent" ? "deck" : "asset"} from pre-approved templates, modules
        and brand assets — ask for any copy, data, client or structure you need. Changes to the
        underlying design, templates or brand assets stay with admin and design.
      </p>
    </div>
  );
}
