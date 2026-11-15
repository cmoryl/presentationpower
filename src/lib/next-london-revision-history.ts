import type { LondonRevision } from "@/lib/next-london-revise";

/** JSON avoids expanding large saved artwork into thousands of RPC records. */
export interface LondonRevisionPage {
  revisionsJson: string;
  nextBeforeRev: number | null;
}

export function readLondonRevisionPage(page: LondonRevisionPage): LondonRevision[] {
  return JSON.parse(page.revisionsJson) as LondonRevision[];
}

/** Retain the existing 200-revision history using bounded snapshot pages. */
export async function loadLondonRevisionHistory(
  fetchPage: (input: { data: { beforeRev?: number } }) => Promise<LondonRevisionPage>,
): Promise<LondonRevision[]> {
  const revisions: LondonRevision[] = [];
  let beforeRev: number | undefined;
  for (let pageIndex = 0; pageIndex < 20; pageIndex += 1) {
    const page = await fetchPage({ data: { beforeRev } });
    revisions.push(...readLondonRevisionPage(page));
    if (page.nextBeforeRev === null) return revisions;
    if (beforeRev !== undefined && page.nextBeforeRev >= beforeRev) {
      throw new Error("Could not advance through the revision history.");
    }
    beforeRev = page.nextBeforeRev;
  }
  return revisions;
}