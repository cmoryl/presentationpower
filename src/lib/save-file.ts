// One download helper for browser-built files. Safari ignores downloads
// started inside an embedded frame (e.g. the editor preview), so there the
// file opens in a new tab instead, where File → Save works.

function isFramedSafari() {
  if (typeof window === "undefined") return false;
  let framed = false;
  try {
    framed = window.self !== window.top;
  } catch {
    framed = true;
  }
  const ua = navigator.userAgent;
  const safari = /Safari\//.test(ua) && !/Chrome\/|Chromium\/|CriOS\/|Edg\//.test(ua);
  return framed && safari;
}

/** Call synchronously from the click handler. */
export function saveFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  if (isFramedSafari()) {
    window.open(url, "_blank", "noopener");
  } else {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
