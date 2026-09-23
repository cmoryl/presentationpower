import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

/** Restoration key: the page identity, so a re-render restores this page. */
const scrollKey = (location: { pathname: string; searchStr: string; hash: string }) =>
  `${location.pathname}${location.searchStr}${location.hash}`;

export const getRouter = () => {
  // One app-wide read policy. Before this every screen inherited bare defaults,
  // so a flaky connection behaved differently page to page: some views retried,
  // some gave up instantly, and none of them waited for the network to return.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Three tries with backoff, but never retry a refusal — a 401/403/404
        // is an answer, not a dropped packet, and retrying it only delays the
        // message the user needs to see.
        retry: (failureCount, error) => {
          const status = (error as { status?: number } | null)?.status;
          if (typeof status === "number" && status >= 400 && status < 500) return false;
          return failureCount < 3;
        },
        retryDelay: (attempt) => Math.min(8000, 600 * 2 ** attempt),
        // Reads stay warm for half a minute so moving between pages doesn't
        // re-fetch everything, and a request paused offline resumes instead of
        // failing outright.
        staleTime: 30_000,
        networkMode: "offlineFirst",
      },
      mutations: {
        // Saves are not idempotent across the board, so they are not retried
        // automatically — a failed save surfaces instead of silently doubling.
        retry: 0,
        networkMode: "offlineFirst",
      },
    },
  });

  // Router renders can settle well after the first paint (deferred loaders,
  // slow queries, invalidations). Each of those fires an `onRendered` event, and
  // the built-in scroll restoration treats it like a fresh navigation — which
  // yanked the reader back to the top mid-scroll. Reset scroll only when the
  // page identity actually changed.
  // Seeded with the entry URL: the very first `onRendered` can arrive seconds
  // after hydration, and it must not count as a navigation away from the page
  // the reader is already scrolling.
  let lastKey: string | null =
    typeof window === "undefined"
      ? null
      : `${window.location.pathname}${window.location.search}${window.location.hash}`;

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: ({ location }) => {
      const key = scrollKey(location);

      if (key === lastKey) return false;
      lastKey = key;
      return true;
    },

    getScrollRestorationKey: scrollKey,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
