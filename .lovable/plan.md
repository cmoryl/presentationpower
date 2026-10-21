# NEXT designer asset system

Goal: an outside designer gets one share link and one structured, versioned pack. They can build new NEXT pieces from it without asking us for files, and finished work comes back through Approvals.

## What already exists (to build on, not replace)
- The master kit ZIP (logos as SVG, colours, gradients, sizes, Geist fonts, supplied sign masters, rules PDF, README).
- A partner share link for the NEXT brand kit (token-gated, no sign-in).
- New this week: EPS and transparent PNG for every lockup, and CMYK listed for every gradient stop.
- A Dropbox link for the original master files.

## What we add

1. **One folder structure, same everywhere.** The ZIP, the share page and the guide all use the same layout:
```text
NEXT-2026-Designer-Pack-v1.1/
  00-START-HERE.pdf        rules on 2 pages: do / don't, who approves
  01-logos/<division>/     SVG · EPS · PNG (transparent), colour/white/reverse
  02-marks/                NEXT 26 wordmark and lines
  03-colour/               palette (HEX, RGB, CMYK with "approved" / "proof first"), ASE swatches for Adobe, Canva values
  04-gradients/            every ground: stops, CMYK, ready-made SVG/EPS swatch files
  05-icons/                event set and each track set (SVG · PNG)
  06-templates/            sign, social, slide and print masters as supplied (AI/PDF/PPTX)
  07-type/                 Geist + licence
  08-sizes/                sign and digital sizes
  09-photography/          approved event imagery (if cleared for outside use)
  manifest.json            every file, version, checksum
```
2. **One file-naming rule:** `next26_<division>_<asset>_<variant>_<format>`, for example `next26_finance_stacked_white.eps`, so files sort and search cleanly in any tool.
3. **Versioning.** Every pack has a version number and change notes. The share page shows "you have v1.1, latest is v1.2", so outside designers never work from stale files.
4. **Adobe-ready swatches.** Generate `.ase` swatch files (RGB, plus CMYK where an approved build exists) so Illustrator/InDesign users load the palette in one click. Unapproved CMYK stays labelled "proof first".
5. **Partner share page upgrade.** Downloads are grouped by the folders above, with a "Download everything" button and single-file buttons, and links expire.
6. **Hand-back loop.** Add an "Upload your design for review" box on the share page. Files go to a private store, then to the Brand tab on Approvals with the designer's name and the pack version they used. Approved work can become a new template in the kit.
7. **Send live files to a vendor.** From any template, sign or division page, a team member picks the supplied live files (AI, PDF, PPTX, EPS), plus logos, fonts and colour sheets if needed, and clicks "Send to vendor". That creates a vendor pack with:
   - the original files, byte-for-byte as supplied, never re-exported
   - a one-page brief: job name, sizes, colour notes (CMYK approved or proof-first), deadline and contact
   - an expiring link, 14 days by default and revocable, with no sign-in for the vendor
   - a log of who sent what to which vendor and when, with download counts
   The vendor can open, edit and output the files in their own tools, outside the system. Their finished file can come back through step 6.
8. **Guardrails stay on.** No RGB-to-CMYK conversion that isn't flagged, no lockup redraws, and the "proof, not master" label on raster files.

## Questions to settle during the build
- Should photography go to outside designers, or stay internal?
- Should the Dropbox masters move into the pack, or stay linked?

## Technical details
- Extend `buildNextBrandKitZip` with the new folder layout, EPS/PNG logos, icon sets, ASE writer (small binary encoder, no new deps) and `manifest.json` (SHA-256 per file).
- Pre-render gradient swatch SVG/EPS into `public/next-2026/gradients/` (same rsvg pipeline as the logos).
- Bump `BRAND_KIT_VERSION`; add a `CHANGELOG` constant shown on the share page.
- Hand-back: a new `partner_submissions` table (create, GRANT, RLS, policies), a private bucket, and a public upload server route that checks the share token, file type and size. Submissions show on `/approvals` Brand tab; decisions are reviewer-only by trigger.
- Tests: naming rule, manifest completeness (every logo has SVG/EPS/PNG), a token-expiry check on the upload route.
