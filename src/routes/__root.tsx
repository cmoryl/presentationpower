import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SkinBackdropLibrary } from "@/components/slide/SkinBackdropContext";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { ToastAssertiveLiveRegion, installToastA11y } from "@/lib/toast-a11y";
import { UxDebugDock } from "@/components/debug/UxDebugDock";

function NotFoundComponent() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#03002C] px-6 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(120% 100% at 15% 0%, rgba(161,251,249,0.16) 0%, transparent 55%), radial-gradient(100% 100% at 85% 0%, rgba(122,92,255,0.18) 0%, transparent 55%)",
        }}
      />
      <div className="relative max-w-md text-center">
        <div className="text-[10px] uppercase tracking-[0.35em] text-white/40">
          TransPerfect Element
        </div>
        <h1 className="mt-4 text-6xl font-bold tracking-tight sm:text-7xl">404</h1>
        <h2 className="mt-3 text-xl font-semibold">This page couldn't be found</h2>
        <p className="mt-3 text-sm text-white/60">
          The route you followed may have moved, been renamed, or never existed. Head back to the
          dashboard to keep working.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#03002C] transition hover:bg-white/90"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "TransPerfect Element · Command Center" },
      {
        name: "description",
        content:
          "Governed deck assembly, brand intelligence, and AI-powered enablement for TransPerfect sales teams.",
      },
      { name: "theme-color", content: "#003FC7" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "TP Modular" },
      { name: "mobile-web-app-capable", content: "yes" },
      { property: "og:title", content: "TransPerfect Element · Command Center" },
      {
        property: "og:description",
        content:
          "Governed deck assembly, brand intelligence, and AI-powered enablement for TransPerfect sales teams.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "TransPerfect Element · Command Center" },
      {
        name: "twitter:description",
        content:
          "Governed deck assembly, brand intelligence, and AI-powered enablement for TransPerfect sales teams.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8a9ab1bd-6be9-4889-bd5d-1b5ee1a151bf/id-preview-a7a94b56--c88f7719-c0c5-420f-915f-a154f8270b06.lovable.app-1784554479394.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8a9ab1bd-6be9-4889-bd5d-1b5ee1a151bf/id-preview-a7a94b56--c88f7719-c0c5-420f-915f-a154f8270b06.lovable.app-1784554479394.png",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "icon",
        href: "/favicon-light.png",
        type: "image/png",
        media: "(prefers-color-scheme: light)",
        "data-theme-icon": "",
      },
      {
        rel: "icon",
        href: "/favicon-dark.png",
        type: "image/png",
        media: "(prefers-color-scheme: dark)",
      },
      { rel: "apple-touch-icon", href: "/icon-1024.png", sizes: "180x180" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      // Fallback fonts so translated decks in CJK / Arabic / Hebrew / Devanagari render.
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;600;700&family=Noto+Sans+TC:wght@400;600;700&family=Noto+Sans+JP:wght@400;600;700&family=Noto+Sans+KR:wght@400;600;700&family=Noto+Sans+Arabic:wght@400;600;700&family=Noto+Sans+Hebrew:wght@400;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&family=Noto+Sans+Thai:wght@400;600;700&display=swap",
      },
      // Style-pack faces — only used by the public alternate design directory,
      // loaded lazily by the browser (display=swap) so brand surfaces are
      // unaffected.
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Archivo+Black&family=Instrument+Serif:ital@0;1&family=Work+Sans:wght@400;600;700&family=Space+Grotesk:wght@400;500;700&family=DM+Sans:wght@400;500;700&family=Space+Mono:wght@400;700&family=Sora:wght@300;400;600&family=Manrope:wght@400;600&family=JetBrains+Mono:wght@400;500&family=Cormorant+Garamond:wght@400;500;600&family=Karla:wght@400;700&family=Jura:wght@400;500;600&family=IBM+Plex+Sans:wght@400;600&family=IBM+Plex+Mono:wght@400;500&family=Bebas+Neue&family=Barlow:wght@400;600;700&family=Lora:wght@400;500;600&family=Nunito+Sans:wght@400;700&family=Outfit:wght@200;300;400;600&family=Figtree:wght@400;600&family=Syne:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;600;700&family=Libre+Baskerville:wght@400;700&family=Tektur:wght@500;600;700&family=Rubik:wght@400;500;700&family=Hind:wght@400;500;600;700&family=Poiret+One&family=Anton&family=Oswald:wght@300;400;500;600&family=Great+Vibes&family=Fraunces:ital,wght@0,400;0,600;1,400&display=swap",
      },

    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    installToastA11y();
    // Admin-authored templates + background overrides join the pack catalog.
    void import("@/lib/template-loader").then((m) => m.loadTemplateRegistry());
  }, []);


  return (
    <QueryClientProvider client={queryClient}>
      {/* AI skin backdrops load once and are shared by every slide surface
          (editor, present, share, agent). Absent entries fall back to the
          CSS-composed scene, so this never blocks rendering. */}
      <SkinBackdropLibrary>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
      </SkinBackdropLibrary>
      <Toaster />
      <ToastAssertiveLiveRegion />
      {/* Debugging Workflow recorder — renders nothing unless explicitly enabled. */}
      <UxDebugDock />
    </QueryClientProvider>
  );
}
