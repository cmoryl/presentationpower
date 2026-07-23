// Adapter registry + dispatcher. `renderInfographic(spec, ctx)` picks the
// first registered adapter that supports `spec.kind` and hands off.

import type {
  InfographicAdapter,
  InfographicKind,
  InfographicSpec,
  RenderContext,
} from "./spec";
import { ensureA11y } from "./a11y";

const adapters: InfographicAdapter[] = [];

export function registerInfographicAdapter(adapter: InfographicAdapter): void {
  // Replace existing adapter with same id (idempotent for HMR).
  const existing = adapters.findIndex((a) => a.id === adapter.id);
  if (existing >= 0) adapters[existing] = adapter;
  else adapters.push(adapter);
}

export function getInfographicAdapter(kind: InfographicKind): InfographicAdapter | null {
  return adapters.find((a) => a.supports(kind)) ?? null;
}

/** Convenience — normalizes spec and returns the ReactNode. */
export function renderInfographic(spec: InfographicSpec, ctx: RenderContext) {
  const normalized = ensureA11y(spec);
  const adapter = getInfographicAdapter(normalized.kind);
  if (!adapter) return null;
  return adapter.render(normalized, ctx);
}

/** For tests. */
export function _resetAdaptersForTests() {
  adapters.length = 0;
}
