import { describe, expect, it } from "vitest";
import { deckDownloadFromToolOutput } from "../AgentDeckDownload";

const payload = JSON.stringify({
  deck: "GlobalLink Q3 review",
  file_name: "GlobalLink-Q3-review.pptx",
  slides: 6,
  native_slides: 5,
  download_url: "https://example.test/signed.pptx",
  warnings: ["one note"],
});

describe("deckDownloadFromToolOutput", () => {
  it("reads the flattened JSON text the agent bridge returns", () => {
    const out = deckDownloadFromToolOutput(payload);
    expect(out?.url).toBe("https://example.test/signed.pptx");
    expect(out?.slides).toBe(6);
    expect(out?.fileName).toBe("GlobalLink-Q3-review.pptx");
  });

  it("reads an MCP content array", () => {
    const out = deckDownloadFromToolOutput({ content: [{ type: "text", text: payload }] });
    expect(out?.deck).toBe("GlobalLink Q3 review");
    expect(out?.warnings).toEqual(["one note"]);
  });

  it("returns null while the tool is still running or failed", () => {
    expect(deckDownloadFromToolOutput(undefined)).toBeNull();
    expect(deckDownloadFromToolOutput("ERROR: Deck not found")).toBeNull();
  });
});
