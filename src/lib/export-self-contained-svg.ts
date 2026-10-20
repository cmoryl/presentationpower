// Browser export boundary: SVG logos become nested vectors, not linked files.
import { NEXT_APP_ORIGIN } from "@/lib/next-event";

const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";

export async function selfContainedSvg(markup: string): Promise<string> {
  let sequence = 0;
  const cache = new Map<string, Promise<Blob>>();
  async function load(url: string): Promise<Blob> {
    const existing = cache.get(url);
    if (existing) return existing;
    const pending = (async () => {
      const local = url.startsWith(`${NEXT_APP_ORIGIN}/`) ? url.slice(NEXT_APP_ORIGIN.length) : url;
      const response = await fetch(local);
      if (!response.ok) throw new Error(`Logo could not be embedded (${response.status}).`);
      return response.blob();
    })();
    cache.set(url, pending);
    return pending;
  }
  async function embed(xml: string, depth = 0): Promise<Element> {
    if (depth > 8) throw new Error("Logo contains too many nested image links.");
    const doc = new DOMParser().parseFromString(xml, "image/svg+xml");
    const root = doc.documentElement;
    if (root.localName !== "svg" || doc.querySelector("parsererror")) throw new Error("Logo is not a valid SVG.");
    for (const image of Array.from(root.querySelectorAll("image"))) {
      const href = image.getAttribute("href") || image.getAttributeNS(XLINK_NS, "href");
      if (!href || href.startsWith("#")) continue;
      const blob = await load(href);
      const text = /svg|xml|text/.test(blob.type) || /\.svg(?:[?#]|$)/i.test(href) ? await blob.text() : "";
      if (text.trim().startsWith("<")) {
        const logo = await embed(text, depth + 1);
        const prefix = `embedded-logo-${sequence++}-`;
        const ids = new Map<string, string>();
        for (const element of [logo, ...Array.from(logo.querySelectorAll("[id]"))]) {
          const id = element.getAttribute("id");
          if (id) ids.set(id, `${prefix}${id}`);
        }
        for (const element of [logo, ...Array.from(logo.querySelectorAll("*"))]) {
          for (const attribute of Array.from(element.attributes)) {
            let value = attribute.value;
            if (attribute.name === "id") value = ids.get(value) ?? value;
            else {
              value = value.replace(/url\(\s*(['"]?)#([^)'"\s]+)\1\s*\)/g, (match, _quote, id: string) => ids.has(id) ? `url(#${ids.get(id)})` : match);
              if (value.startsWith("#")) value = `#${ids.get(value.slice(1)) ?? value.slice(1)}`;
            }
            element.setAttributeNS(attribute.namespaceURI, attribute.name, value);
          }
          if (element.localName === "style" && element.textContent) {
            element.textContent = element.textContent.replace(/#([A-Za-z_][\w-]*)/g, (match, id: string) => ids.has(id) ? `#${ids.get(id)}` : match);
          }
        }
        if (!logo.hasAttribute("viewBox")) {
          const width = Number.parseFloat(logo.getAttribute("width") ?? "");
          const height = Number.parseFloat(logo.getAttribute("height") ?? "");
          if (!(width > 0 && height > 0)) throw new Error("Logo has no usable dimensions.");
          logo.setAttribute("viewBox", `0 0 ${width} ${height}`);
        }
        const group = doc.createElementNS(SVG_NS, "g");
        for (const attribute of Array.from(image.attributes)) {
          if (["href", "xlink:href"].includes(attribute.name)) continue;
          const target = ["x", "y", "width", "height", "preserveAspectRatio"].includes(attribute.name) ? logo : group;
          target.setAttribute(attribute.name, attribute.value);
        }
        group.appendChild(doc.importNode(logo, true));
        image.replaceWith(group);
      } else {
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Logo could not be read."));
          reader.readAsDataURL(blob);
        });
        image.setAttribute("href", data);
        image.setAttributeNS(XLINK_NS, "xlink:href", data);
      }
    }
    return root;
  }
  return new XMLSerializer().serializeToString(await embed(markup));
}