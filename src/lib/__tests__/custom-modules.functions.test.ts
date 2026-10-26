import { beforeEach, describe, expect, it, vi } from "vitest";

const { checkRetirement, context, query } = vi.hoisted(() => {
  const query = {
    select: vi.fn(),
    neq: vi.fn(),
    order: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
  };
  return {
    checkRetirement: vi.fn(),
    context: { supabase: { from: vi.fn(() => query) }, userId: "admin" },
    query,
  };
});

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      middleware: () => builder,
      validator: () => builder,
      handler: (handler: (input: unknown) => unknown) =>
        (input: { data?: unknown } = {}) => handler({ ...input, context }),
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("../module-catalogue.server", () => ({ checkRetirement }));

import { deleteCustomModule, listCustomModules } from "../custom-modules.functions";

describe("Module Studio retirement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    query.select.mockReturnValue(query);
    query.neq.mockReturnValue(query);
    query.update.mockReturnValue(query);
    query.order.mockResolvedValue({ data: [{ id: "active", status: "draft" }], error: null });
    query.eq.mockResolvedValue({ error: null });
    checkRetirement.mockResolvedValue({});
  });

  it("excludes archived modules from the Studio library query", async () => {
    expect(await listCustomModules()).toEqual([{ id: "active", status: "draft" }]);
    expect(context.supabase.from).toHaveBeenCalledWith("custom_modules");
    expect(query.neq).toHaveBeenCalledWith("status", "archived");
    expect(query.neq.mock.invocationCallOrder[0]).toBeLessThan(query.order.mock.invocationCallOrder[0]);
  });

  it("archives an unused module only after checking saved references", async () => {
    const id = "00000000-0000-4000-8000-000000000001";
    expect(await deleteCustomModule({ data: { id } })).toEqual({ ok: true });
    expect(checkRetirement).toHaveBeenCalledWith(context.supabase, id);
    expect(query.update).toHaveBeenCalledWith({ status: "archived" });
    expect(query.eq).toHaveBeenCalledWith("id", id);
    expect(checkRetirement.mock.invocationCallOrder[0]).toBeLessThan(query.update.mock.invocationCallOrder[0]);
  });

  it("propagates a saved-work refusal without changing the module", async () => {
    checkRetirement.mockRejectedValueOnce(new Error("This module is referenced by saved work."));
    await expect(deleteCustomModule({ data: { id: "00000000-0000-4000-8000-000000000001" } }))
      .rejects.toThrow("This module is referenced by saved work.");
    expect(query.update).not.toHaveBeenCalled();
  });
});