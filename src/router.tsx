import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";


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

  // Scroll restoration is keyed per history entry (the router default), so
  // back/forward returns to where the reader was. The old pathname key reused a
  // page's last scroll position on every fresh visit, which opened new pages
  // half-way down. Fresh navigations to a different page always start at top.
  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  if (typeof window !== "undefined") {
    let popped = false;
    window.addEventListener("popstate", () => {
      popped = true;
    });
    router.subscribe("onResolved", ({ fromLocation, toLocation, pathChanged }) => {
      const wasPop = popped;
      popped = false;
      if (!fromLocation || !pathChanged || wasPop || toLocation.hash) return;
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    });
  }

  return router;
};
