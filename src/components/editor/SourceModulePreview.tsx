import { forwardRef } from "react";
import { type SourceModule } from "@/lib/element-update/registry";
import { renderSourceModule } from "@/lib/element-update/render";
import { SourceMarkup } from "./SourceMarkup";

export interface SourceModulePreviewProps { module: SourceModule; className?: string }
export const SourceModulePreview = forwardRef<HTMLElement, SourceModulePreviewProps>(function SourceModulePreviewImpl({ module, className = "" }, ref) {
  let html = "", error = "";
  try { html = renderSourceModule(module); } catch (e) { error = e instanceof Error ? e.message : "Source render failed"; }
  return <section ref={ref} data-source-module={module.type} className={className}>{error ? <p role="alert" className="text-destructive">{error}</p> : <SourceMarkup html={`<div class="gl page spx spx-rich"><div class="mod">${html}</div></div>`} />}</section>;
});