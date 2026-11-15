import { forwardRef, useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { SPECTRUM, BRAND } from "@/lib/brand-colors";
import "./source-engine.css";

export interface SourceMarkupProps extends React.HTMLAttributes<HTMLDivElement> { html: string }
export const SourceMarkup = forwardRef<HTMLDivElement, SourceMarkupProps>(function SourceMarkupImpl({ html, className = "", ...props }, ref) {
  const [safe, setSafe] = useState("");
  useEffect(() => {
    const sanitized = DOMPurify.sanitize(html, { USE_PROFILES: { html: true, svg: true, svgFilters: true }, ADD_ATTR: ["style", "data-source-index", "data-slot"] });
    const template = document.createElement("template"); template.innerHTML = sanitized;
    template.content.querySelectorAll("[role=button]").forEach(node => { node.removeAttribute("role"); node.removeAttribute("tabindex"); });
    // Exact source Spectrum decoration: repeat-cell position, not a per-module palette.
    template.content.querySelectorAll(".sec,.m-hero").forEach(section => {
      section.querySelectorAll(".t-stat,.dk-big,.dk-mega,.hlv,.disc,.tile,.dk-ico,.dk-dot,.tl-dot,.stl-dot,.num,.qmark,.rg-n,.ch-big,.testi-mark,.person-ph").forEach(figure => {
        let cursor: Element | null = figure;
        let index = 0;
        while (cursor && cursor !== section) {
          const parent: Element | null = cursor.parentElement;
          if (!parent) break;
          const key = (el: Element) => el.tagName + "." + el.getAttribute("class")?.replace(/\bspx\d\b/g, "").trim();
          const siblings = Array.from(parent.children).filter(el => key(el) === key(cursor as Element));
          if (siblings.length >= 2 && siblings.length <= 12) { index = siblings.indexOf(cursor); cursor.classList.add(`spx${index % 3 + 1}`); break; }
          cursor = parent;
        }
        figure.classList.add(`spx${index % 3 + 1}`);
      });
    });
    template.content.querySelectorAll(".srow > .tile,.scol > .tile,.stl-it > .stl-dot").forEach(el => el.remove());
    template.content.querySelectorAll(".gl").forEach(el => el.classList.add("spx", "spx-rich"));
    template.content.querySelectorAll(".dk-pcard").forEach(el => el.classList.add("spx-gl"));
    setSafe(template.innerHTML);
  }, [html]);
  return <div ref={ref} {...props} className={`v221-canvas ${className}`} style={{ "--navy": BRAND.ink, "--cobalt": BRAND.blue, "--white": BRAND.white, "--spx-ink": SPECTRUM.ink, "--spx-body": SPECTRUM.body, "--spx-eye": SPECTRUM.eyebrow, "--spx-muted": SPECTRUM.footnote, "--spx-line": SPECTRUM.frostCard.line, ...props.style } as React.CSSProperties} dangerouslySetInnerHTML={{ __html: safe }} />;
});