# Roadmap — advanced stat & module design options

- [x] stat-layouts.ts: shapes halo/ribbon/echo/ticks/pie/area/waterfall, surfaces dotgrid/stripes, motions blur/drift, emphasis monumental
- [x] stat-arrangements.ts: magazine, ladder, duo-lead plans
- [x] primitives.tsx: surface styles, monumental scale, blur/drift reveal classes, halo/ribbon/echo/ticks/pie/area/waterfall branches
- [x] styles.css: tp-stat-blur / tp-stat-drift keyframes + reveal classes + reduced-motion guards
- [ ] cert-style.ts: add pointMarker, logoTone, accentRole, badgeScale, headerAlign
- [ ] CertStylePanel.tsx + certifications.tsx: wire the five new knobs
- [ ] Taxonomy: new stat variants MV-STAT-TICKER-STRIP, MV-STAT-SPARK-HERO, MV-STAT-GAUGE-STACK (+ module-copy, deck-store seeds, MODULE_STAT_LAYOUTS, stat.tsx cases)
- [ ] pptx-export.ts: honor new shapes/surfaces in emitSingleStatFigure + native stat emitters
- [ ] Tests: extend stat-layouts/arrangements/cert-style tests; new variants render/export
- [ ] Verify: tsgo, targeted vitest, full suite
