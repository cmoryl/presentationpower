import { describe, expect, it } from "vitest";

import {
  MAX_ENTRIES,
  containsDoctypeOrEntity,
  detectContainer,
  isExternalRelationshipTarget,
  kindFromContentTypes,
  kindFromFilename,
  sniffPresentationPackage,
  validatePackageEntries,
  type ArchiveEntry,
} from "./pptx-package-validate";

function bytes(...values: number[]): Uint8Array {
  // Pad past the 32-byte floor the parser enforces.
  return Uint8Array.from([...values, ...new Array(40).fill(0)]);
}

const ZIP = bytes(0x50, 0x4b, 0x03, 0x04);
const CFB = bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1);
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0);

const CT = (main: string) =>
  `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
  `<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.${main}"/></Types>`;

const OK_ENTRIES: ArchiveEntry[] = [
  { path: "[Content_Types].xml", bytes: 1200, compressedBytes: 400 },
  { path: "ppt/presentation.xml", bytes: 5000, compressedBytes: 900 },
  { path: "ppt/slides/slide1.xml", bytes: 8000, compressedBytes: 1500 },
];

describe("detectContainer", () => {
  it("recognizes ZIP, OLE and unknown containers from magic bytes", () => {
    expect(detectContainer(ZIP)).toBe("ooxml-zip");
    expect(detectContainer(bytes(0x50, 0x4b, 0x05, 0x06))).toBe("ooxml-zip");
    expect(detectContainer(CFB)).toBe("ole-legacy");
    expect(detectContainer(JPEG)).toBe("unknown");
    expect(detectContainer(new Uint8Array())).toBe("unknown");
  });
});

describe("kindFromFilename / kindFromContentTypes", () => {
  it("accepts every modern presentation extension", () => {
    expect(kindFromFilename("deck.pptx")).toBe("pptx");
    expect(kindFromFilename("Deck.PPTM")).toBe("pptm");
    expect(kindFromFilename("show.ppsx")).toBe("ppsx");
    expect(kindFromFilename("brand.potx")).toBe("potx");
    expect(kindFromFilename("old.ppt")).toBe("ppt");
    expect(kindFromFilename("notes.docx")).toBe("unknown");
  });

  it("reads the authoritative kind from the content types part", () => {
    expect(kindFromContentTypes(CT("presentationml.presentation.main+xml"))).toBe("pptx");
    expect(kindFromContentTypes(CT("presentationml.slideshow.main+xml"))).toBe("ppsx");
    expect(kindFromContentTypes(CT("presentationml.template.main+xml"))).toBe("potx");
    expect(kindFromContentTypes(CT("presentationml.presentation.macroEnabled.main+xml"))).toBe("pptm");
    expect(kindFromContentTypes(CT("wordprocessingml.document.main+xml"))).toBe("unknown");
  });
});

describe("sniffPresentationPackage", () => {
  it("accepts a real pptx and trusts content types over the extension", () => {
    const res = sniffPresentationPackage(ZIP, "deck.pptx", CT("presentationml.template.main+xml"));
    expect(res.accepted).toBe(true);
    expect(res.kind).toBe("potx");
    expect(res.extensionMismatch).toBe(true);
    expect(res.message).toMatch(/POTX/);
  });

  it("accepts pptm, ppsx and potx", () => {
    for (const [name, ct, kind] of [
      ["m.pptm", "presentationml.presentation.macroEnabled.main+xml", "pptm"],
      ["s.ppsx", "presentationml.slideshow.main+xml", "ppsx"],
      ["t.potx", "presentationml.template.main+xml", "potx"],
    ] as const) {
      const res = sniffPresentationPackage(ZIP, name, CT(ct));
      expect([res.accepted, res.kind]).toEqual([true, kind]);
    }
  });

  it("routes legacy .ppt to conversion with an explanation", () => {
    const res = sniffPresentationPackage(CFB, "old.ppt");
    expect(res.accepted).toBe(false);
    expect(res.requiresConversion).toBe(true);
    expect(res.kind).toBe("ppt");
    expect(res.message).toMatch(/97–2003/);
  });

  it("catches a legacy binary file renamed to .pptx", () => {
    const res = sniffPresentationPackage(CFB, "sneaky.pptx");
    expect(res.requiresConversion).toBe(true);
    expect(res.extensionMismatch).toBe(true);
  });

  it("rejects non-Office bytes even with a .pptx name", () => {
    const res = sniffPresentationPackage(JPEG, "photo.pptx");
    expect(res.accepted).toBe(false);
    expect(res.requiresConversion).toBe(false);
    expect(res.message).toMatch(/not a PowerPoint package/);
  });

  it("rejects a Word package and an empty file", () => {
    expect(
      sniffPresentationPackage(ZIP, "doc.pptx", CT("wordprocessingml.document.main+xml")).accepted,
    ).toBe(false);
    expect(sniffPresentationPackage(new Uint8Array(), "x.pptx").message).toMatch(/empty/);
  });

  it("falls back to the extension when content types are not read yet", () => {
    expect(sniffPresentationPackage(ZIP, "deck.pptx").accepted).toBe(true);
    expect(sniffPresentationPackage(ZIP, "archive.zip").accepted).toBe(false);
  });
});

describe("validatePackageEntries", () => {
  it("passes a well-formed package", () => {
    const res = validatePackageEntries(OK_ENTRIES);
    expect(res.safeToParse).toBe(true);
    expect(res.risks).toHaveLength(0);
    expect(res.entryCount).toBe(3);
    expect(res.expandedBytes).toBe(14200);
  });

  it("blocks packages missing required parts", () => {
    const res = validatePackageEntries([{ path: "ppt/slides/slide1.xml", bytes: 10 }]);
    expect(res.safeToParse).toBe(false);
    expect(res.risks.map((r) => r.code).sort()).toEqual([
      "missing-content-types",
      "missing-presentation-part",
    ]);
  });

  it("blocks zip bombs by entry count, total expansion, entry size and ratio", () => {
    const many = Array.from({ length: MAX_ENTRIES + 1 }, (_, i) => ({
      path: `ppt/media/image${i}.png`,
      bytes: 10,
    }));
    expect(validatePackageEntries(many).risks.some((r) => r.code === "too-many-entries")).toBe(true);

    const huge = validatePackageEntries([...OK_ENTRIES, { path: "ppt/media/big.mov", bytes: 90_000_000 }]);
    expect(huge.risks.some((r) => r.code === "entry-too-large")).toBe(true);
    expect(huge.safeToParse).toBe(false);

    const total = validatePackageEntries([
      ...OK_ENTRIES,
      ...Array.from({ length: 10 }, (_, i) => ({ path: `ppt/media/m${i}.tif`, bytes: 70_000_000 })),
    ]);
    expect(total.risks.some((r) => r.code === "expands-too-large")).toBe(true);

    const ratio = validatePackageEntries([
      ...OK_ENTRIES,
      { path: "ppt/media/bomb.bin", bytes: 50_000_000, compressedBytes: 1000 },
    ]);
    expect(ratio.risks.some((r) => r.code === "suspicious-ratio")).toBe(true);
  });

  it("does not flag normal XML compression as a bomb", () => {
    const res = validatePackageEntries([
      ...OK_ENTRIES,
      { path: "ppt/slides/slide2.xml", bytes: 400_000, compressedBytes: 8_000 },
    ]);
    expect(res.risks).toHaveLength(0);
  });

  it("blocks traversal and absolute paths", () => {
    const trav = validatePackageEntries([...OK_ENTRIES, { path: "../../etc/passwd", bytes: 10 }]);
    expect(trav.risks.some((r) => r.code === "path-traversal")).toBe(true);
    expect(trav.safeToParse).toBe(false);

    const abs = validatePackageEntries([...OK_ENTRIES, { path: "/etc/passwd", bytes: 10 }]);
    expect(abs.risks.some((r) => r.code === "absolute-path")).toBe(true);
    expect(validatePackageEntries([...OK_ENTRIES, { path: "C:\\win\\a.dll", bytes: 1 }]).safeToParse).toBe(
      false,
    );
  });

  it("reports macros and OLE embeds as findings, never as blockers", () => {
    const res = validatePackageEntries([
      ...OK_ENTRIES,
      { path: "ppt/vbaProject.bin", bytes: 4000 },
      { path: "ppt/embeddings/oleObject1.bin", bytes: 9000 },
    ]);
    expect(res.hasMacros).toBe(true);
    expect(res.hasOleEmbeds).toBe(true);
    expect(res.safeToParse).toBe(true);
    expect(res.risks.map((r) => r.severity).sort()).toEqual(["info", "warning"]);
    expect(res.risks.find((r) => r.code === "macros-present")!.message).toMatch(/never run/);
  });
});

describe("XML and relationship hardening helpers", () => {
  it("flags DOCTYPE / ENTITY declarations", () => {
    expect(containsDoctypeOrEntity('<?xml version="1.0"?><!DOCTYPE x [ <!ENTITY a "b"> ]><x/>')).toBe(true);
    expect(containsDoctypeOrEntity("<p:sld><p:cSld/></p:sld>")).toBe(false);
  });

  it("identifies external relationship targets", () => {
    expect(isExternalRelationshipTarget("https://example.com/a.mp4")).toBe(true);
    expect(isExternalRelationshipTarget("file:///Users/me/movie.mov")).toBe(true);
    expect(isExternalRelationshipTarget("\\\\server\\share\\clip.mp4")).toBe(true);
    expect(isExternalRelationshipTarget("../media/media1.mp4")).toBe(false);
  });
});
