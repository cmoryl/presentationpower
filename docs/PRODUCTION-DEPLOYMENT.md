# TransPerfect Element — Production Deployment Plan

## 1. Infrastructure architecture

```text
 Users / print vendors / BoothHUB / MCP clients
                │ HTTPS
                ▼
   Lovable hosting edge (Cloudflare Workers, global)
   ├─ SSR + static assets (TanStack Start, Vite build)
   ├─ createServerFn RPCs (auth via bearer middleware)
   ├─ /api/public/*  (venue, booths feeds — caller-verified, cached)
   └─ /mcp           (transperfect-modular-mcp, OAuth)
                │
   ┌────────────┼──────────────────────────┐
   ▼            ▼                          ▼
 Lovable Cloud  Lovable AI Gateway      Third parties
 Postgres+RLS   (LOVABLE_API_KEY)       Canva, brandhubcreator CDN,
 Auth, Storage                          BoothHUB webhooks
 (private buckets, signed URLs), pgvector
```

Key facts and risks
- Compute is stateless edge Workers: scales horizontally automatically; no servers to size. Constraints: workerd runtime (no Node-only libs), CPU/time per request — long jobs (deck generation) must stay retry-safe via `deck_jobs`.
- One backend instance serves preview and published app. **Biggest production risk**: schema migrations and data edits made while building hit production immediately. Mitigation in §5.
- Frontend deploys are atomic on Publish; previous version stays live until the new one is ready, so frontend deploys are zero-downtime.

## 2. Environments

| Env | Frontend | Backend | Purpose |
|---|---|---|---|
| Preview | id-preview URL | shared Cloud | build/QA |
| Draft branches | draft preview | isolated draft backend | risky schema work |
| Production | transperfectelement.lovable.app | shared Cloud | users |

Rule: any destructive or multi-step migration is developed on a draft (isolated backend) first, then accepted.

## 3. Deployment workflow

1. Change built in preview (or a draft for schema-heavy work).
2. CI (`.github/workflows/ci.yml`) must be green: typecheck, unit tests, production build.
3. Event/print/export gates: `export-verify.yml`, `e2e-smoke.yml`, signage `gateOnQa()` tests.
4. Migrations: additive only (expand → migrate → contract). Never drop/rename a column the live frontend still reads; remove it one release later.
5. Publish → Update. Smoke-check `/api/public/health`, `/`, `/events/next/london`, one export.
6. Rollback: frontend — restore previous version from history and republish (minutes). Backend — forward-fix migration (no automatic DB rollback; hence additive-only rule).

## 4. CI/CD pipeline

```text
PR / push main
  ├─ ci.yml          typecheck (tsgo) → vitest → vite build      [blocking]
  ├─ e2e-smoke.yml   Playwright smoke routes + all-format export [blocking]
  ├─ export-verify   matrix gate + sampled sweep (full nightly)  [blocking]
  ├─ pixel-diff      LibreOffice drift                           [advisory]
  └─ restyle-matrix  nightly sharded coverage                    [nightly]
Publish (manual, Lovable) → post-deploy smoke (health + key routes)
```

Branch protection on `main`: require `ci`, `e2e-smoke`, `export-verify / gate`.

## 5. Reliability & downtime reduction

- Health endpoint `/api/public/health` (no data, no secrets) for uptime monitors.
- Additive migrations + draft backends for schema work (§3).
- Idempotent jobs: `deck_jobs` keys; keep the same pattern for any new long task.
- Public feeds (`/api/public/venue|booths/*`) send cache headers so BoothHUB keeps working through short outages; consumers show an honest "unavailable" state.
- External dependencies (Canva, brandhubcreator CDN, AI Gateway) fail visibly with a user message, never silently fall back (house rule).
- Print/export QA gates stay mandatory; no bypass download paths.
- Backups: Cloud point-in-time backups; additionally export critical append-only tables (`london_signage_revisions`, `event_booths`, `booth_art`) before event-week releases.
- Change freeze: no publishes 48 h before a live event (e.g. NEXT London 24–25 Sept) except hotfixes.

## 6. Monitoring & logging

| Signal | Source | Alert |
|---|---|---|
| Uptime | external monitor on `/api/public/health` + `/` every 1 min | 2 consecutive fails |
| Server errors | Worker logs (`src/server.ts`, error middleware) | 5xx spike |
| AI usage/cost | `ai-usage-recorder.server` + Gateway logs | daily budget |
| DB health | Cloud db health / slow queries | p95 > 500 ms |
| Security | Cloud security scan before each publish | any new critical |
| Product | `learning_signals`, analytics | weekly review |

Log rules: structured `console.error` with route + request id; never log tokens, emails or signed URLs.

## 7. Scaling

- Edge compute auto-scales; keep handlers short and stateless.
- Database: indexes on hot filters (`deck_slides(deck_id, position)`, `knowledge_entries` division, vector halfvec indexes); watch slow-query report; resize compute in Cloud settings ahead of event traffic.
- Storage: serve signed URLs with long cache on immutable assets; large artwork via CDN asset pointers.
- AI: cache embeddings, batch generation, rate-limit per user.
- Heavy rendering (PPTX/PDF) stays in the browser or chunked server fns to respect Worker CPU limits.

## 8. Open items (need owner action)

- Fix the 32 pre-existing critical RLS findings (`client_logos`, `booth_art`, `pdf_extractions`) before wider rollout.
- Choose an external uptime/alerting tool and on-call contact.
- Enable GitHub branch protection.
