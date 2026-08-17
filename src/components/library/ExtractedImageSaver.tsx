import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Images, Loader2, Check, Maximize2, Download } from "lucide-react";
import { ImageAlphaInspector } from "@/components/library/ImageAlphaInspector";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BRAND_MODES } from "@/lib/taxonomy";
import { SaveAssetButton } from "@/components/library/SaveToDivisionButton";
import { imageUrlToPng } from "@/lib/inspector-asset-save";
import {
  listExtractedDeckImages,
  saveExtractedImagesToDivision,
} from "@/lib/imported-imagery.functions";

/**
 * Cherry-pick the images an imported PPTX gave us and file them into any
 * division's imagery library — copy (default, duplicates the binary) or move.
 */
export function ExtractedImageSaver({
  deckId,
  defaultDivisionId,
}: {
  deckId: string;
  defaultDivisionId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [divisionId, setDivisionId] = useState(defaultDivisionId ?? BRAND_MODES[0].id);
  const [mode, setMode] = useState<"copy" | "move">("copy");
  const [inspectId, setInspectId] = useState<string | null>(null);
  const qc = useQueryClient();
  const router = useRouter();

  const listFn = useServerFn(listExtractedDeckImages);
  const saveFn = useServerFn(saveExtractedImagesToDivision);

  const imagesQ = useQuery({
    queryKey: ["extracted-deck-images", deckId],
    queryFn: () => listFn({ data: { deckId } }),
    enabled: open,
  });

  const images = useMemo(() => imagesQ.data ?? [], [imagesQ.data]);
  const allSelected = images.length > 0 && selected.size === images.length;

  const save = useMutation({
    mutationFn: () =>
      saveFn({ data: { imageIds: [...selected], divisionId, mode, tags: ["imported_deck"] } }),
    onSuccess: (res) => {
      const label = BRAND_MODES.find((b) => b.id === divisionId)?.name ?? divisionId;
      const filed = res.saved + res.already;
      const bits: string[] = [];
      if (res.saved) bits.push(`${res.saved} ${mode === "move" ? "moved" : "copied"}`);
      if (res.already) bits.push(`${res.already} already in ${label}`);
      if (res.skipped) bits.push(`${res.skipped} failed`);
      const pending = filed - res.approved;
      const description = [
        filed ? `Filed into ${label}'s master imagery library.` : "",
        pending > 0 && filed
          ? `${pending} awaiting admin approval before they appear on approved-only shelves.`
          : "",
        res.failures.length ? res.failures.join(" · ") : "",
      ]
        .filter(Boolean)
        .join(" ");

      if (!filed) {
        toast.error("Nothing was saved.", { description, duration: 10000 });
      } else {
        toast.success(
          `${filed} image${filed === 1 ? "" : "s"} in ${label}${bits.length ? ` · ${bits.join(" · ")}` : ""}`,
          {
            description,
            duration: 10000,
            action: {
              label: "View library",
              onClick: () => router.navigate({ to: "/imagery", search: { division: divisionId } }),
            },
          },
        );
      }
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["division-imagery"] });
      qc.invalidateQueries({ queryKey: ["extracted-deck-images", deckId] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not save these images."),
  });

  /** Download one extracted image straight to the user's computer. */
  async function downloadImage(img: { signedUrl: string | null; filename: string }) {
    if (!img.signedUrl) {
      toast.error("This image has no readable file.");
      return;
    }
    try {
      const res = await fetch(img.signedUrl);
      if (!res.ok) throw new Error(`Could not fetch image (${res.status}).`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = img.filename || "image";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const [downloading, setDownloading] = useState(false);
  async function downloadSelected() {
    const picked = images.filter((i) => selected.has(i.id));
    if (!picked.length) return;
    setDownloading(true);
    try {
      for (const img of picked) {
        await downloadImage(img);
        await new Promise((r) => setTimeout(r, 350)); // browsers throttle bursts
      }
      toast.success(`Downloaded ${picked.length} image${picked.length === 1 ? "" : "s"}.`);
    } finally {
      setDownloading(false);
    }
  }


  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Images className="h-4 w-4" strokeWidth={1.75} />
          Save images to a library
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Extracted imagery</DialogTitle>
          <DialogDescription>
            Pick the pictures recovered from this deck and choose a division — they are filed into
            that division&apos;s master imagery library, available everywhere it&apos;s used (briefs,
            print and social).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-3 border-b border-border pb-3">
          <Select value={divisionId} onValueChange={setDivisionId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Division" />
            </SelectTrigger>
            <SelectContent>
              {BRAND_MODES.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={mode} onValueChange={(v) => setMode(v as "copy" | "move")}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="copy">Copy</SelectItem>
              <SelectItem value="move">Move</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setSelected(allSelected ? new Set() : new Set(images.map((i) => i.id)))
            }
            disabled={!images.length}
          >
            {allSelected ? "Clear selection" : "Select all"}
          </Button>

          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{selected.size} selected</span>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={!selected.size || downloading}
              onClick={() => void downloadSelected()}
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
              ) : (
                <Download className="h-4 w-4" strokeWidth={1.75} />
              )}
              Download to my computer
            </Button>

            <Button
              size="sm"
              disabled={!selected.size || save.isPending}
              onClick={() => save.mutate()}
              className="gap-2"
            >
              {save.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
              ) : (
                <Check className="h-4 w-4" strokeWidth={1.75} />
              )}
              Save to library
            </Button>
          </div>
        </div>

        <div className="max-h-[55vh] overflow-y-auto">
          {imagesQ.isLoading ? (
            <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
              Loading extracted imagery…
            </div>
          ) : !images.length ? (
            <p className="py-10 text-sm text-muted-foreground">
              No extracted images are linked to this deck yet. Re-import it to recover its media.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((img) => {
                const on = selected.has(img.id);
                return (
                  <li key={img.id} className="relative">
                    <button
                      type="button"
                      onClick={() => toggle(img.id)}
                      aria-pressed={on}
                      className={`group w-full overflow-hidden rounded-lg border text-left transition ${
                        on ? "border-primary ring-2 ring-primary/40" : "border-border"
                      }`}
                    >
                      <div
                        className="relative aspect-[4/3]"
                        style={{
                          background:
                            "repeating-conic-gradient(hsl(var(--muted)) 0% 25%, hsl(var(--background)) 0% 50%) 50% / 14px 14px",
                        }}
                      >
                        {img.signedUrl ? (
                          <img
                            src={img.signedUrl}
                            alt={img.filename}
                            loading="lazy"
                            className="h-full w-full object-contain"
                          />
                        ) : null}
                        {on ? (
                          <span className="absolute right-2 top-2 rounded-full bg-primary p-1 text-primary-foreground">
                            <Check className="h-3 w-3" strokeWidth={2} />
                          </span>
                        ) : null}
                      </div>
                      <div className="space-y-0.5 p-2 pr-10">
                        <p className="truncate text-xs font-medium">{img.filename}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {img.slideIndexes.length
                            ? `Slide ${img.slideIndexes.map((i) => i + 1).join(", ")}`
                            : "Unplaced"}{" "}
                          · {Math.max(1, Math.round(img.sizeBytes / 1024))} KB
                        </p>
                      </div>
                    </button>
                    <div className="absolute bottom-2 right-2 flex gap-1">
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        aria-label={`Download ${img.filename} to my computer`}
                        title="Download to my computer"
                        className="h-8 w-8"
                        onClick={() => void downloadImage(img)}
                      >
                        <Download className="h-4 w-4" strokeWidth={1.75} />
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        aria-label={`Inspect ${img.filename} at full size`}
                        className="h-8 w-8"
                        onClick={() => setInspectId(img.id)}
                      >
                        <Maximize2 className="h-4 w-4" strokeWidth={1.75} />
                      </Button>
                    </div>

                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {(() => {
          const img = images.find((i) => i.id === inspectId);
          const divisionLabel =
            BRAND_MODES.find((b) => b.id === divisionId)?.name ?? divisionId;
          return (
            <ImageAlphaInspector
              open={!!img}
              onOpenChange={(v) => !v && setInspectId(null)}
              src={img?.signedUrl}
              filename={img?.filename ?? ""}
              caption={
                img
                  ? `${Math.max(1, Math.round(img.sizeBytes / 1024))} KB${
                      img.slideIndexes.length
                        ? ` · Slide ${img.slideIndexes.map((i) => i + 1).join(", ")}`
                        : ""
                    }`
                  : undefined
              }
              footerExtra={
                img?.signedUrl ? (
                  <>
                    <label className="text-xs text-muted-foreground" htmlFor="inspector-division">
                      Save to division library
                    </label>
                    <Select value={divisionId} onValueChange={setDivisionId}>
                      <SelectTrigger id="inspector-division" className="w-56">
                        <SelectValue placeholder="Division" />
                      </SelectTrigger>
                      <SelectContent>
                        {BRAND_MODES.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <SaveAssetButton
                      divisionId={divisionId}
                      label={`Add to ${divisionLabel} master imagery`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium transition hover:border-primary hover:text-primary disabled:opacity-60"
                      build={async () => ({
                        dataUrl: await imageUrlToPng(img.signedUrl!),
                        filename: img.filename,
                        note: `Imported deck image · ${img.filename}`,
                        kind: "upload",
                        tags: ["imported_deck"],
                      })}
                    />
                  </>
                ) : undefined
              }
            />
          );
        })()}
      </DialogContent>
    </Dialog>
  );
}
