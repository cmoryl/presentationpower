# Whole-build review: Claude modules and Canva

## Main finding
The app has added Claude modules, but has **not yet replaced the old creation process**. A new library label or a Claude panel above an older library is not a complete takeover.

There are currently three working paths:

| Path | What it does now | What it does not prove |
| --- | --- | --- |
| Actual Claude workspace, `/element` | Runs the supplied build unchanged; projects, materials, saved versions, reviewer sign-offs and downloads connect to Lovable Cloud. | Full Cloud-backed 66-suite verification, two-client editing and presence remain unfinished. Its assistant is disconnected pending Chris's provider/budget decision. |
| Claude modules inside existing app pages | Shared module chooser creates a saved print asset and opens the existing source editor, including when started from Social or Slides. Supports the supplied fields and sizes. | It does not create a native deck slide or use the Claude project's save/review workflow. PowerPoint delivery here is a flattened proof. |
| Existing presentation/issued libraries | Original deck variants, native editors, issued documents and checked deck delivery still operate. | They are not using the Claude module authority merely because a Claude chooser appears above them. |

## Where the process is split

1. **Build entry:** `/build` still routes to several libraries and agents rather than one Claude project/material journey.
2. **Module library:** `/library` displays the Claude chooser, then the older variant catalogue and its separate selection-to-deck process. The current `look=skin-s06` belongs to that older catalogue; the Claude chooser does not inherit that setting.
3. **Print:** the latest update correctly makes Claude modules/templates the default shelf and preserves issued originals separately. Choosing a module still opens the existing source editor unless the user chooses Open Claude workspace.
4. **Social and Slides:** both mount the shared Claude chooser, but that chooser always creates an `ebrochure` print asset with a different size. These are not yet one cross-format Claude project flow.
5. **Saved work:** existing print assets/decks and Claude project materials have different storage and reopening paths. The 35 imported copies are already in Claude; originals remain elsewhere. This review does not reverify their database contents.
6. **Review:** the app's `/approvals` queues and Claude's project reviewer/hash sign-off are separate systems. A passed preview check is not either kind of approval.
7. **Delivery:** the existing deck export page can send its held checked PowerPoint file to Canva. The source editor offers PDF/flat PowerPoint proofs. The actual Claude build has its own PDF/multi-size/editable ZIP exports, but no Canva-send capability in its host bridge.
8. **Canva refresh:** the inspected watched-design registry covers selected Bowl calendar, billboard and sequence designs. It is not a general sync between all Claude modules and Canva. It preserves cleaned exported artwork, not editable module structure.

## Recommended working process

**Project → choose approved template or modules → edit one material → derive required sizes → save/version → reviewer sign-off → prepare deliverables → optional Canva handoff.**

- Use the **actual Claude workspace** as the intended authoring home, not a second imitation of it.
- Make Build, Modules, Templates and Continue work describe one coherent journey. Keep old native/issued work explicitly separate until its replacements are verified.
- Keep one material as the content source across sizes; do not call a Square-sized print record a native social/deck integration.
- Treat Canva as an explicit external design/handoff path. A Canva edit must not silently change an approved Element material, and a returned Canva picture must not be represented as editable modules.
- Preserve supplied files, artwork, source IDs, current roles, canonical sign-off hashes and approved/issued records.
- Keep Bowl, NEXT, event kits and social calendars on their existing production paths; reuse lessons from their Canva workflow without moving their live artwork into the corporate module system.

## Recommended implementation order

1. **Agree the source of truth for Canva-related work.** Element-first with optional Canva handoff is the recommended default; Canva-master work requires explicit return/review rules.
2. **Finish the real workspace verification gate.** Run the private Cloud-backed suites and two-client checks. Keep missing assistant/presence capabilities clearly separate.
3. **Consolidate creation and reopening.** Main authoring doors should reach the real Claude workflow; existing work should remain identifiable and recoverable. Do not overwrite or automatically migrate issued pieces.
4. **Validate representative materials.** Check text, photo crops, typography, required-size layouts, reopened saves and reviewer decisions. A no-crash sweep is not visual certification.
5. **Connect Canva only through a checked handoff.** Use a verified editable deliverable, attach its source material/version and return the Canva link. Returning artwork needs an explicit comparison and review before replacement.
6. **Retire old new-work entry points only after acceptance.** Retain old documents and their supported exports. Presence follows the gate; the assistant still waits for Chris's authorization.

## Evidence and limits

Read in this review: build-workspace and role-nav; `/build`; LibrarySubnav; `/library`'s Claude chooser and old deck creation; print/social/deck source-chooser integrations; SourceModuleLibrary; SourceBuildEditor; source checks/channel selection; SendToCanvaButton; existing deck export's Canva button and held-file references; Canva function wrappers and import handler; mounted host capability bridge; Canva watched-design registry and sync implementation references; approvals page queue structure; prior mounted-store verification report and current roadmap.

The latest diagnostic entries inspected are build OK. Earlier completed checks recorded 299 layouts × 14 sizes without render exceptions, and 2,855 passing tests with six existing failures. Those results are historical evidence, not new runs in this review.

This is a code-and-process review, not a full visual audit or a fresh live Canva account inventory. No Canva file was edited, no provider called, no data migrated, and no approval or permission changed. This review intentionally does not claim all screens, database policies or external workflows are certified.