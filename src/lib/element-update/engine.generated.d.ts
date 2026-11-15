import type { SourceDefinition, SourceModule, ModuleData } from "./registry";
export interface EngineDefinition extends Omit<SourceDefinition, "def"> {
  def: () => ModuleData;
  render: (data: ModuleData, context?: Record<string, unknown>) => string;
}
export const MODULES: Record<string, EngineDefinition>;
export const SUBS: Record<string, EngineDefinition>;
export const SUB_ORDER: string[];
export const ROW_LAYOUTS: Record<string, string[]>;
export const FORMATS: Array<{ id: string; n: string; w: number; h: number; print?: boolean }>;
export const LIB_DESIGNS: Record<string, Array<[string, ModuleData]>>;
export function derive(modules: SourceModule[]): ModuleData;
export const REFLOW: Record<string, (data: ModuleData, format: { id: string; w: number; h: number }) => string>;
export function surfaceClass(data: ModuleData): string;
export function iconStyleClass(data: ModuleData): string;
export function withLang<T>(language: string, fn: () => T): T;