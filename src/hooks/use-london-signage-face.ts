// London signage masters outline their copy into vector paths, so the Geist Bold
// face has to be in memory before any synchronous builder runs. This hook warms
// it up once per view and re-renders when it is ready.

import { useEffect, useState } from "react";

import {
  loadLondonSignageFace,
  londonSignageFaceReady,
} from "@/lib/next-london-text-outline";

export function useLondonSignageFace(): boolean {
  const [ready, setReady] = useState(() => londonSignageFaceReady());

  useEffect(() => {
    if (ready) return;
    let live = true;
    void loadLondonSignageFace()
      .then(() => {
        if (live) setReady(true);
      })
      .catch(() => {
        /* builders surface the failure when a download is attempted */
      });
    return () => {
      live = false;
    };
  }, [ready]);

  return ready;
}
