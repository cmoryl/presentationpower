/**
 * Floating dock for Debugging Workflow mode.
 *
 * Hidden by default. Turn it on with `?uxdebug=1` (or Ctrl/⌘+Shift+U) and it
 * records the session, shows live step counts, and links to the report.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";

import { uxRecorder } from "@/lib/ux-debug/recorder";
import { analyzeSession } from "@/lib/ux-debug/analyze";
import type { UxSession } from "@/lib/ux-debug/types";

export function UxDebugDock() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [session, setSession] = useState<UxSession | null>(null);
  const [open, setOpen] = useState(true);
  const [noteText, setNoteText] = useState("");

  // Enable from query param or persisted flag.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("uxdebug") === "1") uxRecorder.setEnabled(true);
    if (params.get("uxdebug") === "0") uxRecorder.setEnabled(false);
    setEnabled(uxRecorder.isEnabled());
    setSession(uxRecorder.current());
  }, []);

  useEffect(() => {
    return uxRecorder.subscribe((s) => {
      setSession(s ? { ...s } : null);
      setEnabled(uxRecorder.isEnabled());
    });
  }, []);

  // ⌘/Ctrl + Shift + U toggles the dock.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if ((ev.metaKey || ev.ctrlKey) && ev.shiftKey && ev.key.toLowerCase() === "u") {
        ev.preventDefault();
        const next = !uxRecorder.isEnabled();
        uxRecorder.setEnabled(next);
        setEnabled(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Feed route changes into the recorder.
  useEffect(() => {
    if (!enabled) return;
    uxRecorder.recordNav(window.location.pathname);
    return router.subscribe("onResolved", () => {
      uxRecorder.recordNav(window.location.pathname);
    });
  }, [enabled, router]);

  const live = useMemo(() => (session ? analyzeSession(session) : null), [session]);

  const start = useCallback(() => {
    const s = uxRecorder.start();
    setSession({ ...s });
  }, []);
  const stop = useCallback(() => {
    uxRecorder.stop();
    setSession(null);
  }, []);

  if (!enabled) return null;

  const recording = Boolean(session);
  const topIssue = live?.issues[0];

  return (
    <div
      className="fixed bottom-4 left-4 z-[9999] w-[280px] rounded-2xl border border-black/10 bg-white/95 p-3 text-[#03002C] shadow-xl backdrop-blur"
      role="region"
      aria-label="Debugging workflow recorder"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
          <span
            aria-hidden
            className={`h-2 w-2 rounded-full ${recording ? "animate-pulse bg-[#E53D2E]" : "bg-black/25"}`}
          />
          Debug workflow
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-full px-2 py-0.5 text-[11px] text-black/60 hover:bg-black/5"
            aria-expanded={open}
          >
            {open ? "Hide" : "Show"}
          </button>
          <button
            type="button"
            onClick={() => {
              uxRecorder.setEnabled(false);
              setEnabled(false);
            }}
            className="rounded-full px-2 py-0.5 text-[11px] text-black/60 hover:bg-black/5"
            aria-label="Turn off debugging workflow mode"
          >
            ✕
          </button>
        </div>
      </div>

      {open ? (
        <>
          <div className="mt-2 flex gap-1.5">
            {recording ? (
              <button
                type="button"
                onClick={stop}
                className="flex-1 rounded-full bg-[#03002C] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#03002C]/90"
              >
                Stop &amp; analyze
              </button>
            ) : (
              <button
                type="button"
                onClick={start}
                className="flex-1 rounded-full bg-[#003FC7] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#003FC7]/90"
              >
                Record session
              </button>
            )}
            <Link
              to="/dev/ux-debug"
              className="rounded-full border border-black/15 px-3 py-1.5 text-xs font-medium hover:bg-black/5"
            >
              Report
            </Link>
          </div>

          {recording && live ? (
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-black/60">
                <span>{live.stepCount} steps</span>
                <span>
                  {live.issues.length} issue{live.issues.length === 1 ? "" : "s"} · health{" "}
                  {live.healthScore}
                </span>
              </div>
              {topIssue ? (
                <div className="rounded-lg bg-black/[0.04] p-2 text-[11px] leading-snug">
                  <span className="font-semibold uppercase tracking-wide text-[#E53D2E]">
                    {topIssue.severity}
                  </span>{" "}
                  {topIssue.title}
                </div>
              ) : (
                <div className="rounded-lg bg-black/[0.04] p-2 text-[11px] text-black/55">
                  Clean so far — keep going through the flow.
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!noteText.trim()) return;
                  uxRecorder.note(noteText.trim());
                  setNoteText("");
                }}
                className="flex gap-1"
              >
                <input
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add a tester note…"
                  aria-label="Add a tester note to the recording"
                  className="min-w-0 flex-1 rounded-full border border-black/15 px-2.5 py-1 text-[11px] outline-none focus:border-[#003FC7]"
                />
                <button
                  type="submit"
                  className="rounded-full border border-black/15 px-2.5 py-1 text-[11px] hover:bg-black/5"
                >
                  Pin
                </button>
              </form>
            </div>
          ) : (
            <p className="mt-2 text-[11px] leading-snug text-black/55">
              Records navigation, clicks, toggles and preview states, then scores the friction it
              finds. ⌘/Ctrl+⇧+U toggles this dock.
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}
