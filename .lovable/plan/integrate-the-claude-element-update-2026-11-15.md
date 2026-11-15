# Integrate the Claude Element update

## What the attachment contains
The archive contains a self-contained Element build with bundled editing logic, template content, project/review screens, layout controls, agent tools and export options. It also includes 378 client-logo files, 121 library images and seven navigation sprites.

It is not a replacement source repository: the application is bundled into one HTML file, with no package manifest, database schema or separate source modules. Approximately 698 referenced library-image paths are not present in the archive; some may be generated or alternate references and need classification.

## Integration approach
1. **Map the update:** inventory screens, module families, variations, per-size editing, projects, review/version behavior, agent actions and exports. Compare each against current Element; record additions, replacements and conflicts.
2. **Integrate the template system:** port supplied additions into the current module, print and cross-format registries rather than mounting a second independent application. Preserve supplied layout and artwork wherever compatible with the approved design system.
3. **Update build areas:** carry over the improved library, project and editing interactions using existing navigation, sign-in, permissions and saved-work authorities. Preserve existing events, guides, signage and downloads.
4. **Connect editing and delivery:** adapt source saves, review actions, versioning and agent controls to the existing Cloud and AI services. Keep current saved projects intact; embedded example claims remain examples until sourced and approved.
5. **Bring in artwork:** compare supplied assets with existing files, import missing originals through the appropriate private/public asset flow, and retain the exact logos. Report missing-image dependencies instead of inventing replacements.
6. **Verify and hand off:** check representative create/edit/save/reopen/review/export flows, desktop/phone layouts and existing event flows. Report unfinished capabilities explicitly; publish only after review.

## Safeguards
- Do not overwrite the current app with the bundled HTML or replace current accounts/data.
- Keep the existing framework, approved corporate style, role rules and brand authorities.
- Preserve production QA and outlined print-master requirements. The source’s live-text print and automatic colour-conversion behavior must not bypass existing restrictions.
- No secret values, source-platform runtime settings or repository metadata are imported.
- Missing source files or image dependencies remain tracked, not silently replaced.

## Technical details
Extract and inspect in temporary storage. Port code into React 19/TanStack Start components and current registries with semantic design tokens. Keep the capability ledger current, add concrete regression tests for changed rules, and use the existing governed export and learning systems.

## Expected result
One updated Element application incorporating the supplied modular-template and build-area improvements, without a parallel studio or loss of existing work.