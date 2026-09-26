# Merge the Knowledge pages and make both approval queues work

## What I found

**Knowledge:** the admin menu lists 7 Knowledge items that overlap: Knowledge hub (just a page of links), Browse entries, Ask Oracle, Oracle KB, KB manager, Module approvals and Brand approval queue. There's also a separate Oracle page at /knowledge/oracle.

**Module approvals (/admin/approvals) is empty, and nothing can reach it.**
- It reads from a modules table that has 0 rows. No screen in the app ever adds a module to it.
- Its "submit for review" action exists, but no button calls it.
- People's real modules live in two other places: 11 saved modules, and Module Studio's custom modules. Custom modules go straight from draft to published with nobody reviewing them.
- The queue also lists drafts that nobody submitted, and the reviewer can't act on those.

**Brand approval queue (/approvals) mostly works:** it has 1 pending, 3 sent back and 1 approved, all decks. Three problems:
- **Security gap:** the database lets a submitter edit their own request. That includes setting it to "approved", which skips the reviewer. The app's buttons prevent this, but the database itself doesn't.
- Submissions only come from deck export and the Atlas deck panel. Print, social, event and kit items can be listed in the queue, but no screen submits them.
- Module Studio has no way to submit anything.

## What I'll build

1. **One Knowledge page** at /admin/knowledge-hub with tabs: Entries, Ask Oracle, Oracle KB, Sources (today's KB manager). Old addresses still open the matching tab. The menu's Knowledge group shrinks to "Knowledge" and "Approvals".
2. **One Approvals page** at /approvals with two tabs:
   - **Brand & compliance:** the current queue.
   - **Modules:** the module review, rebuilt on Module Studio's custom modules so it shows real submissions.
   /admin/approvals opens the Modules tab.
3. **Module Studio gets "Submit for review".** Publishing becomes: draft → waiting for review → published, or sent back with notes. The rules match the brand queue: admins and brand reviewers decide, nobody approves their own work, and every step goes in the audit log. Admins keep a "publish now" override, which is logged.
4. **Close the self-approval gap.** A database rule will let submitters change only the title, summary and checks on their own request, and resubmit it as pending. Only reviewers can set "approved" or "sent back".
5. **Wire up submissions for print pieces and campaign kits:** add the existing "Request approval" panel to the print-piece export screen and the kit export screen, using subject types that already exist.
6. The old empty module list is retired. Its table stays in place so nothing is lost.

## Technical details

- Migration, part 1: add `review_status` (`draft|pending|changes_requested|approved`), `submitted_at`, `reviewer_id`, `review_notes` and `reviewed_at` to `custom_modules`. Existing `published` rows become `approved`. A validation trigger stops non-reviewers from setting `approved` or `changes_requested`, and stops anyone from reviewing their own module.
- Migration, part 2: a BEFORE UPDATE trigger on `approval_requests` that checks `has_role(admin|brand_reviewer)`. Otherwise only `title/summary/checks/subject_path/priority` can change, and `status` can only become `pending`.
- `modules.functions.ts` queue functions are repointed at `custom_modules`. `custom-modules.functions.ts` gets `submitModuleForReview`, and the `published` filter becomes `review_status='approved'`.
- The Knowledge tabs reuse the existing page components, pulled out of the route files. Old routes use `beforeLoad` redirects with a `tab` search param. The menu is updated in `src/lib/admin-nav.ts` only.
- Verification: tsgo, vitest, then an end-to-end walk in the browser: submit from Module Studio, see it in the queue, approve it, and confirm it shows in the gallery. Then submit a deck, try to self-approve it through the database (it should be refused), and have a reviewer approve it.

## Left out
- Knowledge entry approvals (the hub describes these, but no such queue exists). I'll mention it rather than build one.
