/**
 * PowerPoint package validation — content-based, never extension-based.
 *
 * Everything here runs *before* the OOXML parser touches an untrusted upload:
 *
 *   1. container sniffing — ZIP (OOXML) vs the legacy OLE/CFB `.ppt` container
 *      vs something that merely got renamed to `.pptx`
 *   2. accepted-kind resolution — .pptx / .pptm / .ppsx / .potx are all read,
 *      legacy .ppt is routed to conversion with a clear explanation
 *   3. archive hardening — entry-count, expansion, compression-ratio and path
 *      traversal caps so a zip bomb cannot exhaust the worker
 *   4. active-content detection — macro/VBA and OLE parts are *reported*, never
 *      executed. Nothing in this module evaluates package content.
 */

/** Largest upload accepted at all. */
export const MAX_UPLOAD_BYTES = 250 * 1024 * 1024;
/** Largest single expanded archive entry. */
export const MAX_ENTRY_BYTES = 80 * 1024 * 1024;
/** Total expanded size ceiling across all entries. */
export const MAX_EXPANDED_BYTES = 400 * 1024 * 1024;
/** Entry-count ceiling. */
export const MAX_ENTRIES = 5000;
/** Per-entry compression-ratio ceiling (classic zip-bomb signal). */
export const MAX_COMPRESSION_RATIO = 200;

export type PackageContainer = "ooxml-zip" | "ole-legacy" | "unknown";

export type PresentationKind =
  | "pptx"
  | "pptm"
  | "ppsx"
  | "potx"
  | "ppt"
  | "pps"
  | "pot"
  | "unknown";

export type PackageSniff = {
  container: PackageContainer;
  kind: PresentationKind;
  /** True when the importer can parse this package directly. */
  accepted: boolean;
  /** True when the file is a real presentation but needs converting first. */
  requiresConversion: boolean;
  /** True when the declared extension disagrees with the sniffed container. */
  extensionMismatch: boolean;
  /** User-facing explanation. Always populated. */
  message: string;
};

const OOXML_KINDS = new Set<PresentationKind>(["pptx", "pptm", "ppsx", "potx"]);
const LEGACY_KINDS = new Set<PresentationKind>(["ppt", "pps", "pot"]);

/** ZIP local-file header. */
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];
/** Empty archive / spanned archive variants still start with "PK". */
const ZIP_MAGIC_ALT = [
  [0x50, 0x4b, 0x05, 0x06],
  [0x50, 0x4b, 0x07, 0x08],
];
/** OLE2 Compound File Binary header — legacy .ppt / .doc / .xls. */
const CFB_MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

function startsWith(bytes: Uint8Array, magic: number[]): boolean {
  if (bytes.length < magic.length) return false;
  return magic.every((b, i) => bytes[i] === b);
}

/** Sniff the physical container from the first bytes only. */
export function detectContainer(bytes: Uint8Array): PackageContainer {
  if (startsWith(bytes, ZIP_MAGIC) || ZIP_MAGIC_ALT.some((m) => startsWith(bytes, m))) {
    return "ooxml-zip";
  }
  if (startsWith(bytes, CFB_MAGIC)) return "ole-legacy";
  return "unknown";
}

/** Extension → kind, used only to cross-check the sniffed container. */
export function kindFromFilename(filename: string): PresentationKind {
  const m = /\.([a-z0-9]+)$/i.exec(filename.trim());
  const ext = (m?.[1] ?? "").toLowerCase();
  if (
    ext === "pptx" ||
    ext === "pptm" ||
    ext === "ppsx" ||
    ext === "potx" ||
    ext === "ppt" ||
    ext === "pps" ||
    ext === "pot"
  ) {
    return ext as PresentationKind;
  }
  return "unknown";
}

/**
 * Resolve the real kind from `[Content_Types].xml`, which is authoritative for
 * OOXML packages: the same ZIP is a deck, a show or a template depending on the
 * override declared for `/ppt/presentation.xml`.
 */
export function kindFromContentTypes(contentTypesXml: string): PresentationKind {
  const xml = contentTypesXml.replace(/\s+/g, " ");
  if (/presentationml\.template\.main/.test(xml)) return "potx";
  if (/presentationml\.slideshow\.main/.test(xml)) return "ppsx";
  if (/presentationml\.presentation\.macroEnabled\.main/.test(xml)) return "pptm";
  if (/presentationml\.slideshow\.macroEnabled\.main/.test(xml)) return "pptm";
  if (/presentationml\.template\.macroEnabled\.main/.test(xml)) return "pptm";
  if (/presentationml\.presentation\.main/.test(xml)) return "pptx";
  return "unknown";
}

/**
 * Decide whether an upload can be imported. `contentTypesXml` is optional —
 * pass it once the ZIP central directory has been read for an authoritative
 * answer; without it the extension is used as a hint only.
 */
export function sniffPresentationPackage(
  bytes: Uint8Array,
  filename: string,
  contentTypesXml?: string | null,
): PackageSniff {
  const container = detectContainer(bytes);
  const declared = kindFromFilename(filename);

  if (bytes.length === 0) {
    return {
      container: "unknown",
      kind: "unknown",
      accepted: false,
      requiresConversion: false,
      extensionMismatch: false,
      message: "That file is empty.",
    };
  }

  if (container === "ole-legacy") {
    const kind = LEGACY_KINDS.has(declared) ? declared : "ppt";
    return {
      container,
      kind,
      accepted: false,
      requiresConversion: true,
      extensionMismatch: OOXML_KINDS.has(declared),
      message:
        "This is a legacy PowerPoint 97–2003 file (.ppt). It uses the old binary format, " +
        "which cannot be read directly. Open it in PowerPoint and save as .pptx, or run it " +
        "through conversion first — nothing is lost either way.",
    };
  }

  if (container !== "ooxml-zip") {
    return {
      container,
      kind: "unknown",
      accepted: false,
      requiresConversion: false,
      extensionMismatch: declared !== "unknown",
      message:
        declared === "unknown"
          ? "That file is not a PowerPoint presentation."
          : `The file is named .${declared} but its contents are not a PowerPoint package. ` +
            "It may be renamed, corrupt, or a different format entirely.",
    };
  }

  const sniffedKind = contentTypesXml ? kindFromContentTypes(contentTypesXml) : "unknown";
  const kind = sniffedKind !== "unknown" ? sniffedKind : OOXML_KINDS.has(declared) ? declared : "unknown";

  if (kind === "unknown") {
    return {
      container,
      kind,
      accepted: false,
      requiresConversion: false,
      extensionMismatch: false,
      message:
        "This is a valid Office package, but it is not a presentation — no PowerPoint " +
        "content type was declared. Word and Excel files cannot be imported here.",
    };
  }

  const extensionMismatch = declared !== "unknown" && declared !== kind;
  return {
    container,
    kind,
    accepted: true,
    requiresConversion: false,
    extensionMismatch,
    message: extensionMismatch
      ? `Read as ${kind.toUpperCase()} — the file is named .${declared}, but its contents say ${kind}. Using the contents.`
      : `Valid ${kind.toUpperCase()} package.`,
  };
}

/** One archive entry, as reported by the ZIP reader. */
export type ArchiveEntry = {
  path: string;
  /** Expanded size in bytes. */
  bytes: number;
  /** Stored (compressed) size, when the reader exposes it. */
  compressedBytes?: number;
};

export type PackageRisk = {
  code:
    | "too-many-entries"
    | "entry-too-large"
    | "expands-too-large"
    | "suspicious-ratio"
    | "path-traversal"
    | "absolute-path"
    | "macros-present"
    | "ole-embed-present"
    | "external-reference"
    | "missing-content-types"
    | "missing-presentation-part";
  severity: "blocker" | "warning" | "info";
  message: string;
  /** Offending archive path, when the risk is entry-scoped. */
  path?: string;
};

export type PackageValidation = {
  /** False when any blocker was raised — do not parse the package. */
  safeToParse: boolean;
  risks: PackageRisk[];
  entryCount: number;
  expandedBytes: number;
  /** True when a VBA project is present. Reported, never executed. */
  hasMacros: boolean;
  /** True when OLE embeds are present (they are preserved, not run). */
  hasOleEmbeds: boolean;
};

/**
 * Structural + safety validation of the ZIP entry list. Pure, so the same
 * function guards the server import path and is exercised directly by tests.
 */
export function validatePackageEntries(entries: ArchiveEntry[]): PackageValidation {
  const risks: PackageRisk[] = [];
  let expandedBytes = 0;
  let hasMacros = false;
  let hasOleEmbeds = false;

  if (entries.length > MAX_ENTRIES) {
    risks.push({
      code: "too-many-entries",
      severity: "blocker",
      message: `Archive declares ${entries.length} entries (limit ${MAX_ENTRIES}). Refusing to expand it.`,
    });
  }

  for (const e of entries) {
    expandedBytes += Math.max(0, e.bytes);

    if (e.path.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(e.path)) {
      risks.push({
        code: "absolute-path",
        severity: "blocker",
        message: "Archive contains an absolute path, which is never valid inside a PowerPoint package.",
        path: e.path,
      });
    } else if (e.path.split(/[\\/]/).includes("..")) {
      risks.push({
        code: "path-traversal",
        severity: "blocker",
        message: "Archive contains a path-traversal entry.",
        path: e.path,
      });
    }

    if (e.bytes > MAX_ENTRY_BYTES) {
      risks.push({
        code: "entry-too-large",
        severity: "blocker",
        message: `An embedded asset expands to ${Math.round(e.bytes / 1_000_000)}MB, over the ${Math.round(
          MAX_ENTRY_BYTES / 1_000_000,
        )}MB limit.`,
        path: e.path,
      });
    }

    if (
      e.compressedBytes !== undefined &&
      e.compressedBytes > 0 &&
      e.bytes / e.compressedBytes > MAX_COMPRESSION_RATIO &&
      e.bytes > 1_000_000
    ) {
      risks.push({
        code: "suspicious-ratio",
        severity: "blocker",
        message: `An entry expands ${Math.round(e.bytes / e.compressedBytes)}× its stored size, which is a zip-bomb signature.`,
        path: e.path,
      });
    }

    if (/vbaProject\.bin$/i.test(e.path) || /ppt\/vbaProject/i.test(e.path)) {
      hasMacros = true;
    }
    if (/ppt\/embeddings\//i.test(e.path)) {
      hasOleEmbeds = true;
    }
  }

  if (expandedBytes > MAX_EXPANDED_BYTES) {
    risks.push({
      code: "expands-too-large",
      severity: "blocker",
      message: `Archive expands to ${Math.round(expandedBytes / 1_000_000)}MB, over the ${Math.round(
        MAX_EXPANDED_BYTES / 1_000_000,
      )}MB limit.`,
    });
  }

  const paths = entries.map((e) => e.path);
  if (!paths.includes("[Content_Types].xml")) {
    risks.push({
      code: "missing-content-types",
      severity: "blocker",
      message: "Package is missing [Content_Types].xml — the archive is corrupt.",
    });
  }
  if (!paths.some((p) => /^ppt\/presentation\.xml$/.test(p))) {
    risks.push({
      code: "missing-presentation-part",
      severity: "blocker",
      message: "Package has no ppt/presentation.xml — this is not a readable presentation.",
    });
  }

  if (hasMacros) {
    risks.push({
      code: "macros-present",
      severity: "warning",
      message:
        "This deck contains a VBA macro project. Macros are never run during import, and the " +
        "macro code is not carried into the repaired deck.",
    });
  }
  if (hasOleEmbeds) {
    risks.push({
      code: "ole-embed-present",
      severity: "info",
      message:
        "This deck contains embedded objects (OLE). They are preserved as visual fallbacks with " +
        "their original data kept, and are never opened or executed.",
    });
  }

  return {
    safeToParse: !risks.some((r) => r.severity === "blocker"),
    risks,
    entryCount: entries.length,
    expandedBytes,
    hasMacros,
    hasOleEmbeds,
  };
}

/**
 * XXE hardening check. The XML parser is configured with entity expansion off,
 * but a DOCTYPE in an Office part is itself a red flag worth surfacing.
 */
export function containsDoctypeOrEntity(xml: string): boolean {
  return /<!DOCTYPE/i.test(xml) || /<!ENTITY/i.test(xml);
}

/** True when a relationship target points outside the package. */
export function isExternalRelationshipTarget(target: string): boolean {
  return /^(https?:|ftp:|file:|\\\\)/i.test(target.trim());
}
