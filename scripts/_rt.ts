import { createClient } from "@supabase/supabase-js";
import { mapStoredImportedDeck } from "../src/lib/imported-to-deck";
const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth:{persistSession:false} , global:{fetch:(i:any,x:any)=>{const h=new Headers(x?.headers);h.delete("Authorization");h.set("apikey",process.env.SUPABASE_SERVICE_ROLE_KEY!);return fetch(i,{...x,headers:h});}}});
const { data } = await sb.from("imported_decks").select("id, original_filename, theme, slides").order("created_at",{ascending:false}).limit(3);
for (const d of data as any[]) {
  const out = mapStoredImportedDeck({ ...d, slide_count: d.slides.length } as any, { reinterpret: true });
  console.log(`\n== ${d.original_filename} (${out.length})`);
  out.forEach((s,i)=>console.log(`  ${String(i+1).padStart(2)} ${s.variantId.padEnd(24)} ${s.rationale}`));
}
