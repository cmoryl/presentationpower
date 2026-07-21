# Presentation Power System

**AI‑native sales deck platform for TransPerfect — governed by real brand guidelines, editable in natural language, and round‑trippable to PowerPoint.**

Judges: this isn't a slide *template gallery* with an AI wrapper. It's a full deck runtime: a conversational Copilot that mutates slides in place via Claude tool‑use, a faithful `.pptx` import/export pipeline with native chart round‑trip, and eight sub‑brand modes governed by a real BrandHub knowledge base with an automated brand‑compliance reviewer.

---

## 🔗 Live Demo

- **App:** https://presentationpower.lovable.app
- **Seeded share link (no login):** https://presentationpower.lovable.app/share/demo-audit-share-token
- **Seeded demo deck:** *Acme Global · Localization Partnership* — 8 slides, all systems wired.

---

## ⏱ 3–5 Minute Demo Script

1. **Command Center** → open `/` signed in. KPIs, recent decks, sparklines.
2. **Generate a brief** → `/brief/new`. Pick a division (e.g. *GlobalLink*), a prospect, one meeting objective. Hit **Generate deck**. Narrative Strategist plans the section order; RAG synthesis pulls division facts from the knowledge base.
3. **Deck editor** → land on the new deck. Show the **Live Edit** toggle above the preview — click any outlined text on the slide, type, `Enter` to commit.
4. **Copilot** → open the drawer. Say *"add a 3‑column stat slide showing customer wins"*. Watch Claude call `insert_slide` with a chosen variant + content and it appears on the strip.
5. **Brand Reviewer** → run it on the deck. Get a scored report (palette, logo placement, footer safe‑zone, division fit) grounded in that division's BrandHub guide.
6. **Present** → hit Present. Speaker view, keyboard nav, timer.
7. **Export PPTX** → real `.pptx`. Charts export as **native editable PowerPoint charts** (not screenshots). Backdrops, logos, footers all preserved.
8. **Share** → generate a share token, drop the link. Public viewer works signed‑out.

---

## 🎯 Real Differentiators

**Conversational Copilot — Claude tool‑use, not chat‑with‑docs.**
The drawer wires Anthropic Claude Sonnet to real deck mutations: `insert_slide`, `update_slide_content`, `reorder_slides`, `swap_variant`, `apply_layout`. The model doesn't describe changes — it makes them, and you see the strip update.

**Faithful PPTX round‑trip.**
`src/lib/pptx-import.functions.ts` parses master + layout inheritance, z‑order, and shape geometry into a `FaithfulSlideCanvas` renderer. `src/lib/pptx-export.ts` (≈3.8k LOC) contains bespoke renderers for **59 variants** and emits **native pptxgenjs charts** for the 8 chart variants. Import a real client deck, edit it, re‑export — layouts survive.

**Multi‑division brand governance.**
Eight modes (Corporate, GlobalLink, Life Sciences, Trial Interactive, Legal Tech, Media Tech, Agencies, Portfolio Tech), each with:
- A `BrandGuide` record + 355 mapped BrandHub insights in a vector‑search‑enabled `knowledge_entries` table.
- Division‑scoped RAG retrieval (hybrid dense + tag filter via `match_brand_chunks`).
- **Brand Reviewer agent** that scores decks against the guide with cited chunks — not vibes.

**Deterministic backdrop assignment + A/B Palette Lab.**
`variantBackdrop.ts` maps `(variant, slide‑index) → backdrop` deterministically so a deck's visual rhythm survives regeneration. Section 05 · Palette Lab proposes A/B color variants ranked against the current brand mode.

**LogoHub.**
Client logo repository + modular client‑logo layouts (Strip, Marquee, Featured, Categorized, Mosaic). Logos are always the top visual layer with collision‑aware placement.

**Icon Studio.**
27 lazy‑loaded icon packs (~110k icons) served from CDN, not shipped in the bundle. Semantic asset suggestions via Claude embeddings.

**GlobalLink translation.**
Any deck → any locale. Translations cached per slide + language in `slide_translations`; the share viewer offers a locale switcher when translations exist.

---

## 🧱 Stack

- **Framework:** TanStack Start (Router v1, React 19, Vite 7) on Cloudflare Workers
- **Backend:** Lovable Cloud (Supabase — Postgres + Auth + Storage + `pgvector`)
- **AI:** Anthropic Claude Sonnet 4.5 (Copilot, Strategist, Brand Reviewer, Oracle, Deep RAG)
- **PPTX:** `pptxgenjs` (export) + `jszip` + `fast-xml-parser` (import)
- **UI:** Radix + Tailwind v4, shadcn primitives, Geist typography
- **Charts:** Recharts (in‑app) → native PPTX charts (export)
- **State:** Zustand deck store with per‑slide diffing
- **Validation:** Zod on every server function and route handler

---

## ⚙ Setup

Local runs work out of the box against the seeded database. To enable AI features (Copilot, Strategist, Brand Reviewer, Oracle, semantic assets) add one secret:

> **Project Settings → Secrets → `ANTHROPIC_API_KEY`**

Without the key, AI panels render an inline "⚙ Setup required" state — nothing crashes, and non‑AI flows (brief → deck, PPTX import/export, share, present, translate) work unchanged.

Admin surfaces (`/admin/*`) are gated on the `admin` role in `user_roles`. Accounts on `@transperfect.com` are auto‑granted via a database trigger; other users are `Forbidden`.

---

## 🗂 Where to Look

| What | Where |
|---|---|
| Deck editor + Live Edit | `src/routes/decks.$deckId.index.tsx`, `src/components/slide/LiveEditOverlay.tsx` |
| Copilot (Claude tool‑use) | `src/lib/ai-copilot.functions.ts`, `src/components/CopilotPanel.tsx` |
| Brand Reviewer | `src/lib/ai-review.functions.ts`, `src/components/BrandReviewPanel.tsx` |
| PPTX import | `src/lib/pptx-import.functions.ts` (XXE‑hardened, zip‑bomb capped) |
| PPTX export (59 variants + native charts) | `src/lib/pptx-export.ts` |
| Brand modes + guides | `src/lib/brand-modes.ts`, `src/lib/brand-guides.ts` |
| RAG | `src/lib/ai-rag.functions.ts`, `match_brand_chunks` RPC |
| Share viewer | `src/routes/share.$token.tsx`, `get_shared_deck` RPC |

Built for a hackathon. Shipped like a product.
