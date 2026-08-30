/**
 * PrintLogoUploadField — inspector control for any print logo slot.
 * Upload a file (stored in the private slide-media bucket), paste a URL, reset
 * to the approved organisation lockup, or clear the slot entirely.
 */
import { useRef, useState } from "react";
import { toast } from "sonner";
import { uploadSlideMedia } from "@/lib/slide-media";
import { ORG_LOGO } from "@/lib/print-library/org-facts";

export function PrintLogoUploadField({
  label,
  value,
  onChange,
  showOrgDefaults = false,
  inputClassName = "",
}: {
  label: string;
  value?: string;
  onChange: (url: string | undefined) => void;
  /** Offer one-click "use our logo" light / dark / black lockups. */
  showOrgDefaults?: boolean;
  inputClassName?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const up = await uploadSlideMedia(file, file.name);
      onChange(up.signedUrl);
      toast.success("Logo uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Logo upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium opacity-70">{label}</span>
        {value && (
          <img
            src={value}
            alt=""
            className="h-4 w-auto max-w-[90px] object-contain"
          />
        )}
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-1">
        <input
          className={inputClassName}
          placeholder="Logo URL or /path"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || undefined)}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="rounded border border-white/15 px-2 py-1 text-[11px] hover:bg-white/10 disabled:opacity-50"
        >
          {busy ? "Uploading…" : "Upload"}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="hidden"
        onChange={(e) => void pick(e.target.files?.[0])}
      />
      <div className="flex flex-wrap gap-1">
        {showOrgDefaults && (
          <>
            <LogoChip label="Our logo (colour)" onClick={() => onChange(ORG_LOGO.light)} />
            <LogoChip label="Our logo (white)" onClick={() => onChange(ORG_LOGO.dark)} />
            <LogoChip label="Our logo (black)" onClick={() => onChange(ORG_LOGO.black)} />
          </>
        )}
        {value && <LogoChip label="Clear" onClick={() => onChange(undefined)} />}
      </div>
    </div>
  );
}

function LogoChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-white/15 px-2 py-[3px] text-[10px] opacity-80 hover:bg-white/10 hover:opacity-100"
    >
      {label}
    </button>
  );
}
