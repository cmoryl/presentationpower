import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

/** Restoration key: the page identity, so a re-render restores this page. */
const scrollKey = (location: { pathname: string; searchStr: string; hash: string }) =>
  `${location.pathname}${location.searchStr}${location.hash}`;

export const getRouter = () => {
  const queryClient = new QueryClient();

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

