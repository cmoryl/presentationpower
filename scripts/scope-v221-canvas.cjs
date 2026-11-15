const fs = require("node:fs");
const postcss = require("postcss");

// Build-time only. Never import this script into browser/server application code.
const base = "src/lib/element-update/reference/";
const canvas = postcss.parse(fs.readFileSync(base + "canvas.css", "utf8"));
const chrome = postcss.parse(fs.readFileSync(base + "chrome.css", "utf8"));
const defaults = chrome.nodes.find(node => node.type === "rule" && node.selector === ":root");
if (!defaults) throw new Error("Source chrome defaults are unavailable");
const variables = defaults.clone();
variables.selector = ".v221-canvas";
canvas.walkRules(rule => {
  // CSS variables cannot appear inside :nth-child(). Browsers ignore this
  // original selector; Lightning CSS rejects it. Keep its valid sibling.
  const valid = rule.selectors.filter(selector => !/:nth-(?:last-)?child\(var\(/.test(selector));
  if (!valid.length) { rule.remove(); return; }
  rule.selectors = valid.map(selector => ".v221-canvas " + selector);
});
canvas.walkDecls("font-family", declaration => {
  if (declaration.value.includes("Geist")) declaration.value = "var(--font-sans)";
});
canvas.walkDecls("letter-spacing", declaration => { declaration.value = "0"; });
canvas.prepend(variables);
canvas.prepend(postcss.comment({ text: "Generated from authoritative v221 canvas.css by scripts/scope-v221-canvas.cjs. Canvas-scoped defaults, packaged Geist and zero tracking; one browser-invalid nth-child(var()) selector excluded. Source originals remain unchanged." }));
fs.writeFileSync("src/components/editor/source-engine.css", canvas.toString());