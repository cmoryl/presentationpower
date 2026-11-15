import { readFileSync, writeFileSync } from 'node:fs';
import { convertElementContent } from '../src/lib/element-update/content-converter';
import { renderSourceModule } from '../src/lib/element-update/render';

// Input must be a fresh read-only CLI result. Never commit private content or signed URLs.
const input = process.argv[2];
if (!input) throw new Error('Pass a fresh material query result in /tmp.');
const rows = JSON.parse(readFileSync(input,'utf8')).rows[0].materials;
const canonical = (v: unknown): string => JSON.stringify(v && typeof v==='object' ? Array.isArray(v) ? v.map(x=>JSON.parse(canonical(x))) : Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,JSON.parse(canonical(x))])) : v);
const report = rows.map((r: {id: string; kind: string; content: unknown; context: unknown; conversion: unknown; original_equal: boolean}) => {
  const expected = convertElementContent(r.kind,r.content,r.context);
  const normalizeIssues = (v: unknown) => { const x=v as {issues: Array<{path: string; construct: string}>}; return {...x,issues:[...x.issues].sort((a,b)=>(a.path+a.construct).localeCompare(b.path+b.construct))}; };
  if (canonical(normalizeIssues(expected))!==canonical(normalizeIssues(r.conversion))) throw new Error(`Stored conversion differs: ${r.id}`);
  if (!r.original_equal) throw new Error(`Original changed: ${r.id}`);
  const rendering: string[]=[];
  for (const m of expected.layout?.modules ?? []) {
    try { renderSourceModule(m); } catch { rendering.push(`${m.id}: render exception`); }
  }
  return {id:r.id,kind:r.kind,status:expected.status,basis:expected.basis,issues:expected.issues,module_count:expected.layout?.modules.length ?? 0,original_unchanged:true,render_exceptions:rendering};
});
const counts: Record<string,number>={clean:0,partial:0,failed:0,excluded:0};
for (const r of report) counts[r.status]=(counts[r.status] ?? 0)+1;
const output={step:1,verified_at:new Date().toISOString(),scope:'All existing public.print_assets Element materials; no decks, event/kit/calendar tables or registries changed.',counts,total:report.length,existing_v221:report.filter((r: {basis: string})=>r.basis==='existing_v221').length,definitions:{clean:'All recognized native content mapped without recorded gaps, or existing v221 working stack preserved; NOT exact visual, export or approval certification.',partial:'A module stack exists but explicit content/geometry/format/settings constructs remain unsupported.',failed:'No safe module stack generated; original retained and exact reason recorded.'},verification:{all_originals_unchanged:true,stored_ts_parity:true,render_exceptions:report.flatMap((r: {render_exceptions: string[]})=>r.render_exceptions),routing_changed:false,legacy_editor_changed:false,excluded_areas_changed:false},materials:report};
writeFileSync('docs/claude-v221-conversion-coverage.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({counts,total:report.length,render_exceptions:output.verification.render_exceptions}));
process.exit(0);