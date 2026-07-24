// Fully self-contained HTML export for print design templates.
//
// Renders a React element off-screen with `createRoot`, waits for fonts and
// images, then serialises the DOM into a single `.html` file that inlines
// every stylesheet rule, image, and web font as a data URL — so the download
// opens correctly with no network access.

import React from "react";
import { createRoot, type Root } from "react-dom/client";

type ProgressFn = (message: string) => void;

const dataUrlCache = new Map<string, string>();

async function toDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("data:")) return url;
  if (dataUrlCache.has(url)) return dataUrlCache.get(url)!;
  try {
    const abs = new URL(url, window.location.href).toString();
    const res = await fetch(abs, { mode: "cors", credentials: "omit" });
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const data: string = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(blob);
    });
    dataUrlCache.set(url, data);
    return data;
  } catch (err) {
    console.warn("[print-html-export] failed to inline", url, err);
    return null;
  }
}

async function inlineImages(root: HTMLElement, onProgress?: ProgressFn) {
  const imgs = Array.from(root.querySelectorAll<HTMLImageElement>("img"));
  let done = 0;
  for (const img of imgs) {
    if (img.src && !img.src.startsWith("data:")) {
      const d = await toDataUrl(img.src);
      if (d) {
        img.setAttribute("src", d);
        img.removeAttribute("srcset");
      }
    }
    done++;
    if (imgs.length > 0) onProgress?.(`Inlining images (${done}/${imgs.length})`);
  }

  // background-image: url(...) on any node — expand into inline style
  const nodes = Array.from(root.querySelectorAll<HTMLElement>("*"));
  for (const node of nodes) {
    const bg = node.style.backgroundImage || "";
    if (bg && /url\(/i.test(bg) && !/data:/i.test(bg)) {
      const rewritten = await rewriteCssUrls(bg);
      node.style.backgroundImage = rewritten;
    }
  }
}

const URL_RE = /url\((['"]?)([^'")]+)\1\)/gi;

async function rewriteCssUrls(css: string): Promise<string> {
  const matches = Array.from(css.matchAll(URL_RE));
  if (matches.length === 0) return css;
  const replacements = new Map<string, string>();
  for (const m of matches) {
    const raw = m[2];
    if (!raw || raw.startsWith("data:") || raw.startsWith("#")) continue;
    if (replacements.has(raw)) continue;
    const d = await toDataUrl(raw);
    if (d) replacements.set(raw, d);
  }
  return css.replace(URL_RE, (_full, q, ref) => {
    const rep = replacements.get(ref);
    return rep ? `url(${q}${rep}${q})` : `url(${q}${ref}${q})`;
  });
}

async function collectStylesheets(onProgress?: ProgressFn): Promise<string> {
  const parts: string[] = [];
  const sheets = Array.from(document.styleSheets);
  let done = 0;
  for (const sheet of sheets) {
    try {
      const rules = (sheet as CSSStyleSheet).cssRules;
      if (!rules) continue;
      let block = "";
      for (const rule of Array.from(rules)) {
        block += rule.cssText + "\n";
      }
      parts.push(await rewriteCssUrls(block));
    } catch {
      // cross-origin stylesheet — skip silently; Tailwind is same-origin.
    }
    done++;
    onProgress?.(`Serialising styles (${done}/${sheets.length})`);
  }
  return parts.join("\n");
}

async function waitReady(container: HTMLElement) {
  // fonts
  try { await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready; } catch { /* noop */ }
  // pending images
  const imgs = Array.from(container.querySelectorAll<HTMLImageElement>("img"));
  await Promise.all(
    imgs.map((img) =>
      img.complete && img.naturalWidth > 0
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          })
    ),
  );
  // one raf so backgrounds paint
  await new Promise((r) => requestAnimationFrame(() => r(null)));
}

export type PrintHtmlExportOptions = {
  filename: string;
  title?: string;
  onProgress?: ProgressFn;
  /** Wraps the rendered node in a container that clamps width to letter-size. */
  pageWidthPx?: number;
};

/**
 * Render `element` off-screen, snapshot the DOM + resolved styles, and
 * download the result as a fully self-contained `.html` file.
 */
export async function exportElementAsStandaloneHtml(
  element: React.ReactElement,
  opts: PrintHtmlExportOptions,
): Promise<void> {
  const { filename, title, onProgress, pageWidthPx = 816 } = opts;

  // Off-screen host — kept in the DOM so styles resolve, but visually hidden.
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = [
    "position:fixed",
    "left:-99999px",
    "top:0",
    `width:${pageWidthPx}px`,
    "pointer-events:none",
    "opacity:0",
    "z-index:-1",
  ].join(";");
  document.body.appendChild(host);

  let root: Root | null = null;
  try {
    onProgress?.("Rendering…");
    root = createRoot(host);
    root.render(element);
    // let React commit
    await new Promise((r) => setTimeout(r, 60));
    await waitReady(host);

    onProgress?.("Inlining images…");
    await inlineImages(host, onProgress);

    onProgress?.("Serialising styles…");
    const css = await collectStylesheets(onProgress);

    const inner = host.innerHTML;
    const doc =
      `<!doctype html>\n` +
      `<html lang="en">\n<head>\n` +
      `<meta charset="utf-8" />\n` +
      `<meta name="viewport" content="width=device-width, initial-scale=1" />\n` +
      `<title>${escapeHtml(title ?? filename)}</title>\n` +
      `<style>\n` +
      `html,body{margin:0;padding:0;background:#f4f4f7;}\n` +
      `.tpm-print-page{margin:24px auto;box-shadow:0 10px 40px rgba(0,0,0,.12);}\n` +
      `@media print{html,body{background:#fff;} .tpm-print-page{margin:0;box-shadow:none;}}\n` +
      css +
      `\n</style>\n</head>\n<body>\n<div class="tpm-print-page">${inner}</div>\n</body>\n</html>`;

    onProgress?.("Preparing download…");
    const blob = new Blob([doc], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".html") ? filename : `${filename}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  } finally {
    try { root?.unmount(); } catch { /* noop */ }
    host.remove();
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
