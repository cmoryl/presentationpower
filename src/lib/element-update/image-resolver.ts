import artwork from "./artwork.json";
import hashes from "./image-hashes.json";

export function resolveSourceImage(value: unknown): string | undefined {
  const image = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const key = typeof image.elib === "string" ? image.elib : "";
  const id = typeof image.id === "string" ? image.id : "";
  const supplied = (artwork as Record<string, string>)[key] ?? (hashes as Record<string, string>)[id];
  if (supplied) return supplied;
  const url = image.url ?? image.src ?? image.data ?? value;
  if (typeof url !== "string") return undefined;
  return /^(https:\/\/|\/__l5e\/assets-v1\/)/.test(url) || /^data:image\/(png|jpe?g|webp|gif|avif);base64,[A-Za-z0-9+/]+=*$/i.test(url) ? url : undefined;
}