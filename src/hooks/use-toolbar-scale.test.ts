import { describe, expect, it, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { TOOLBAR_SCALE_STEPS, useToolbarScale } from "./use-toolbar-scale";

describe("useToolbarScale", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("defaults to 100%", () => {
    const { result } = renderHook(() => useToolbarScale());
    expect(result.current.scale).toBe(1);
    expect(result.current.label).toBe("100%");
  });

  it("cycles through every step and wraps back to 100%", () => {
    const { result } = renderHook(() => useToolbarScale());
    for (const step of TOOLBAR_SCALE_STEPS.slice(1)) {
      act(() => result.current.cycle());
      expect(result.current.scale).toBe(step);
    }
    act(() => result.current.cycle());
    expect(result.current.scale).toBe(1);
  });

  it("persists the choice and rehydrates it for the next mount", () => {
    const first = renderHook(() => useToolbarScale());
    act(() => first.result.current.setScale(1.3));
    const second = renderHook(() => useToolbarScale());
    expect(second.result.current.scale).toBe(1.3);
    expect(second.result.current.label).toBe("130%");
  });

  it("falls back to 100% for a corrupted stored value", () => {
    window.localStorage.setItem("tp.canvas.toolbarScale", "9.5");
    const { result } = renderHook(() => useToolbarScale());
    expect(result.current.scale).toBe(1);
  });

  it("keeps two mounted toolbars in sync", () => {
    const a = renderHook(() => useToolbarScale());
    const b = renderHook(() => useToolbarScale());
    act(() => a.result.current.setScale(1.5));
    expect(b.result.current.scale).toBe(1.5);
  });
});
