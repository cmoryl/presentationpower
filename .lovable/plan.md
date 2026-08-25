# Demo fast-path: instant "live" agent build for tomorrow's 3-minute demo

## Goal

Typing the trigger prompt **"Create a 6-slide GlobalLink Q3 business review with stats and a case study"** into the Presentation agent produces a realistic, visibly "working" build — staged status updates and streamed-feeling progress — but finishes in ~15 seconds instead of a full AI generation, landing on a pre-authored, QA-clean deck that you can open in the editor immediately, export to PPTX, and then move on to Print. Everything else in the agent behaves exactly as today.

## What gets built

### 1. Pre-authored deck snapshot — `src/lib/agent/demo-fast-build.ts` (new)
- `GLOBALLINK_Q3_QBR_DECK`: a curated 6-slide `DeckSnapshot` in the same style as the existing `JUDGING_DEMO_DECK`:
  - Slide 1 (dark): cover — GlobalLink Q3 Business Review.
  - Slide 2 (light): agenda / quarter highlights.
  - Slide 3 (light): KPI stats band (the audited numbers/stats modules).
  - Slide 4 (light): chart module (revenue / volume trend).
  - Slide 5 (light): client case study (the case-study modules already fixed for PPTX fidelity).
  - Slide 6 (dark): close / next steps.
- Enterprise brand system only (`bm-enterprise`), mixed dark/light modes — matches the approved-brand rule.
- Copy authored to be warning-free: no missing-citation or placeholder content, character counts inside fit caps, so creation-time QA normalization returns zero blockers **and zero warnings**.
- Only modules that passed the 144-cell export audit are used, so the PPTX export is known-good.
- `isDemoFastBuildPrompt(text)`: forgiving matcher (case-insensitive, tolerant of minor wording) for the trigger phrase.
- `DEMO_BUILD_STEPS`: timed script of status lines ("Reading your brief…", "Drafting outline — 6 slides…", "Building slide 3 · KPI stats…", "Applying Enterprise brand…", "Running QA gates…", "Done") totalling ~12–18s.

### 2. Agent fast-path intercept — `src/components/agent/AgentChat.tsx` + `src/routes/agent.$threadId.tsx`
- In `submit()`, before calling `sendMessage`, check `isDemoFastBuildPrompt(value)`.
- If matched: skip the server round-trip and run a local simulated build:
  - Append the user message and a streaming assistant message to the chat, updating its text step-by-step on a timer so it reads like the normal live generation (same timeline/status UI the real stream uses).
  - On completion: `createDeckFromSnapshot(GLOBALLINK_Q3_QBR_DECK)`, link it to the thread via `setAgentThreadDeck`, persist the synthetic messages to the thread (so a reload still shows the conversation + deck), and fire `onDeckDetected` so the live preview panel shows the deck.
- If not matched: completely unchanged behavior.
- Add the trigger phrase as a quick-start chip ("GlobalLink Q3 QBR — demo") in the agent hero/starter briefs so it's one click, no typing risk on stage.

### 3. QA-clean guarantee for the export moment
- The deck opens with the QA panel already green: snapshot is authored clean and passes through the existing creation-time normalization.
- Verified before handoff with a Playwright run: trigger → build completes → editor QA panel shows 0 blockers / 0 warnings → PPTX export succeeds.

### 4. PowerPoint handoff
- After verification, export the finished deck to PPTX and hand you the file path (`/mnt/documents/GlobalLink-Q3-QBR-demo.pptx`) so you can keep it open in PowerPoint before the demo and switch over instantly. The in-app Export also stays one click away as a backup.

## Technical notes
- No changes to the normal AI generation path, server route `/api/agent-chat`, or other agents (print/social/events) — the intercept is scoped to the presentation agent's submit handler.
- Synthetic messages use the same `UIMessage` shape as real ones so `findDeckIdInMessages`, preview refresh, and thread persistence all work unmodified.
- Deck creation goes through the existing `createDeckFromSnapshot`, which already applies geometry healing + creation-time QA normalization without polluting undo history.

## Verification
1. Typecheck + build.
2. Playwright: open agent → click the chip / type the trigger → confirm staged build completes in under ~20s, preview shows the deck, navigate to editor, QA panel reads 0 blockers / 0 warnings.
3. Export the deck to PPTX from the editor and confirm the file opens (LibreOffice render spot-check of the 6 slides).
4. Save the PPTX to `/mnt/documents` for your pre-opened PowerPoint window.
