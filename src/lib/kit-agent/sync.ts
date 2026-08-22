// Cross-device chat history sync for the Events Agent and Social Agent.
//
// Every turn is already persisted to agent_messages by /api/kit-agent-chat, so
// the database — not the browser — is the source of truth. This module keeps an
// open workspace in step with that record: when the same user talks to the
// agent on another device (or another tab), the thread list and the open
// conversation catch up without a manual reload.
//
// Primary transport is a realtime WebSocket subscription on agent_messages /
// agent_threads: a row written on another device pushes here in the same
// instant, and we answer it with one authenticated re-read (the payload itself
// is untrusted for shape, and RLS already scopes what we can read back).
// Focus/visibility triggers and a slow idle poll stay as a safety net for the
// minutes when a socket is dropped or blocked by a proxy. Reads never run while
// a local turn is streaming, so a remote snapshot can't truncate the reply the
// user is currently watching.

import { useEffect, useRef } from "react";
import type { UIMessage } from "ai";

import { supabase } from "@/integrations/supabase/client";

import { loadKitThread, listKitThreads, type KitAgentThread, type KitSurface } from "./threads";

/**
 * Idle re-read cadence — a backstop only, now that realtime pushes carry the
 * live path. Kept slow so a long-lived tab still self-heals if the socket died.
 */
const IDLE_POLL_MS = 45_000;

/** Coalesce bursts of realtime rows (a turn writes user + assistant) into one read. */
const REALTIME_DEBOUNCE_MS = 180;

/** Cheap identity of a message list, used to skip no-op state updates. */
export function messagesFingerprint(messages: UIMessage[]): string {
  if (messages.length === 0) return "0";
  const last = messages[messages.length - 1];
  return `${messages.length}:${last?.id ?? ""}:${last?.parts?.length ?? 0}`;
}

/**
 * Subscribe to postgres changes and call `run` (debounced) on every event.
 *
 * RLS applies to realtime, so a subscriber only ever receives rows it is
 * allowed to read; the filter is a bandwidth optimisation, not the boundary.
 */
function onRealtimeRows(
  channelName: string,
  table: "agent_messages" | "agent_threads",
  filter: string | undefined,
  run: () => void,
): () => void {
  // Topics must be unique per subscriber: two components watching the same
  // thread would otherwise collide on one channel and tear each other down.
  const topic = `${channelName}:${Math.random().toString(36).slice(2, 8)}`;
  let timer: number | undefined;
  const fire = () => {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(run, REALTIME_DEBOUNCE_MS);
  };

  const channel = supabase
    .channel(topic)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table, ...(filter ? { filter } : {}) },
      fire,
    )
    .subscribe();

  return () => {
    if (timer) window.clearTimeout(timer);
    void supabase.removeChannel(channel);
  };
}

function onSyncTriggers(run: () => void): () => void {
  const onFocus = () => run();
  const onVisible = () => {
    if (document.visibilityState === "visible") run();
  };
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onVisible);
  const timer = window.setInterval(() => {
    if (document.visibilityState === "visible") run();
  }, IDLE_POLL_MS);
  return () => {
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onVisible);
    window.clearInterval(timer);
  };
}

/**
 * Keep one open conversation in step with its stored history.
 *
 * `paused` must be true while a local turn is streaming — the streamed messages
 * are not in the database yet, so adopting a remote snapshot mid-turn would
 * visibly drop the reply.
 */
export function useKitThreadMessageSync({
  threadId,
  enabled,
  paused,
  onRemoteMessages,
}: {
  threadId: string;
  enabled: boolean;
  paused: boolean;
  onRemoteMessages: (messages: UIMessage[]) => void;
}) {
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const cbRef = useRef(onRemoteMessages);
  cbRef.current = onRemoteMessages;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    let cancelled = false;
    let inflight = false;

    const run = () => {
      if (cancelled || inflight || pausedRef.current) return;
      inflight = true;
      loadKitThread(threadId)
        .then(({ messages }) => {
          if (cancelled || pausedRef.current) return;
          cbRef.current(messages);
        })
        .catch(() => undefined)
        .finally(() => {
          inflight = false;
        });
    };

    const off = onSyncTriggers(run);
    const offRealtime = onRealtimeRows(
      `kit-agent-messages:${threadId}`,
      "agent_messages",
      `thread_id=eq.${threadId}`,
      run,
    );
    // Catch up immediately on mount: the socket only reports what happens next.
    run();
    return () => {
      cancelled = true;
      off();
      offRealtime();
    };
  }, [threadId, enabled]);
}

/** Keep the conversation rail in step with threads created on other devices. */
export function useKitThreadListSync({
  surface,
  enabled,
  onThreads,
}: {
  surface: KitSurface;
  enabled: boolean;
  onThreads: (threads: KitAgentThread[]) => void;
}) {
  const cbRef = useRef(onThreads);
  cbRef.current = onThreads;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    let cancelled = false;
    let inflight = false;

    const run = () => {
      if (cancelled || inflight) return;
      inflight = true;
      listKitThreads(surface)
        .then((rows) => {
          if (!cancelled) cbRef.current(rows);
        })
        .catch(() => undefined)
        .finally(() => {
          inflight = false;
        });
    };

    const off = onSyncTriggers(run);
    // Threads are owner-scoped by RLS, so no filter is needed to stay private:
    // a client is only ever sent rows it could read itself.
    const offRealtime = onRealtimeRows(
      `kit-agent-threads:${surface}`,
      "agent_threads",
      undefined,
      run,
    );
    const offMessages = onRealtimeRows(
      `kit-agent-threads-activity:${surface}`,
      "agent_messages",
      undefined,
      run,
    );
    return () => {
      cancelled = true;
      off();
      offRealtime();
      offMessages();
    };
  }, [surface, enabled]);
}
