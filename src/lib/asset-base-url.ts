/**
 * Origin used to resolve ROOT-RELATIVE asset URLs during an export.
 *
 * In the browser `fetch("/fonts/Geist-Regular.ttf")` resolves against the page
 * origin. On the server (MCP export, SSR) there is no page, so the same call
 * throws "Failed to parse URL". The headless export entry sets this to the
 * request origin before it calls the exporter, and every fetch in the export
 * pipeline runs its URL through `resolveAssetUrl` first.
 */

let assetBase: string | null = null;

export function setAssetBaseUrl(origin: string | null): void {
  assetBase = origin ? origin.replace(/\/+$/, "") : null;
}

export function getAssetBaseUrl(): string | null {
  return assetBase;
}

/** Absolute URL for `url`, prefixing the configured origin for `/relative` paths. */
export function resolveAssetUrl(url: string): string {
  if (!url) return url;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  if (url.startsWith("/")) {
    if (assetBase) return `${assetBase}${url}`;
    if (typeof window !== "undefined") return `${window.location.origin}${url}`;
  }
  return url;
}

/** Base64 of arbitrary bytes, without Node's Buffer (Workers-safe). */
export function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

/**
 * Data URL for a fetched response without FileReader (absent in the Worker
 * runtime, where `new FileReader()` throws).
 */
export async function responseToDataUrl(res: Response, fallbackMime = "image/png"): Promise<string> {
  const mime = res.headers.get("content-type")?.split(";")[0]?.trim() || fallbackMime;
  const bytes = new Uint8Array(await res.arrayBuffer());
  return `data:${mime};base64,${bytesToBase64(bytes)}`;
}
