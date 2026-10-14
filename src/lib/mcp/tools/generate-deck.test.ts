// Two identical generate_deck calls must make one deck, not two.
import { beforeEach, describe, expect, it, vi } from "vitest";

type Job = { id: string; idempotency_key: string; status: string; result: string | null; error: string | null; updated_at: string };
const jobs: Job[] = [];
let generated = 0;

function fakeDb() {
  return {
    from(table: string) {
      if (table !== "deck_jobs") throw new Error(`unexpected table ${table}`);
      let filter: [string, string] | null = null;
      const q = {
        select: () => q,
        eq: (k: string, v: string) => ((filter = [k, v]), q),
        maybeSingle: async () => ({ data: jobs.find((j) => filter && (j as any)[filter[0]] === filter[1]) ?? null }),
        insert: (row: { idempotency_key: string }) => {
          const dup = jobs.some((j) => j.idempotency_key === row.idempotency_key);
          const job: Job = { id: `job-${jobs.length + 1}`, idempotency_key: row.idempotency_key, status: "running", result: null, error: null, updated_at: new Date().toISOString() };
          if (!dup) jobs.push(job);
          return { select: () => ({ single: async () => (dup ? { error: { message: "duplicate key" }, data: null } : { data: job, error: null }) }) };
        },
        update: (patch: Partial<Job>) => ({ eq: async (_k: string, id: string) => { Object.assign(jobs.find((j) => j.id === id)!, patch); return {}; } }),
        delete: () => ({ eq: async (_k: string, id: string) => { jobs.splice(jobs.findIndex((j) => j.id === id), 1); return {}; } }),
      };
      return q;
    },
  };
}

vi.mock("../supabase", () => ({
  supabaseForUser: () => fakeDb(),
  textResult: (v: unknown) => ({ content: [{ type: "text", text: typeof v === "string" ? v : JSON.stringify(v) }] }),
  errorResult: (m: string) => ({ isError: true, content: [{ type: "text", text: m }] }),
}));
vi.mock("@/lib/deck-generate", () => ({
  generateDeckFromBrief: async () => {
    generated += 1;
    return { ok: true, result: `Deck 11111111-2222-3333-4444-555555555555 saved` };
  },
}));

const ctx = { isAuthenticated: () => true, getUserId: () => "user-1" };
const input = { prospect: "Acme", industry: "Retail" };

describe("generate_deck retry safety", () => {
  beforeEach(() => {
    jobs.length = 0;
    generated = 0;
  });

  it("returns the first deck on an identical second call", async () => {
    const tool = (await import("./generate-deck")).default as any;
    const run = tool.handler ?? tool.config?.handler;
    const first = await run(input, ctx);
    const second = await run(input, ctx);
    expect(generated).toBe(1);
    expect(jobs).toHaveLength(1);
    expect(JSON.stringify(first)).toContain("11111111-2222");
    expect(JSON.stringify(second)).toContain("no duplicate created");
  });

  it("a different brief makes its own deck", async () => {
    const tool = (await import("./generate-deck")).default as any;
    const run = tool.handler ?? tool.config?.handler;
    await run(input, ctx);
    await run({ ...input, prospect: "Globex" }, ctx);
    expect(generated).toBe(2);
  });

  it("an identical call while the first is still running does not start another", async () => {
    const tool = (await import("./generate-deck")).default as any;
    const run = tool.handler ?? tool.config?.handler;
    const [a, b] = await Promise.all([run(input, ctx), run(input, ctx)]);
    expect(generated).toBe(1);
    expect(JSON.stringify([a, b])).toMatch(/already running|just started|no duplicate/);
  });
});
