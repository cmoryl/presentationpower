// Connection banner — the app's one honest statement about the network.
//
// Before this, a dropped connection looked exactly like "there is nothing
// here": a failed load rendered the same empty state as an empty account. The
// banner says the connection is gone, and says when it is back, so a user can
// tell "my work didn't save" from "I have no work".

import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";

export function useOnlineStatus() {
  // Assume online until the browser says otherwise: SSR has no network state,
  // and a false "offline" flash on first paint would be its own lie.
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setOnline(window.navigator.onLine);
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  return online;
}

export function ConnectionBanner() {
  const online = useOnlineStatus();
  // Was offline at some point this session — so the "back online" note only
  // appears to someone who actually saw the outage.
  const [wasOffline, setWasOffline] = useState(false);
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    if (!online) {
      setWasOffline(true);
      setShowBack(false);
      return;
    }
    if (!wasOffline) return;
    setShowBack(true);
    const t = setTimeout(() => setShowBack(false), 6000);
    return () => clearTimeout(t);
  }, [online, wasOffline]);

  if (online && !showBack) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[80] flex justify-center px-3 pt-3 print:hidden"
    >
      {online ? (
        <div className="pointer-events-none flex items-center gap-2 rounded-full bg-[#03002C] px-4 py-2 text-xs font-semibold text-white shadow-lg dark:bg-card">
          <Wifi className="h-3.5 w-3.5" aria-hidden />
          Back online — anything unsaved will save on your next change.
        </div>
      ) : (
        <div className="pointer-events-none flex items-center gap-2 rounded-full bg-[#E53D2E] px-4 py-2 text-xs font-semibold text-white shadow-lg">
          <WifiOff className="h-3.5 w-3.5" aria-hidden />
          You're offline — pages may look empty and changes won't save until the connection is back.
        </div>
      )}
    </div>
  );
}
