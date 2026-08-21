import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
// Local replacement for the generated `attachSupabaseAuth`: refreshes expired
// sessions and retries once on 401 so users never see a raw
// "No authorization header provided" error.
import { attachAuthWithRefresh } from "@/lib/auth-fn-middleware";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachAuthWithRefresh],
  requestMiddleware: [errorMiddleware],
}));
