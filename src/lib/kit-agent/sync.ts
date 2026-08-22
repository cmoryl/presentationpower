// Cross-device chat history sync for the Events Agent and Social Agent.
//
// Every turn is already persisted to agent_messages by /api/kit-agent-chat, so
// the database — not the browser — is the source of truth. This module keeps an
// open workspace in step with that record: when the same user talks to the
// agent on another device (or another tab), the thread list and the open
// conversation catch up without a manual reload.
//
// Realtime replication is not guaranteed to be enabled for agent_messages, so
// syncing is a cheap authenticated re-read triggered by the moments that matter
// (tab focus, becoming visible) plus a slow idle poll. Reads never run while a
// local turn is streaming, so a remote snapshot can't truncate the reply the
// user is currently watching.

import { useEffect, useRef } from "react";
import type { UIMessage } from "ai";

import { loadKitThread, listKitThreads, type KitAgentThread, type KitSurface } from "./threads";

/** Idle re-read cadence. Slow on purpose: focus/visibility carry most syncs. */
const IDLE_POLL_MS = 20_000;

/** Cheap identity of a message list, used to skip no-op state updates. */
export function messagesFingerprint(messages: UIMessage[]): string {
  if (messages.length === 0) return "0";
  const last = messages[messages.length - 1];
  return `${messages.length}:${last?.id ?? ""}:${last?.parts?.length ?? 0}`;
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
    return () => {
      cancelled = true;
      off();
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
    return () => {
      cancelled = true;
      off();
    };
  }, [surface, enabled]);
}
