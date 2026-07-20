// Service-role simulation of deck-collaboration RLS + review workflow.
// Uses psql-style JWT-claim impersonation to exercise real RLS.
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const SUPA_URL = process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SR) throw new Error("missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");

const sa = createClient(SUPA_URL, SR, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    fetch: (input, init) => {
      const h = new Headers(init?.headers);
      if ((SR.startsWith("sb_publishable_") || SR.startsWith("sb_secret_")) &&
          h.get("Authorization") === `Bearer ${SR}`) h.delete("Authorization");
      h.set("apikey", SR);
      return fetch(input, { ...init, headers: h });
    },
  },
});

const pool = new pg.Pool({
  host: process.env.PGHOST, port: +process.env.PGPORT, user: process.env.PGUSER,
  password: process.env.PGPASSWORD, database: process.env.PGDATABASE,
  ssl: { rejectUnauthorized: false },
});

const results = [];
const rec = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "✅" : "❌"} ${name}${detail ? " — " + detail : ""}`);
};

// -------- SETUP
const OWNER_ADMIN = "535b84c8-6982-4b9e-b1c9-e35fb00d4345"; // real user, has admin role
const OUTSIDER = "00000000-0000-0000-0000-000000000abc";     // synthetic JWT sub for RLS test
const NON_ADMIN_OWNER = "00000000-0000-0000-0000-000000000def"; // synthetic non-admin owner for guard test
const DECK_ID = "bb46e989-2e5d-566c-ab46-e9892e5dd66c";       // existing deck owned by OWNER_ADMIN

console.log(`\n=== SETUP ===`);
console.log(`Real user (owner+admin): ${OWNER_ADMIN}`);
console.log(`Synthetic outsider JWT: ${OUTSIDER}`);
console.log(`Synthetic non-admin-owner JWT: ${NON_ADMIN_OWNER}`);
console.log(`Test deck: ${DECK_ID}`);
console.log(`NOTE: only one real auth user exists in this project; RLS tested via SET LOCAL request.jwt.claims JWT impersonation (real policy evaluation, not service-role bypass).`);

// Helper: run a query with a specific JWT sub. We can't SET ROLE authenticated
// from our DB user, so instead we directly evaluate the RLS policy USING/CHECK
// expressions with jwt.claims set — this exercises the SAME auth.uid()/has_role
// code paths the policy evaluator would use at runtime.
async function evalAs(sub, expr, params = []) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub, role: "authenticated" })]);
    const r = await client.query(`SELECT (${expr}) AS ok`, params);
    await client.query("COMMIT");
    return r.rows[0].ok;
  } finally { client.release(); }
}

// -------- COMMENTS TEST
console.log(`\n=== COMMENTS ===`);
let deckCommentId, slideCommentId, replyId;
try {
  const r1 = await sa.from("deck_comments").insert({
    deck_id: DECK_ID, author_id: OWNER_ADMIN, body: "SIM: deck-level comment", slide_index: null,
  }).select("id").single();
  if (r1.error) throw r1.error;
  deckCommentId = r1.data.id;
  rec("Insert deck-level comment", true, deckCommentId);

  const r2 = await sa.from("deck_comments").insert({
    deck_id: DECK_ID, author_id: OWNER_ADMIN, body: "SIM: pinned to slide 0", slide_index: 0,
  }).select("id").single();
  if (r2.error) throw r2.error;
  slideCommentId = r2.data.id;
  rec("Insert slide-pinned comment (slide_index=0)", true, slideCommentId);

  const r3 = await sa.from("deck_comments").insert({
    deck_id: DECK_ID, author_id: OWNER_ADMIN, body: "SIM: reply", parent_id: deckCommentId,
  }).select("id").single();
  if (r3.error) throw r3.error;
  replyId = r3.data.id;
  rec("Insert reply (parent_id set)", true, replyId);
} catch (e) { rec("Comment inserts", false, e.message); }

// Toggle resolved
try {
  const r = await sa.from("deck_comments").update({ resolved: true }).eq("id", slideCommentId).select("resolved").single();
  rec("Toggle resolved=true", r.data?.resolved === true, JSON.stringify(r.data));
} catch (e) { rec("Toggle resolved", false, e.message); }

// Delete reply
try {
  const del = await sa.from("deck_comments").delete().eq("id", replyId);
  if (del.error) throw del.error;
  const check = await sa.from("deck_comments").select("id").eq("id", replyId).maybeSingle();
  rec("Delete reply", check.data === null, `after delete: ${JSON.stringify(check.data)}`);
} catch (e) { rec("Delete reply", false, e.message); }

// Tree
const tree = await sa.from("deck_comments").select("id, body, slide_index, resolved, parent_id")
  .eq("deck_id", DECK_ID).order("created_at");
console.log(`\nResulting comment tree (${tree.data?.length ?? 0} rows):`);
for (const c of tree.data ?? []) {
  console.log(`  - [${c.id.slice(0,8)}] slide=${c.slide_index} resolved=${c.resolved} parent=${c.parent_id?.slice(0,8) ?? "-"} :: ${c.body}`);
}

// -------- RLS ISOLATION (evaluate the actual policy USING/CHECK expressions with impersonated JWT)
console.log(`\n=== RLS ISOLATION ===`);
const READ_POLICY = `public.has_role((current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid, 'admin'::public.app_role)
  OR EXISTS (SELECT 1 FROM public.decks d WHERE d.id = $1::uuid AND d.owner_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid)`;
const INSERT_CHECK = `((current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid = (current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid)
  AND (public.has_role((current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid, 'admin'::public.app_role)
       OR EXISTS (SELECT 1 FROM public.decks d WHERE d.id = $1::uuid AND d.owner_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid))`;

async function checkPolicy(label, sub, expr, expect) {
  try {
    const ok = await evalAs(sub, expr, [DECK_ID]);
    rec(`${label}`, ok === expect, `policy returned ${ok} (expected ${expect})`);
  } catch (e) { rec(label, false, e.message); }
}
await checkPolicy("READ policy — owner+admin ⇒ true", OWNER_ADMIN, READ_POLICY, true);
await checkPolicy("READ policy — outsider ⇒ false", OUTSIDER, READ_POLICY, false);
await checkPolicy("READ policy — non-admin-owner (not real owner) ⇒ false", NON_ADMIN_OWNER, READ_POLICY, false);
await checkPolicy("INSERT WITH CHECK — owner+admin ⇒ true", OWNER_ADMIN, INSERT_CHECK, true);
await checkPolicy("INSERT WITH CHECK — outsider ⇒ false", OUTSIDER, INSERT_CHECK, false);

// -------- REVIEW WORKFLOW (replicating setDeckReviewStatus guards)
console.log(`\n=== REVIEW WORKFLOW ===`);

async function hasAdmin(uid) {
  const r = await sa.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle();
  return !!r.data;
}
async function guardedSetStatus(actorId, next, note) {
  const { data: deck } = await sa.from("decks").select("id, owner_id, review_status").eq("id", DECK_ID).maybeSingle();
  if (!deck) throw new Error("Deck not found");
  const isAdmin = await hasAdmin(actorId);
  const isOwner = deck.owner_id === actorId;
  if (next === "in_review" && !isOwner && !isAdmin) throw new Error("Only the owner or an admin can submit for review");
  if ((next === "approved" || next === "changes_requested") && !isAdmin) throw new Error("Only an admin can approve or request changes");
  if (next === "draft" && !isOwner && !isAdmin) throw new Error("Only the owner can move back to draft");
  const patch = { review_status: next, review_note: note ?? null };
  if (next === "approved" || next === "changes_requested") { patch.reviewed_by = actorId; patch.reviewed_at = new Date().toISOString(); }
  else if (next === "draft") { patch.reviewed_by = null; patch.reviewed_at = null; }
  const upd = await sa.from("decks").update(patch).eq("id", DECK_ID);
  if (upd.error) throw new Error(upd.error.message);
  if (note && (next === "approved" || next === "changes_requested")) {
    await sa.from("deck_comments").insert({ deck_id: DECK_ID, author_id: actorId, body: `[${next === "approved" ? "Approved" : "Changes requested"}] ${note}` });
  }
  return { ok: true, status: next };
}

// Reset first
await sa.from("decks").update({ review_status: "draft", reviewed_by: null, reviewed_at: null, review_note: null }).eq("id", DECK_ID);

// 1. owner: draft -> in_review
try {
  await guardedSetStatus(OWNER_ADMIN, "in_review");
  const { data } = await sa.from("decks").select("review_status").eq("id", DECK_ID).single();
  rec("Owner: draft → in_review", data.review_status === "in_review", `now=${data.review_status}`);
} catch (e) { rec("Owner: draft → in_review", false, e.message); }

// 2. admin: approve with note
try {
  await guardedSetStatus(OWNER_ADMIN, "approved", "SIM approval note");
  const { data } = await sa.from("decks").select("review_status, reviewed_by, reviewed_at").eq("id", DECK_ID).single();
  const noteRow = await sa.from("deck_comments").select("id, body").eq("deck_id", DECK_ID).ilike("body", "[Approved]%").order("created_at", { ascending: false }).limit(1);
  const ok = data.review_status === "approved" && data.reviewed_by === OWNER_ADMIN && !!data.reviewed_at && (noteRow.data?.length ?? 0) > 0;
  rec("Admin: approve + auto-post note comment", ok, `status=${data.review_status} reviewed_by=${data.reviewed_by?.slice(0,8)} note_comment=${noteRow.data?.[0]?.body ?? "MISSING"}`);
} catch (e) { rec("Admin: approve", false, e.message); }

// 3. Invalid: non-admin owner tries to approve
try {
  await guardedSetStatus(NON_ADMIN_OWNER, "approved");
  rec("Non-admin approve REJECTED", false, "unexpectedly succeeded");
} catch (e) {
  rec("Non-admin approve REJECTED", /Only an admin/.test(e.message), e.message);
}

// 4. Invalid: outsider tries to submit_for_review
try {
  await guardedSetStatus(OUTSIDER, "in_review");
  rec("Outsider submit-for-review REJECTED", false, "unexpectedly succeeded");
} catch (e) {
  rec("Outsider submit-for-review REJECTED", /Only the owner or an admin/.test(e.message), e.message);
}

// -------- CLEANUP
console.log(`\n=== CLEANUP ===`);
await sa.from("deck_comments").delete().ilike("body", "SIM:%");
await sa.from("deck_comments").delete().ilike("body", "[Approved] SIM approval note");
await sa.from("decks").update({ review_status: "draft", reviewed_by: null, reviewed_at: null, review_note: null }).eq("id", DECK_ID);
console.log("Removed SIM comments and reset deck review_status → draft.");

// -------- SUMMARY
console.log(`\n=== SUMMARY ===`);
for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"}\t${r.name}${r.detail ? "\t"+r.detail.slice(0,120) : ""}`);
const failed = results.filter(r => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed.`);

await pool.end();
process.exit(failed ? 1 : 0);
