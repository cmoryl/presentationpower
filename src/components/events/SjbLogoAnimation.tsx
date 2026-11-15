import { useEffect, useRef, useState } from "react";
import { Download, Pause, Play } from "lucide-react";
import { Button } from "@/design-system/element";
import animation from "@/assets/san-juan-bowl/bowl-rotation-logo.mp4.asset.json";

export interface SjbLogoAnimationProps { className?: string }

export function SjbLogoAnimation({ className = "" }: SjbLogoAnimationProps) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!motion.matches) void video.current?.play().catch(() => setPlaying(false));
  }, []);
  async function download() {
    setSaving(true); setError(null);
    try {
      const response = await fetch(animation.url);
      if (!response.ok) throw new Error("Video download unavailable. Please try again.");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url; link.download = "bowl-seamless-360-rotation-logo.mp4";
      document.body.append(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError("Video download unavailable. Please try again."); }
    finally { setSaving(false); }
  }
  return <section aria-labelledby="sjb-animation-title" className={`mt-8 space-y-4 ${className}`}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="sjb-animation-title" className="text-xl font-semibold text-foreground">Bowl logo animation</h2>
      <div className="flex gap-2">
        <Button variant="outline" size="icon" aria-label={playing ? "Pause logo animation" : "Play logo animation"} title={playing ? "Pause animation" : "Play animation"} onClick={() => {
          if (playing) video.current?.pause();
          else void video.current?.play().catch(() => setError("Playback could not start. Please try again."));
        }}>{playing ? <Pause size={16} /> : <Play size={16} />}</Button>
        <Button variant="outline" disabled={saving} onClick={download}><Download size={16} />{saving ? "Downloading…" : "Download video"}</Button>
      </div>
    </div>
    <video ref={video} src={animation.url} muted loop playsInline preload="auto" aria-label="San Juan Bowl seamless rotating logo" className="aspect-video w-full rounded-md bg-muted object-contain" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => setError("The logo video could not load. Please try refreshing.")} />
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </section>;
}