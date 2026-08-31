import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages } from "ai";
import { dropUnknownToolParts } from "@/lib/agent/repair-tool-parts";
import { repairDanglingToolParts } from "@/lib/agent/repair-tool-parts";
import { buildAgentToolSet, toolContextForToken } from "@/lib/agent/mcp-bridge";
import { buildOutlineToolSet } from "@/lib/agent/outline-tool";
import { buildDesignKnowledgeToolSet } from "@/lib/agent/design-knowledge";
import { buildDataVisualToolSet } from "@/lib/agent/data-visuals";
import { buildStatsMappingToolSet } from "@/lib/agent/stats-mapping";
import { buildSectionTemplateToolSet } from "@/lib/agent/section-templates-tool";
import { buildLayoutArbiterToolSet } from "@/lib/agent/layout-arbiter-tool";
const names = Object.keys({ ...buildAgentToolSet(toolContextForToken("t","u")), ...buildOutlineToolSet(), ...buildDesignKnowledgeToolSet(), ...buildDataVisualToolSet(), ...buildStatsMappingToolSet(), ...buildSectionTemplateToolSet(), ...buildLayoutArbiterToolSet() });
const sb = createClient(process.env["VITE_SUPABASE_URL"]!, process.env["SUPABASE_SERVICE_ROLE_KEY"]!);
const { data: threads } = await sb.from("agent_threads").select("id").order("created_at",{ascending:false}).limit(1);
const { data: msgs } = await sb.from("agent_messages").select("role,parts").eq("thread_id", threads![0]!.id).order("created_at");
const ui = (msgs??[]).map((m:any,i:number)=>({ id:"m"+i, role:m.role, parts:m.parts }));
const cleaned = dropUnknownToolParts(repairDanglingToolParts(ui as any), names);
const model = await convertToModelMessages(cleaned as any);
for (const m of model as any[]) {
  const c=(m as any).content;
  console.log(m.role, Array.isArray(c)? c.map((p:any)=>p.type+(p.toolName?":"+p.toolName:"")+(p.type==="text"?`(${(p.text||"").length})`:"")).join(",") : JSON.stringify(c).slice(0,80));
}
require("fs").writeFileSync("/tmp/probe/messages.json", JSON.stringify(model));
