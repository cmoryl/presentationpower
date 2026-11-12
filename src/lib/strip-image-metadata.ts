// Removes hidden labelling (EXIF, XMP "ContainsAiGeneratedContent", IPTC
// DigitalSourceType, C2PA/JUMBF, comments) from a JPEG without re-encoding it.
// Port of scripts/sjb-strip-ai-metadata.py `jpeg()` so server syncs match manual refreshes.
const MARKERS = ["ContainsAiGeneratedContent", "trainedAlgorithmicMedia", "DigitalSourceType", "c2pa", "jumb"];

export function hasAiLabel(bytes: Uint8Array): boolean {
  let s = "";
  for (let i = 0; i < bytes.length; i += 65536) s += String.fromCharCode(...bytes.subarray(i, i + 65536));
  return MARKERS.some((m) => s.includes(m));
}

export function stripJpegMetadata(b: Uint8Array): Uint8Array {
  if (b[0] !== 0xff || b[1] !== 0xd8) throw new Error("Not a JPEG file");
  const parts: Uint8Array[] = [b.subarray(0, 2)];
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) throw new Error("Unreadable JPEG structure");
    const m = b[i + 1]!;
    if (m === 0xda) { parts.push(b.subarray(i)); break; }
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { parts.push(b.subarray(i, i + 2)); i += 2; continue; }
    const len = (b[i + 2]! << 8) | b[i + 3]!;
    const drop = m === 0xe1 || m === 0xeb || m === 0xed || (m >= 0xe3 && m <= 0xef && m !== 0xee) || m === 0xfe;
    if (!drop) parts.push(b.subarray(i, i + 2 + len));
    i += 2 + len;
  }
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

// PNG: drop text/EXIF/C2PA chunks (tEXt, zTXt, iTXt, eXIf, caBX, tIME); pixels untouched.
const PNG_DROP = new Set(["tEXt", "zTXt", "iTXt", "eXIf", "caBX", "tIME"]);
export function stripPngMetadata(b: Uint8Array): Uint8Array {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (sig.some((v, i) => b[i] !== v)) throw new Error("Not a PNG file");
  const parts: Uint8Array[] = [b.subarray(0, 8)];
  let i = 8;
  while (i + 8 <= b.length) {
    const len = ((b[i]! << 24) >>> 0) + (b[i + 1]! << 16) + (b[i + 2]! << 8) + b[i + 3]!;
    const type = String.fromCharCode(b[i + 4]!, b[i + 5]!, b[i + 6]!, b[i + 7]!);
    const end = i + 12 + len;
    if (end > b.length) throw new Error("Unreadable PNG structure");
    if (!PNG_DROP.has(type)) parts.push(b.subarray(i, end));
    i = end;
    if (type === "IEND") break;
  }
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
export const isPng = (b: Uint8Array) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
