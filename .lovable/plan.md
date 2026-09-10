# Fix London sign preview synchronization

## What will change
- Remove the stale issued-artwork shortcut whenever a sign has saved or published visual overrides, so logo, text, QR, uploaded vector art, board sizing, and step-and-repeat changes always rebuild the card preview.
- Make every London card and enlarged preview use the same resolved live-panel state, including supplied-background signs and newly published live-file versions.
- Preserve the untouched issued artwork only when a sign truly has no visual edits.

## Validation
- Add regression coverage proving unchanged-size signs no longer discard logo/text/QR/uploaded-art edits.
- Test representative supplied and ordinary signs, including registration desk vinyl, registration pillar, and another venue panel.
- Verify edit → card refresh → close/reopen → page reload, then run the focused tests, full test suite, type check, and build check.

## Technical details
- Centralize the “can reuse issued SVG” decision around both panel geometry and visual options.
- Ensure preview cache keys include live-file identity and every editable visual layer.
- Keep supplied artwork as the base layer while generated edits render above it; do not modify exact supplied-master downloads.
