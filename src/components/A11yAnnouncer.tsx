// Global screen-reader announcer. Sonner renders toasts in a polite live
// region, which is fine for successes but too quiet for failures the user
// must act on — this gives us a real assertive channel.

import { useEffect, useState } from "react";

type Politeness = "polite" | "assertive";
type Listener = (msg: string, politeness: Politeness) => void;

const listeners = new Set<Listener>();

/** Announce a message to screen readers outside of any visual component. */
export function announce(message: string, politeness: Politeness = "polite") {
  listeners.forEach((l) => l(message, politeness));
}

export function A11yAnnouncer() {
  const [polite, setPolite] = useState("");
  const [assertive, setAssertive] = useState("");

  useEffect(() => {
    const listener: Listener = (msg, politeness) => {
      const set = politeness === "assertive" ? setAssertive : setPolite;
      // Clear first so repeated identical messages are re-announced.
      set("");
      window.setTimeout(() => set(msg), 60);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return (
    <>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {polite}
      </div>
      <div className="sr-only" role="alert" aria-live="assertive" aria-atomic="true">
        {assertive}
      </div>
    </>
  );
}
