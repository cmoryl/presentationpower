# San Francisco kiosks, rebuilt from the live London files

## What the zip contains (checked)
- 14 partner booths, each with a **live** `.ai` file and an outlined copy.
- The live files have real, editable text. For example, Media: "CREATE, DISTRIBUTE & MANAGE AUDIO VISUAL MEDIA". Legal: "THE GLOBAL LEADER IN LEGAL TECHNOLOGY & SUPPORT". Veeva: "10 Certified Vault Integrations".
- The fonts are embedded: Geist, plus Poppins in some files.
- Each file has two layers, **Art** and **Cut**. Most artwork is vector, with no photos embedded.
- Two partners have gaps:
  - **Sterling:** the live file has real text only for its web address.
  - **GL Live Conference:** has two live files, and one has no real text.

## What gets built
1. **Pull every piece out of each live file:** each text line (words, font, size, colour, position), each logo, icon, QR code and graphic group, and the background. Every piece is tagged with the layer it came from.
2. **A kiosk layout for each partner,** built from those pieces into the 45 × 96 in front and the two 4 × 96 in side strips:
   - Every piece keeps its reading order and its position relative to the others.
   - Nothing goes into the TV area.
   - Text is reflowed to the narrower width, never squashed.
3. **Full editing on the San Francisco page.** "Edit & download" opens a layer list for the kiosk. You can:
   - retype any headline or line of text
   - move, resize, hide or show any logo, icon, QR code or graphic
   - change the background
   - undo, and reset to the London version
   
   Edits are saved to that partner's kiosk.
4. **Downloads that stay editable:**
   - **Illustrator and PDF:** with live text, named layers (Background, Graphics, Logos, Text, QR, Cut) and correct bleed.
   - **PNG proof.**
   - **Press copy:** with the text outlined, as the print rules require. It's generated alongside the live version, not instead of it.
   
   Files stay marked as drafts until the San Francisco revision is published.
5. **Replace the earlier flattened drafts** with these rebuilt kiosks. Trial Interactive keeps its current version.

## Honest limits
- Poppins text stays in Poppins, as supplied. It's not changed to Geist.
- Sterling's words are mostly shapes, so I'd need its copy to make its text editable. Until then, its artwork moves as whole blocks.
- For GL Live Conference, I'll use the file that has real text.
- I'll check every kiosk against its London final on a comparison sheet. They'll still need a check in Illustrator before going to print.

## Technical details
- An extraction script, run once, reads the content of each live file: text runs with their font, size, colour and position, the vector groups, and the layer tags. It saves one layout record per booth to the backend, alongside the stored vector graphic pieces. Pieces that would be too large to keep in code are stored as separate files.
- A re-lay step turns each booth's London layout into the kiosk shape. It uses the kiosk measurements already stored in the app for size, bleed and the TV area, and keeps pieces grouped the way they were in London.
- The kiosk editor is a layer panel on top of the existing panel editor. Edits save to a saved-changes table for each kiosk, with the usual access protections on it.
- The Illustrator and PDF exporter writes live text using the embedded fonts, plus named layers. The press copy goes through the existing text-outlining step and quality check.
- Tests cover: every booth has a layout, nothing overlaps the TV area, nothing crosses the trim edge, and exports contain live text and the named layers.
