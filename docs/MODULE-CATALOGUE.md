# Master modules: maintenance and release contract

## One catalogue, surface-specific renderers

`/admin/modules-hub` projects the authoritative presentation taxonomy, team compositions, print sections, derived social adaptations and saved print page templates into one searchable manifest. It does not duplicate those registries or replace their rendering engines.

The manifest records identity, classification, family, supported surfaces, lifecycle, owner, source, editable/locked fields, declared capacity and allowed layouts, export paths, dependencies, renderer authority, release rules, modification information and recorded usage. Duplicate-name filtering is a review aid, not permission to merge permanent IDs.

## Maintenance workflow

- System presentation variants: maintain metadata in the master editor; renderer implementation is code-owned and release-tested. Exact registrations precede family predicates. Every shipped taxonomy variant has a registry owner, including blank canvas. Unknown variants show an explicit unsupported-renderer alert.
- Team modules: author, import compositions and export editable slides through Module Studio. Catalogue entries open the exact saved composition. Submission and all approval decisions use `/approvals`; content changes invalidate prior approval.
- Print sections: the print master studio edits the existing factory override. Newly inserted sections inherit it; already saved pieces preserve their copies. Export manifests describe the contract; native content/PPTX export remains in the source editor.
- Social adaptations: derive from print masters, including content, name, density and visibility. New-choice pickers exclude retired masters; already referenced layouts remain renderable. Format-specific fit and export QA are still required.
- Page templates: maintain saved page arrangements in the master editor. Shared publication remains admin-controlled.

## Recorded usage and retirement

Paginated authenticated reads inspect saved decks/slides, print assets and templates, kits, cross-format surfaces and event signs/templates. Only explicit source fields and section-kind/variant pairs count. Counts deduplicate a repeated module within one saved piece. Starter-template dependencies are also displayed.

These are **recorded references**, not an exhaustive forensic audit. Older team-module insertions may lack source identity; new insertions now record it. Event and social content without explicit references cannot be inferred from its wording. Code references and external downloaded files are outside this index. “No recorded references” never means “unused everywhere.”

If a source fails, the catalogue identifies it and disables retirement. Referenced modules require acknowledgment of impact. Retirement removes future selection, not existing saved content; custom-module deletion now archives the stable identity. The database's existing permissions remain the security boundary for edits.

## History and restoration

`module_catalogue_versions` captures changes to overrides, custom modules and saved page templates. A pre-existing record gains a baseline on its first change; history before installation is not invented. Catalogue reads include the newest 1,000 history headers; a detail shows the newest 100 changes for its selected record. Source-controlled renderer versions remain separate.

Admin-only restoration compares the expected latest revision, locks the live source row and applies selected content fields. It does not restore identities/owners or override visibility. Team restorations become drafts requiring new review; template restorations become private. A reset override must first exist again before its historical content can be restored. Permanent history is not pruned by this feature.

## Verification

- Full test suite: 372 files, 2,570 tests passed after the blank-canvas ownership regression was corrected.
- Authenticated browser checks: 293 live catalogue records, search/type filters, 213/213 database taxonomy renderer registrations, print preview, manifest/catalogue downloads, master save, prior-version restore, and original content read-back.
- The temporary master content was reset to shipped defaults; the intentional history entries remain.
- New database structures and the repaired history identity function were verified in the live database.
- Historical lineage completeness, Adobe/Office opening of exported files and visual parity across every module were not established by this change.