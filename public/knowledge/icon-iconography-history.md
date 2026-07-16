# Document parsed from: History_of_Icons_and_Iconography_for_Font-Creation_Backends.pdf

## Page 1

ChatGPT logo

## History of Icons and Iconography for Font-Creation Backends

### Executive summary

Icons are much older than software. They begin in prehistoric graphic marks and cave imagery, continue through early pictographic writing, become formalized in religious image systems, heraldry, emblem books, and print culture, and then reappear in modern public information systems, GUI metaphors, emoji, and design-system icon libraries. In art history, **iconography** is the identification of conventional subject matter and symbols in images, while **iconology** looks for deeper cultural meaning. For backend design, that distinction matters: an icon is never just geometry; it is geometry plus convention, provenance, and usage context. <sup>1</sup>

The strongest technical conclusion is that a modern icon backend should not treat icons as mere glyph slots in a font. The durable unit is a **semantic concept** that can have multiple visual variants, runtime packages, accessibility labels, locale-specific keywords, and legal constraints. That is how major contemporary systems operate in practice: Material Symbols ships conceptually stable icons with variable axes; Fluent separates system, product, and file icons and encodes direction metadata; SF Symbols ties symbols to typographic alignment, weights, scales, localization, and accessibility features; Octicons and Primer model SVG usage around accessibility semantics; OpenType itself now supports variable data and SVG glyph descriptions. <sup>2</sup>

For a font-creation tool backend, the best architecture is therefore **concept-first**, **vector-first**, **export-last**. Store a canonical vector source and semantic metadata once, then compile targets such as static icon fonts, variable icon fonts, SVG components, sprites, PNGs, or layered app-icon packages as derived artifacts. This matches the way SVG is defined as scalable vector graphics, the way OpenType structures font data, and the way contemporary libraries now offer both font and SVG delivery. <sup>3</sup>

Current platform trends are moving away from “one flat icon, one file” toward **variable**, **adaptive**, **localized**, **layered**, and **AI-assisted** icon production. Material Symbols exposes `FILL`, `wght`, `GRAD`, and `opsz`; Android adaptive icons change shape and theme with device and user context; SF Symbols 7 adds Draw animations, Variable Draw, gradients, and more than 6,900 symbols; Apple’s Icon Composer introduces multilayer Liquid Glass app-icon workflows; Adobe and Figma are normalizing AI-assisted generation of editable vector icons and interface drafts. The engineering implication is that backends now need fields for axes, layers, animation affordances, safe zones, mirroring, localized labels, and provenance of machine-generated assets. <sup>4</sup>

The recommendations that follow are direct consequences of that history:

*   Model **icon concept**, **visual variant**, **asset package**, **font mapping**, **creator/provenance**, **license**, and **accessibility/cultural notes** as distinct entities. <sup>5</sup>
*   Store **canonical vector geometry** and derive font or bitmap outputs from it, rather than editing icons primarily in font space. <sup>6</sup>

1

## Page 2

- Include **design axes**, **mirroring behavior**, **locale labels**, **contrast/accessibility rules**, and **legal metadata** as first-class fields. <sup>7</sup>
- Support both **historical/iconographic classification** and **runtime UI semantics** so the same backend can serve museum-like classification, design-system authoring, and deployment pipelines.
<sup>8</sup>

## Deep history of icons and iconography

In art-historical usage, iconography is not a synonym for “icons.” It is the systematic study of how images acquire conventional meanings. Panofsky’s famous three-part model distinguishes pre-iconographic description, iconographic interpretation, and iconology; this remains useful for software too, because it mirrors a practical stack of **form**, **convention**, and **context**. A backend that stores only paths and codepoints preserves form while discarding convention and context. <sup>9</sup>

Prehistoric visual signs already show that symbolic systems do not begin with writing. Archaeological work on Paleolithic sign corpora has emphasized the abundance of geometric signs in prehistoric contexts, while early cave art from Sulawesi and Bhimbetka shows that durable visual conventions emerged on multiple continents long before alphabetic literacy. By late Uruk in Mesopotamia, simple pictographs on clay tablets were already being used to manage goods and labor; these pictographs became precursors of cuneiform. Egyptian hieroglyphs, likewise, kept their pictorial character for millennia, depicting humans, animals, and objects while functioning as a learned script. <sup>10</sup>

Religious image systems are the first long-lived, highly standardized icon platforms. In Byzantium, icons were not merely devotional paintings but regulated vehicles of theological presence; the Iconoclastic controversies of the eighth and ninth centuries turned questions of image legitimacy into state and doctrinal conflicts. The restoration of images after iconoclasm helped stabilize Byzantine icon traditions that remained portable, repeatable, and legible across regions. In Western Christianity, saintly and Marian iconography depended on recognizable attributes, types, relic associations, and narrative conventions, even as late medieval and early Renaissance painting began to move from formalized Italo-Byzantine modes toward greater naturalism under artists such as Giotto. <sup>11</sup>

Islamic iconography is often mischaracterized as simply “aniconic.” The better account is more precise: calligraphy is a foundational visual art because revelation came in Arabic; geometric, vegetal, and figural ornament all coexist in Islamic art; and figural representation appears widely in secular and some manuscript contexts even if religious settings have their own constraints. In other words, Islamic visual culture does not lack iconography; it distributes it differently across script, ornament, architecture, objects, and figural imagery. <sup>12</sup>

Hindu and Buddhist traditions make the role of conventional attributes even clearer. The Met’s iconographic summaries emphasize that mudras, attributes, multiple arms or heads, mounts, and specific object combinations are the means by which worshippers identify deities and their manifestations. Vishnu’s conch, mace, discus, and lotus can distinguish forms by their arrangement; Shiva Nataraja condenses an entire theology of cosmic creation, preservation, and destruction into one canonical form; Buddhist imagery evolves from earlier aniconic strategies into anthropomorphic Buddha images whose mudras, wheels, lotuses, and bodily signs become widely codified. For backend design, this is a reminder that icons often need fields for **attribute clusters**, **gesture semantics**, and **named type variants**, not just a flat keyword list. <sup>13</sup>

2

## Page 3

Medieval heraldry moved iconography into civic, dynastic, and quasi-database territory. The College of Arms notes that heralds existed in medieval service to monarchs and nobility; the Met notes that heraldry continued to flourish even after knights lost much of their military centrality. Heraldic systems established one of the earliest large-scale visual identity regimes: bounded compositions, standardized tinctures and charges, inherited or granted rights, and strong provenance rules. Medieval bestiaries also circulated symbolic associations at scale, turning animals into reusable moral-emblematic signifiers across manuscripts and architecture. <sup>14</sup>

Print culture intensified symbol standardization. Dürer’s *Apocalypse* of 1498 is notable because the British Museum identifies it as the first book in Western art both published and illustrated by a major artist, and the Met credits Dürer with revolutionizing printmaking as an independent art form. Etching, according to the Met, spread rapidly because it was easier to exploit than engraving or woodcut. Renaissance emblem culture then fused image, motto, and moral meaning; the British Museum describes Andrea Alciati’s *Emblematum libellus*, first printed in 1536, as the source of powerful emblematic imagery, while Holbein’s 1516 title-page border for Johann Froben shows how printer’s marks already functioned as reproducible identity devices at the boundary of icon, brand, and ornament. <sup>15</sup>

Condensed timeline of icon history

<table>
    <tr>
        <th>Time Period</th>
        <th>Event / Development</th>
    </tr>
    <tr>
        <td>c. 45,500 BCE</td>
        <td>Early cave image traditions and prehistoric signs</td>
    </tr>
    <tr>
        <td>c. 3400–3000 BCE</td>
        <td>Uruk pictographs become precursors of cuneiform</td>
    </tr>
    <tr>
        <td>Ancient Egypt</td>
        <td>Hieroglyphic script remains pictorial form for millennia</td>
    </tr>
    <tr>
        <td>1st–3rd c. CE</td>
        <td>Buddhist anthropomorphic iconography and mudras become codified</td>
    </tr>
    <tr>
        <td>7th–9th c. CE</td>
        <td>Islamic calligraphy expand; Byzantine iconoclasm reshapes sacred imagery</td>
    </tr>
    <tr>
        <td>Middle Ages</td>
        <td>Heraldry stabilizes civic and dynastic visual identity</td>
    </tr>
    <tr>
        <td>1498</td>
        <td>Dürer’s Apocalypse transforms printed image culture</td>
    </tr>
    <tr>
        <td>1516</td>
        <td>Holbein/Froben printer’s mark exemplifies image-plus-motto</td>
    </tr>
    <tr>
        <td>1536</td>
        <td>Alciati’s emblem book canonizes pictorial statistics</td>
    </tr>
    <tr>
        <td>1920s</td>
        <td>Vienna Method/Isotype begins</td>
    </tr>
    <tr>
        <td>1964</td>
        <td>Olympic pictograms become a major design milestone</td>
    </tr>
    <tr>
        <td>1972</td>
        <td>Otl Aicher’s Munich pictograms become reproducible systems</td>
    </tr>
    <tr>
        <td>1980s</td>
        <td>Lisa and Macintosh popularize GUI icons</td>
    </tr>
    <tr>
        <td>1992</td>
        <td>Wingdings turns dingbats into mass pictographic text</td>
    </tr>
    <tr>
        <td>1999</td>
        <td>Kurita’s 176 emoji launch mobile iconography</td>
    </tr>
    <tr>
        <td>2022–2026</td>
        <td>Variable, adaptive, layered, and AI-assisted icon systems accelerate</td>
    </tr>
</table>
The timeline summarizes the transition from symbolic mark-making to standardized, reproducible, and finally programmable icon systems. The key historical pattern is that every durable icon system combines three things: a **controlled vocabulary** of forms, **rules for variation**, and an **institution that maintains legitimacy**—whether monastery, heraldic authority, museum, transit agency, standards body, Unicode committee, or platform design team. <sup>16</sup>

## Public symbols, print, and system design

Icon representing Isotype methodology

The crucial modern shift was from isolated emblematic images to **systems**. Isotype is the clearest early example. The Isotype archive describes the Vienna Method of Pictorial Statistics as first developed in Vienna in the 1920s; Otto Neurath founded it, Marie Reidemeister Neurath developed the crucial role of the “transformer,” and Gerd Arntz supplied a highly disciplined pictogram language. The archive also makes explicit one of the most important design principles for any icon backend: quantities should be shown by **repeating standard units**, not by scaling icons arbitrarily, because arbitrary scaling distorts comparison. <sup>17</sup>

Olympic wayfinding generalized this logic into international public signage. The IOC notes that Olympic pictograms were effectively first introduced in Tokyo in 1964, and that what started as directional signs developed into symbol systems rich with narrative and identity. Munich 1972 then became a milestone because Otl Aicher, as visual-design director, applied a rigorously coherent pictogram program across the Games. Modern transport graphics followed the same direction: Unimark’s work for the New York City Transit Authority systematized wayfinding and documentation, while Adrian Frutiger designed the original

3

## Page 4

Frutiger typeface for the wayfinding system of the Roissy Charles de Gaulle airport, explicitly tying legibility to public navigation. <sup>18</sup>

These developments matter for backend design because they convert icon design from isolated illustration into a maintainable family. The family has rules for naming, scaling, directional behavior, companion typography, and contextual deployment. That is why modern system documentation reads more like engineering documentation than art commentary. <sup>19</sup>

## Master creators and creations

The table below focuses on authors whose work shaped either enduring icon languages or the institutions and techniques by which icons became systematized. It does not imply that all major icon traditions are individually authored; many of the most important sacred and civic systems are collective and workshop-based.

<table>
  <thead>
    <tr>
      <th>Creator</th>
      <th>Signature creations</th>
      <th>Historical significance</th>
      <th>Sources</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><b>Otto Neurath</b></td>
      <td>Vienna Method / Isotype</td>
      <td>Founded pictorial statistics as a modern information system and established the principle that visual units should be standardized and repeatable.</td>
      <td><sup>17</sup></td>
    </tr>
<tr>
      <td><b>Marie Neurath</b></td>
      <td>Transformer method, Isotype continuation, educational books</td>
      <td>Turned statistical and educational content into legible picture-language structures; continued Isotype after Otto's death.</td>
      <td><sup>17</sup></td>
    </tr>
<tr>
      <td><b>Gerd Arntz</b></td>
      <td>Isotype pictograms</td>
      <td>Brought clarity, precision, and repeatable human/object forms to twentieth-century pictogram design.</td>
      <td><sup>17</sup></td>
    </tr>
<tr>
      <td><b>Otl Aicher</b></td>
      <td>Munich 1972 Olympic pictograms and visual system</td>
      <td>Established one of the most influential modern pictogram and event-identity systems.</td>
      <td><sup>20</sup></td>
    </tr>
<tr>
      <td><b>Adrian Frutiger</b></td>
      <td>Roissy/Charles de Gaulle wayfinding typeface later released as Frutiger</td>
      <td>Linked typographic legibility directly to modern signage and public navigation.</td>
      <td><sup>21</sup></td>
    </tr>
<tr>
      <td><b>Massimo Vignelli and Bob Noorda</b></td>
      <td>NYC Transit Graphics Standards Manual and subway map</td>
      <td>Made diagrammatic transit information into a paradigmatic modern wayfinding system.</td>
      <td><sup>22</sup></td>
    </tr>
<tr>
      <td><b>Hermann Zapf</b></td>
      <td>Zapf Dingbats</td>
      <td>Helped turn symbolic ornaments and practical signs into a typographic icon family.</td>
      <td><sup>23</sup></td>
    </tr>
<tr>
      <td><b>Kris Holmes and Charles Bigelow</b></td>
      <td>Wingdings</td>
      <td>Reframed symbolic fonts for personal computing and GUI-era desktop use.</td>
      <td><sup>24</sup></td>
    </tr>
  </tbody>
</table>

4

## Page 5

<table>
    <tr>
        <th>Creator</th>
        <th>Signature creations</th>
        <th>Historical significance</th>
        <th>Sources</th>
    </tr>
    <tr>
        <td>**Annette Wagner**</td>
        <td>Apple Lisa icons and fonts</td>
        <td>Helped bring WYSIWYG-era bitmap icon design into mass-produced personal computing.</td>
        <td>25</td>
    </tr>
    <tr>
        <td>**Susan Kare**</td>
        <td>Macintosh GUI icons such as scissors, trash, brush, hand cursor</td>
        <td>Translated software actions into memorable bitmap metaphors that still define interface iconography.</td>
        <td>26</td>
    </tr>
    <tr>
        <td>**Shigetaka Kurita**</td>
        <td>NTT DOCOMO's original 176 emoji</td>
        <td>Brought mobile pictographic text into mainstream communication via a 12×12 pixel system.</td>
        <td>27</td>
    </tr>
</table>
The line from Isotype to Olympic pictograms to transit manuals to software icons is not perfectly linear, but it is structurally consistent. In all of them, the winning move is the same: build a grammar of recurrence, not a gallery of one-offs. <sup>28</sup>

## Interface icons, emoji, and platform libraries

The interface age did not invent iconography; it compressed centuries of symbolic practice into a smaller, stricter screen grid. Xerox Alto and Star helped normalize the WIMP model, and by the early 1980s Apple's Lisa and Macintosh made onscreen icons a mass-market interaction model. The Computer History Museum explicitly frames GUI icons as a key part of making computing accessible beyond specialists. Annette Wagner's Lisa work and Susan Kare's Macintosh sketches show the shift from broad symbolic tradition to tiny, pixel-constrained metaphors for "cut," "trash," "paint," and "pointer." <sup>29</sup>

Typographic icon families bridged print and computing. Zapf Dingbats translated ornaments, practical marks, and symbols into a standardized font set, and Wingdings repackaged Lucida icon fonts into a harmonized family for PC-era interfaces. This mattered technically because symbol fonts made icons addressable as characters, not just images. It also mattered culturally because they habituated users to "reading" nonalphabetic glyph palettes from keyboards and character maps. <sup>30</sup>

Emoji then made pictographic writing social. MoMA records that NTT DOCOMO released Kurita's original 176 emoji in 1999 on a 12×12 pixel grid; Unicode's current charts show emoji as part of a standardized international infrastructure with names, dates, keywords, sources, and vendor renderings. That standardization solved interchange, but not interpretation: Unicode itself shows vendor differences, and academic work has repeatedly found platform and demographic variation in emoji meaning. For a backend, emoji are the clearest modern proof that **codepoint identity does not guarantee semantic identity**. <sup>31</sup>

Contemporary icon libraries are now less like "sets of drawings" and more like software products. Material evolved from classic Material Icons to Material Symbols, introduced in 2022 as a variable-font-based icon system. Fluent separates system icons from product-launch and file icons, publishes SVG packages and metadata, and explicitly documents naming, modifiers, themes, and localization. Apple's SF Symbols integrates thousands of symbols directly with the San Francisco typographic system and adds custom-symbol authoring, rendering modes, animation, gradients, and localized variants. GitHub's Octicons are described as "a scalable set of icons handcrafted by GitHub" and are deployed as accessible SVG in Primer.

5

## Page 6

Font Awesome remains significant because its documentation still exposes the now-classic tradeoff between icon fonts and SVG pipelines. <sup>32</sup>

## Comparison of major digital icon systems

<table>
  <thead>
    <tr>
      <th>System</th>
      <th>Current scope and packaging</th>
      <th>Variation model</th>
      <th>Accessibility and localization affordances</th>
      <th>License / distribution signal</th>
      <th>Backend implication</th>
      <th>Sources</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><b>Material Symbols</b></td>
      <td>Over 2,500 glyphs in a single font file; SVG and PNG downloads also available</td>
      <td>Four variable axes:<br/><mark>FILL</mark>,<br/><mark>wght</mark>,<br/><mark>GRAD</mark>,<br/><mark>opsz</mark></td>
      <td>Good for state changes and optical-size-aware rendering; easy web integration via font or self-hosting</td>
      <td>Apache 2.0; official repo and Google Fonts</td>
      <td>Treat icons as concepts with parameterized instances, not static files</td>
      <td><sup>33</sup></td>
    </tr>
<tr>
      <td><b>Fluent System Icons / Segoe Fluent Icons</b></td>
      <td>SVG package plus font usage; system/product/file collections</td>
      <td>Regular vs filled themes; monoline glyph logic; metadata includes direction behavior</td>
      <td>Localization guidance; metadata supports mirroring and singleton direction; explicit naming and modifier rules</td>
      <td>MIT for system icons</td>
      <td>Store directionality and modifier semantics explicitly in metadata</td>
      <td><sup>34</sup></td>
    </tr>
<tr>
      <td><b>SF Symbols 7</b></td>
      <td>Over 6,900 symbols aligned to San Francisco type</td>
      <td>Nine weights, three scales, Variable Draw, gradients, animation presets, custom annotations</td>
      <td>Localized variants across multiple scripts; accessibility called out in official docs; automatic text alignment</td>
      <td>Apple platform tooling and app</td>
      <td>Treat icon variants as typographic companions with scale, weight, locale, and animation metadata</td>
      <td><sup>35</sup></td>
    </tr>
  </tbody>
</table>

6

## Page 7

<table>
    <tr>
        <th>System</th>
        <th>Current scope and packaging</th>
        <th>Variation model</th>
        <th>Accessibility and localization affordances</th>
        <th>License / distribution signal</th>
        <th>Backend implication</th>
        <th>Sources</th>
    </tr>
    <tr>
        <td>**Octicons**</td>
        <td>SVG-first library for GitHub</td>
        <td>Size families and handcrafted SVGs</td>
        <td>Primer documents decorative vs contentful SVG markup, labels, and titles</td>
        <td>GitHub internal/ public system use</td>
        <td>Prefer SVG semantics with assistive-technology metadata rather than glyph-only deployment</td>
        <td>36</td>
    </tr>
    <tr>
        <td>**Font Awesome**</td>
        <td>Supports both Web Fonts + CSS and SVG + JS</td>
        <td>Style families, layering, masking, animation, kit subsetting</td>
        <td>Explicit comparison of webfonts and SVG; accessibility docs for web use</td>
        <td>Hybrid commercial/ open tooling ecosystem</td>
        <td>Backend should export multiple delivery targets from one source</td>
        <td>37</td>
    </tr>
    <tr>
        <td>**Unicode Emoji**</td>
        <td>Standardized characters and sequences with vendor charts and CLDR naming/ keywords</td>
        <td>Variation by vendor artwork and sequence composition, not just outline style</td>
        <td>CLDR names and keywords; vendor charts expose cross-platform render variation</td>
        <td>Unicode standard ecosystem</td>
        <td>Separate standardized identity from rendered appearance and locale annotations</td>
        <td>38</td>
    </tr>
</table>
The practical conclusion is blunt: a backend that assumes all icons are equivalent once they have a name and a path will fail as soon as it has to support variable styles, locale-specific labels, mirrored forms, animation-capable symbols, or emoji-like cross-platform rendering differences. <sup>39</sup>

## Technical principles for icon engineering

Modern icon systems still rely on traditional iconographic discipline: meaning has to be made stable through convention. Fluent explicitly says icons should represent recognizable concepts, objects, or actions; it also recommends literal naming by shape or object, not by abstract function, as in “shield” rather than “security.” That distinction is technically important because the same glyph can serve several functions in context. A good backend should therefore distinguish **what the icon depicts** from **what an interface uses it to do**. <sup>40</sup>

7

## Page 8

Geometry comes next. Material’s own design discussion reduces icon construction to a small set of recurring design metrics—keyline shapes, material grid, stroke weight, and corner treatment—and the official docs recommend a 2dp regular stroke as the baseline for icons. Material Symbols then extends this with explicit axes for fill, weight, grade, and optical size, including an optical-size range from 20dp to 48dp. Microsoft’s Windows iconography docs describe Segoe Fluent glyphs as monoline forms drawn through a single 1 epx stroke, while Apple’s SF Symbols ties symbols to nine weights and three scales so they align with text without manual correction. This is why backend schemas should store **grid size**, **stroke model**, **weight model**, **optical-size behavior**, and **alignment rules** rather than treating every SVG as incomparable geometry. <sup>41</sup>

Visual weight is not the same as path weight. Material’s `GRAD` axis exists because weight and grade change perceived thickness differently; SF Symbols’ Variable Draw and gradients show that state and emphasis are now increasingly encoded through animation and rendering rather than outline substitution alone; Fluent distinguishes Regular and Filled themes because large and small contexts need different reading behavior. The right backend abstraction is therefore not just “outlined vs filled” but a more general **emphasis model** with dimensions such as fill state, grade, weight, rendering mode, state overlay, and animation affordance. <sup>42</sup>

Scalability is partly a vector problem and partly a rasterization problem. W3C defines SVG as scalable across display resolutions, and OpenType allows glyph descriptions to be delivered as outlines, color bitmaps, or SVG documents. But pure vector scalability does not eliminate the need for small-size control. Microsoft’s TrueType documentation is very direct: hinting is essential for quality at small sizes on low-resolution devices, because it grid-fits outlines to the destination bitmap. OpenType also formalizes variable-font tables such as `fvar`, `gvar`, and `STAT`, allowing one resource to encode multiple design instances. In practical terms: if the backend is expected to output icon fonts, it should not stop at outline storage; it should preserve the information needed for hinting strategy, fallback bitmaps, and variable instances. <sup>43</sup>

Accessibility is not an afterthought. WCAG requires text alternatives for non-text content, meaningful controls need accessible names, and non-text contrast should meet a 3:1 threshold where visual information matters. WAI also distinguishes decorative images from informative and functional ones, while Primer gives concrete SVG patterns for decorative and contentful icons, including `aria-hidden`, `role="img"`, and `<title>`. This means a backend should store **accessible purpose labels**, **decorative/contentful role**, **state labels**, and **contrast expectations** as data, not as tribal knowledge held only in front-end code. <sup>44</sup>

Cultural variation is just as important. Fluent explicitly advises validating icon choices in context because some symbols have different cultural connotations. Unicode’s CLDR stores emoji short names and keywords; Unicode vendor charts make rendering differences visible; and empirical research shows that emoji meanings vary by platform, age, gender, and culture. This argues for backend support for **locale-specific labels**, **misinterpretation notes**, **mirroring rules**, **region flags**, and **confusable/sensitive-symbol warnings**. <sup>45</sup>

8

## Page 9

## Comparison of implementation techniques

<table>
  <thead>
    <tr>
      <th>Technique</th>
      <th>Best use</th>
      <th>Strengths</th>
      <th>Weaknesses</th>
      <th>Backend requirements</th>
      <th>Sources</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><b>Icon font</b></td>
      <td>Dense UI delivery, CSS pseudo-elements, typographic alignment</td>
      <td>Mature deployment model; Unicode/ligature addressing; easy theming via text color</td>
      <td>Raster quality can depend on hinting; harder per-icon semantics unless supplemented</td>
      <td>Codepoint/ligature mapping, hinting policy, font metrics, variation/export tables</td>
      <td>46</td>
    </tr>
<tr>
      <td><b>SVG component / sprite</b></td>
      <td>Web apps, accessible UI, precise per-icon control</td>
      <td>Resolution-independent; crisp vectors; easy subsetting; rich accessibility semantics</td>
      <td>Requires a stronger asset pipeline and markup discipline</td>
      <td>ViewBox/path normalization, labels, roles, titles, sprite/component IDs</td>
      <td>47</td>
    </tr>
<tr>
      <td><b>Variable icon font</b></td>
      <td>State-rich systems with consistent families</td>
      <td>Continuous weight/grade/fill/optical variation in one resource</td>
      <td>More metadata and rendering complexity</td>
      <td>Axes table, named instances, default instance, interpolation rules</td>
      <td>48</td>
    </tr>
<tr>
      <td><b>Layered app-icon package</b></td>
      <td>Platform launchers, spatial/3D icon treatments</td>
      <td>Supports adaptive masks, theming, depth, system lighting</td>
      <td>Strongly platform-specific; not a general-purpose UI icon replacement</td>
      <td>Layers, safe zones, foreground/background separation, appearance-mode previews</td>
      <td>49</td>
    </tr>
<tr>
      <td><b>Emoji / character sequence model</b></td>
      <td>Messaging, cross-platform text embedding</td>
      <td>Standardized identity across platforms; rich locale keywords</td>
      <td>Visual appearance differs by vendor; meaning may drift socially</td>
      <td>Unicode sequence data, CLDR annotations, vendor preview mapping, fallback strategy</td>
      <td>50</td>
    </tr>
  </tbody>
</table>

## Backend schema, rights, and current trends

Existing cultural-heritage and web standards already suggest the right separation of concerns. Iconclass is a subject-classification scheme used by museums and libraries, with concept URIs and rich cross-references.

9

## Page 10

Getty’s AAT is a structured vocabulary for visual-art terms. SKOS provides a common RDF model for publishing taxonomies, thesauri, and classification systems. Unicode CLDR adds a practical model for short names and keywords, especially for emoji. OpenType adds the packaging layer for glyph resources and variable-font metadata. Put differently: the standards world already treats **meaning**, **classification**, **labels**, and **rendering** as separate layers. Your backend should too. <sup>51</sup>

## Recommended ontology mapping

<table>
  <thead>
    <tr>
      <th>Backend concern</th>
      <th>Recommended standard alignment</th>
      <th>Why it helps</th>
      <th>Sources</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Hierarchical concepts and tags</td>
      <td><b>SKOS</b> concepts with pref/alt labels and broader/narrower links</td>
      <td>Gives a clean concept graph for categories, metaphor families, and aliases</td>
      <td>52</td>
    </tr>
<tr>
      <td>Art-historical or subject-classification depth</td>
      <td><b>Iconclass</b> concept URIs where relevant</td>
      <td>Useful for religious, narrative, heraldic, and museum-adjacent iconography</td>
      <td>53</td>
    </tr>
<tr>
      <td>Work-type/style/material vocabulary</td>
      <td><b>Getty AAT</b> terms</td>
      <td>Good for style facets, technique labels, and cross-collection interoperability</td>
      <td>54</td>
    </tr>
<tr>
      <td>Emoji-style names and keywords</td>
      <td><b>CLDR</b> annotations and short names</td>
      <td>Provides locale-sensitive discoverability and search keywords</td>
      <td>55</td>
    </tr>
<tr>
      <td>Font and variation packaging</td>
      <td><b>OpenType</b> tables such as `fvar`, `gvar`, `STAT`, plus codepoint/ligature mapping</td>
      <td>Makes icon-font export predictable and structured</td>
      <td>56</td>
    </tr>
<tr>
      <td>Vector geometry interchange</td>
      <td><b>SVG</b> source-of-truth assets</td>
      <td>Keeps a canonical geometry layer independent of font export</td>
      <td>57</td>
    </tr>
  </tbody>
</table>

## Recommended entity model

Entity relationship diagram showing ICON_SET containing ICON_GLYPH, which has relationships to ICON_VARIANT, CONCEPT, CREATOR, ACCESSIBILITY_NOTE, CULTURAL_NOTE, LICENSE_RECORD, PROVENANCE_RECORD, VECTOR_ASSET, and FONT_MAPPING

10

## Page 11

The schema above reflects the central recommendation of this report: the **glyph concept** should be persistent even when variants, exports, licenses, or labels change. That is how you avoid duplicating the same icon across SVG, font, PNG, app-icon, and localized metadata pipelines. The structure also leaves room for historically rich iconography when needed without forcing all icons to become museum records.

58

## Core fields for a backend

<table>
  <thead>
    <tr>
      <th>Entity</th>
      <th>Field</th>
      <th>Type</th>
      <th>Purpose</th>
      <th>Example</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>icon_set</code></td>
      <td><code>id</code></td>
      <td><code>string</code></td>
      <td>Stable identifier for the family/library</td>
      <td><code>material-symbols</code></td>
    </tr>
<tr>
      <td><code>icon_set</code></td>
      <td><code>name</code></td>
      <td><code>string</code></td>
      <td>Human-readable set name</td>
      <td><code>Material Symbols</code></td>
    </tr>
<tr>
      <td><code>icon_set</code></td>
      <td><code>version</code></td>
      <td><code>string</code></td>
      <td>Release or snapshot version</td>
      <td><code>2026.05</code></td>
    </tr>
<tr>
      <td><code>icon_set</code></td>
      <td><code>license_id</code></td>
      <td><code>string</code></td>
      <td>Distribution terms at set level</td>
      <td><code>Apache-2.0</code></td>
    </tr>
<tr>
      <td><code>icon_set</code></td>
      <td><code>source_ref</code></td>
      <td><code>string[]</code></td>
      <td>Canonical source documents/repos</td>
      <td><code>["google-fonts-guide","official-repo"]</code></td>
    </tr>
<tr>
      <td><code>icon_glyph</code></td>
      <td><code>id</code></td>
      <td><code>string</code></td>
      <td>Stable concept identifier</td>
      <td><code>send</code></td>
    </tr>
<tr>
      <td><code>icon_glyph</code></td>
      <td><code>canonical_name</code></td>
      <td><code>string</code></td>
      <td>Preferred internal name</td>
      <td><code>send</code></td>
    </tr>
<tr>
      <td><code>icon_glyph</code></td>
      <td><code>pref_label</code></td>
      <td><code>object&lt;locale,string&gt;</code></td>
      <td>User-facing label by locale</td>
      <td><code>{"en-US":"Send","ar":"إرسال"}</code></td>
    </tr>
<tr>
      <td><code>icon_glyph</code></td>
      <td><code>alt_labels</code></td>
      <td><code>object&lt;locale,string[]&gt;</code></td>
      <td>Synonyms for search and migration</td>
      <td><code>{"en-US":["paper plane","submit"]}</code></td>
    </tr>
<tr>
      <td><code>icon_glyph</code></td>
      <td><code>semantic_category</code></td>
      <td><code>enum</code></td>
      <td>Action/object/state/navigation/file/brand/etc.</td>
      <td><code>action</code></td>
    </tr>
<tr>
      <td><code>icon_glyph</code></td>
      <td><code>depicts</code></td>
      <td><code>string</code></td>
      <td>What the icon literally shows</td>
      <td><code>paper plane</code></td>
    </tr>
  </tbody>
</table>

11

## Page 12

<table>
  <thead>
    <tr>
      <th>Entity</th>
      <th>Field</th>
      <th>Type</th>
      <th>Purpose</th>
      <th>Example</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>icon_glyph</code></td>
      <td><code>functions</code></td>
      <td><code>string[]</code></td>
      <td>UI uses distinct from depiction</td>
      <td><code>["send message","share"]</code></td>
    </tr>
<tr>
      <td><code>icon_glyph</code></td>
      <td><code>concept_ids</code></td>
      <td><code>string[]</code></td>
      <td>Links into SKOS-like taxonomy</td>
      <td><code>["communication","message-transfer"]</code></td>
    </tr>
<tr>
      <td><code>icon_glyph</code></td>
      <td><code>directionality</code></td>
      <td><code>enum</code></td>
      <td>none, mirror, unique-ltr, unique-rtl</td>
      <td><code>mirror</code></td>
    </tr>
<tr>
      <td><code>icon_glyph</code></td>
      <td><code>cultural_notes</code></td>
      <td><code>string[]</code></td>
      <td>Notes on sensitivity or region-specific meaning</td>
      <td><code>["paper-plane metaphor not universal"]</code></td>
    </tr>
<tr>
      <td><code>icon_glyph</code></td>
      <td><code>accessibility_purpose</code></td>
      <td><code>enum</code></td>
      <td>decorative, informative, functional, status</td>
      <td><code>functional</code></td>
    </tr>
<tr>
      <td><code>icon_glyph</code></td>
      <td><code>deprecated</code></td>
      <td><code>boolean</code></td>
      <td>Lifecycle management</td>
      <td><code>false</code></td>
    </tr>
<tr>
      <td><code>icon_variant</code></td>
      <td><code>id</code></td>
      <td><code>string</code></td>
      <td>Stable variant identifier</td>
      <td><code>send.outlined.24</code></td>
    </tr>
<tr>
      <td><code>icon_variant</code></td>
      <td><code>glyph_id</code></td>
      <td><code>string</code></td>
      <td>Parent glyph concept</td>
      <td><code>send</code></td>
    </tr>
<tr>
      <td><code>icon_variant</code></td>
      <td><code>style_family</code></td>
      <td><code>enum</code></td>
      <td>outlined, filled, rounded, duotone, etc.</td>
      <td><code>outlined</code></td>
    </tr>
<tr>
      <td><code>icon_variant</code></td>
      <td><code>medium</code></td>
      <td><code>enum</code></td>
      <td>svg, font-outline, bitmap, layered-icon, emoji-sequence</td>
      <td><code>svg</code></td>
    </tr>
<tr>
      <td><code>icon_variant</code></td>
      <td><code>view_box</code></td>
      <td><code>number[4]</code></td>
      <td>Canonical vector bounds</td>
      <td><code>[0,0,24,24]</code></td>
    </tr>
<tr>
      <td><code>icon_variant</code></td>
      <td><code>grid_size</code></td>
      <td><code>number</code></td>
      <td>Authoring grid</td>
      <td><code>24</code></td>
    </tr>
  </tbody>
</table>

12

## Page 13

<table>
    <tr><th></th>
        <th>Entity</th>
        <th>Field</th>
        <th>Type</th>
        <th>Purpose</th>
        <th>Example</th>
    </tr>
    <tr>
        <td>`icon_variant`</td>
        <td>`safe_zone`</td>
        <td>`number` \</td>
        <td>`null`</td>
        <td>Inner protected area when relevant</td>
        <td>`20`</td>
    </tr>
    <tr>
        <td>`icon_variant`</td>
        <td>`stroke_model`</td>
        <td>`enum`</td>
        <td>`monoline`, `filled`, `mixed`</td>
        <td>`monoline`</td>
    <td></td></tr>
    <tr>
        <td>`icon_variant`</td>
        <td>`stroke_width`</td>
        <td>`number` \</td>
        <td>`object`</td>
        <td>Base stroke information</td>
        <td>`2`</td>
    </tr>
    <tr>
        <td>`icon_variant`</td>
        <td>`axes`</td>
        <td>`object`</td>
        <td>Variable parameters and ranges</td>
        <td>`{"wght":[100,700],"FILL":[0,1],"GRAD":[-25,200],"opsz":[20,48]}`</td>
    <td></td></tr>
    <tr>
        <td>`icon_variant`</td>
        <td>`layer_count`</td>
        <td>`integer`</td>
        <td>Needed for adaptive/spatial icons</td>
        <td>`1`</td>
    <td></td></tr>
    <tr>
        <td>`icon_variant`</td>
        <td>`animation_capabilities`</td>
        <td>`string[]`</td>
        <td>Supported animation semantics</td>
        <td>`["draw","replace"]`</td>
    <td></td></tr>
    <tr>
        <td>`vector_asset`</td>
        <td>`path_data`</td>
        <td>`string`</td>
        <td>Canonical SVG path or equivalent geometry</td>
        <td>`M...Z`</td>
    <td></td></tr>
    <tr>
        <td>`vector_asset`</td>
        <td>`checksum`</td>
        <td>`string`</td>
        <td>Change tracking</td>
        <td>`sha256:...`</td>
    <td></td></tr>
    <tr>
        <td>`font_mapping`</td>
        <td>`codepoint`</td>
        <td>`string` \</td>
        <td>`null`</td>
        <td>Unicode or PUA assignment</td>
        <td>`E163`</td>
    </tr>
    <tr>
        <td>`font_mapping`</td>
        <td>`ligature`</td>
        <td>`string` \</td>
        <td>`null`</td>
        <td>Text trigger for ligature fonts</td>
        <td>`send`</td>
    </tr>
    <tr>
        <td>`font_mapping`</td>
        <td>`font_family_export`</td>
        <td>`string`</td>
        <td>Output family name</td>
        <td>`Acme Symbols`</td>
    <td></td></tr>
    <tr>
        <td>`font_mapping`</td>
        <td>`hinting_profile`</td>
        <td>`string` \</td>
        <td>`null`</td>
        <td>Small-size rendering strategy</td>
        <td>`ui-small-mono-v1`</td>
    </tr>
    <tr>
        <td>`license_record`</td>
        <td>`license_id`</td>
        <td>`string`</td>
        <td>Machine-readable license</td>
        <td>`Apache-2.0`</td>
    <td></td></tr>
    <tr>
        <td>`license_record`</td>
        <td>`attribution_required`</td>
        <td>`boolean`</td>
        <td>Downstream UI/legal handling</td>
        <td>`false`</td>
    <td></td></tr>
</table>
13

## Page 14

<table>
    <tr>
        <th>Entity</th>
        <th>Field</th>
        <th>Type</th>
        <th>Purpose</th>
        <th>Example</th>
    </tr>
    <tr>
        <td>license_record</td>
        <td>logo_restrictions</td>
        <td>string[]</td>
        <td>Trademark or brand exceptions</td>
        <td>["no third-party logos"]</td>
    </tr>
    <tr>
        <td>provenance_record</td>
        <td>creator_ids</td>
        <td>string[]</td>
        <td>Attribution chain</td>
        <td>["team-google-icons"]</td>
    </tr>
    <tr>
        <td>provenance_record</td>
        <td>source_urls</td>
        <td>string[]</td>
        <td>Canonical origin refs</td>
        <td>["official repo","design doc"]</td>
    </tr>
    <tr>
        <td>provenance_record</td>
        <td>generation_method</td>
        <td>enum</td>
        <td>hand-drawn, digitized, derived, ai-assisted</td>
        <td>hand-drawn</td>
    </tr>
</table>
The field model deliberately separates **literal depiction**, **interface function**, and **classification** because those often diverge. A shield may depict a shield, function as “security,” serve as a “verified” badge in one product, and mean “policy” in another. Backend structure should preserve that distinction instead of flattening it into one label. <sup>40</sup>

## Example record

```json
{
  "icon_set": {
    "id": "acme-symbols",
    "name": "Acme Symbols",
    "version": "1.0.0",
    "license_id": "OFL-1.1"
  },
  "icon_glyph": {
    "id": "send",
    "canonical_name": "send",
    "pref_label": {
      "en-US": "Send",
      "fr-FR": "Envoyer"
    },
    "alt_labels": {
      "en-US": ["paper plane", "submit message"]
    },
    "semantic_category": "action",
    "depicts": "paper plane",
    "functions": ["send message", "share"],
    "concept_ids": ["communication", "message-transfer"],
    "directionality": "mirror",
    "cultural_notes": [
      "Paper-plane metaphor may need localization review."
    ]
  }
}
```

14

## Page 15

],
"accessibility_purpose": "functional",
"deprecated": false
},
"icon_variant": {
"id": "send.outlined.24",
"glyph_id": "send",
"style_family": "outlined",
"medium": "svg",
"view_box": [0, 0, 24, 24],
"grid_size": 24,
"safe_zone": 20,
"stroke_model": "monoline",
"stroke_width": 2,
"axes": {
"wght": [300, 700],
"opsz": [20, 48]
},
"layer_count": 1,
"animation_capabilities": []
},
"vector_asset": {
"path_data": "M...",
"checksum": "sha256:abcd1234"
},
"font_mapping": {
"codepoint": "E163",
"ligature": "send",
"font_family_export": "Acme Symbols",
"hinting_profile": "ui-small-mono-v1"
},
"provenance_record": {
"creator_ids": ["designer-001"],
"source_urls": ["official-design-file"],
"generation_method": "hand-drawn"
}
}

That example is intentionally generic, but the same structure scales upward to historically rich records and downward to pure product libraries. A religious icon can add subject authorities and narrative roles; a platform symbol can add axes and animation metadata; an emoji-like record can add vendor-preview references and CLDR annotations. <sup>59</sup>

## Licensing and IP constraints

Licensing is where many icon backends break in production. In the United States, the Copyright Office states that copyright does not protect typeface itself, while the Office also explains that very simple works,

15

## Page 16

common symbols like hearts or smiley faces, and typography may be ineligible for copyright. That does **not** mean icon libraries are free to copy: original icon drawings are often copyrightable, logos are often trademark-constrained, and platform repositories can include explicit exclusions. Google’s Material repository, for example, says third-party logos are not included for legal reasons. A backend therefore needs item-level legal metadata, not just set-level licensing. <sup>60</sup>

License heterogeneity is now normal. Material Symbols are distributed under Apache 2.0; Fluent system icons are open source under MIT; the SIL Open Font License allows fonts to be used, studied, modified, and redistributed provided they are not sold by themselves and reserved names are respected. That means a font-creation tool backend should separate at least these layers: **source asset license**, **compiled font license**, **attribution requirements**, **reserved names or trademark exceptions**, and **redistribution permissions**. <sup>61</sup>

## Current trends

The icon field is now undergoing five simultaneous shifts: variable icons, adaptive/responsive icons, layered spatial icons, SVG-first deployment, and AI-assisted generation. Material Symbols turned a large public icon set into a variable-font system in 2022; Android adaptive icons now respond to device masks, motion behaviors, and user theming; SF Symbols 7 adds Variable Draw, gradients, and new annotation tools; Apple's Icon Composer turns platform app icons into multilayer, lighting-aware packages; and Adobe, Figma, and Font Awesome are all now exposing AI-mediated ways to generate or select iconographic assets. <sup>62</sup>

The chart below is an **analytical maturity score**, not a market-share measure. It rates current trends by the breadth of explicit support in major official platform/tooling docs.

16

## Page 17

Current icon trend maturity

<table>
    <tr>
        <th>Analyst score</th>
        <th>Variable</th>
        <th>Adaptive</th>
        <th>SVG-first</th>
        <th>Spatial</th>
        <th>AI</th>
    </tr>
    <tr>
        <td>5</td>
        <td>5</td>
        <td>5</td>
        <td>5</td>
        <td>4</td>
        <td>3</td>
    </tr>
    <tr>
        <td>4.5</td>
        <td>4.5</td>
        <td>4.5</td>
        <td>4.5</td>
        <td>3.5</td>
        <td>2.5</td>
    </tr>
    <tr>
        <td>4</td>
        <td>4</td>
        <td>4</td>
        <td>4</td>
        <td>3</td>
        <td>2</td>
    </tr>
    <tr>
        <td>3.5</td>
        <td>3.5</td>
        <td>3.5</td>
        <td>3.5</td>
        <td>2.5</td>
        <td>1.5</td>
    </tr>
    <tr>
        <td>3</td>
        <td>3</td>
        <td>3</td>
        <td>3</td>
        <td>2</td>
        <td>1</td>
    </tr>
    <tr>
        <td>2.5</td>
        <td>2.5</td>
        <td>2.5</td>
        <td>2.5</td>
        <td>1.5</td>
        <td>0.5</td>
    </tr>
    <tr>
        <td>2</td>
        <td>2</td>
        <td>2</td>
        <td>2</td>
        <td>1</td>
        <td>0</td>
    </tr>
    <tr>
        <td>1.5</td>
        <td>1.5</td>
        <td>1.5</td>
        <td>1.5</td>
        <td>0.5</td>
        <td>0</td>
    </tr>
    <tr>
        <td>1</td>
        <td>1</td>
        <td>1</td>
        <td>1</td>
        <td>0</td>
        <td>0</td>
    </tr>
    <tr>
        <td>0.5</td>
        <td>0.5</td>
        <td>0.5</td>
        <td>0.5</td>
        <td>0</td>
        <td>0</td>
    </tr>
    <tr>
        <td>0</td>
        <td>0</td>
        <td>0</td>
        <td>0</td>
        <td>0</td>
        <td>0</td>
    </tr>
</table>
Why these scores? Variable icons are mature because Material exposes four public axes and OpenType variations are standardized; adaptive icons are mature because Android has a robust launcher/app-icon model and theming behavior; SVG-first pipelines are mature because W3C, Primer, Font Awesome, and OpenType all support them directly; spatial/layered icons are real but still platform-led rather than universal; and AI-assisted icon generation is clearly accelerating, but official tooling still emphasizes editability and refinement rather than guaranteed semantic or pixel-grid correctness. <sup>63</sup>

For a font-creation backend, the forward-looking design stance is therefore straightforward. Treat icons as **versioned semantic assets** with geometry, variants, and rules. Store source vectors, variable axes, locale labels, direction metadata, contrast/accessibility notes, and legal provenance. Generate fonts when they are useful, but do not make the font the master truth. That architecture honors both the oldest lesson of iconography—that meaning is conventional—and the newest lesson of design systems—that convention must now be machine-readable. <sup>64</sup>

<sup>1</sup> <sup>9</sup> <sup>64</sup> https://smarthistory.org/introduction-iconographic-analysis/

https://smarthistory.org/introduction-iconographic-analysis/

<sup>2</sup> <sup>4</sup> <sup>7</sup> <sup>33</sup> <sup>39</sup> <sup>42</sup> <sup>48</sup> <sup>61</sup> <sup>63</sup> https://developers.google.com/fonts/docs/material_symbols

https://developers.google.com/fonts/docs/material_symbols

<sup>3</sup> <sup>6</sup> <sup>43</sup> <sup>47</sup> <sup>57</sup> https://www.w3.org/TR/SVG2/

https://www.w3.org/TR/SVG2/

17

## Page 18

5 8 51 53 https://iconclass.org/
https://iconclass.org/

10 16 https://www.nature.com/articles/s41597-020-00704-x
https://www.nature.com/articles/s41597-020-00704-x

11 https://www.metmuseum.org/essays/icons-and-iconoclasm-in-byzantium
https://www.metmuseum.org/essays/icons-and-iconoclasm-in-byzantium

12 https://www.metmuseum.org/essays/calligraphy-in-islamic-art
https://www.metmuseum.org/essays/calligraphy-in-islamic-art

13 https://www.metmuseum.org/essays/recognizing-the-gods
https://www.metmuseum.org/essays/recognizing-the-gods

14 https://www.college-of-arms.gov.uk/about-us/history
https://www.college-of-arms.gov.uk/about-us/history

15 https://www.britishmuseum.org/collection/object/P_1895-0122-554
https://www.britishmuseum.org/collection/object/P_1895-0122-554

17 28 https://isotyperevisited.org/2010/09/isotype-revisited.php
https://isotyperevisited.org/2010/09/isotype-revisited.php

18 https://olympics.com/ioc/news/the-olympic-pictograms-a-long-and-fascinating-story
https://olympics.com/ioc/news/the-olympic-pictograms-a-long-and-fascinating-story

19 34 40 45 https://fluent2.microsoft.design/iconography
https://fluent2.microsoft.design/iconography
https://www.olympics.com/en/olympic-games/munich-1972/logo-design

20 https://www.olympics.com/en/olympic-games/munich-1972/logo-design
https://www.monotype.com/studio/akira-kobayashi
21 https://www.monotype.com/studio/akira-kobayashi
https://www.nytransitmuseum.org/vignelli/

22 https://www.nytransitmuseum.org/vignelli/
23 30 https://www.monotype.com/resources/expertise/dive-dingbats-part-2
https://www.monotype.com/resources/expertise/dive-dingbats-part-2

24 https://learn.microsoft.com/en-us/typography/font-list/wingdings
https://learn.microsoft.com/en-us/typography/font-list/wingdings

25 https://computerhistory.org/blog/happy-40th-birthday-lisa/
https://computerhistory.org/blog/happy-40th-birthday-lisa/

26 https://www.moma.org/collection/works/188382
https://www.moma.org/collection/works/188382

27 31 https://www.moma.org/calendar/exhibitions/3639
https://www.moma.org/calendar/exhibitions/3639

29 https://www.computerhistory.org/timeline/computers/
https://www.computerhistory.org/timeline/computers/

18

## Page 19

32 62 https://github.com/google/material-design-icons
https://github.com/google/material-design-icons

35 https://developer.apple.com/sf-symbols/
https://developer.apple.com/sf-symbols/

36 https://primer.style/octicons/
https://primer.style/octicons/

37 https://docs.fontawesome.com/web/setup/host-yourself/webfonts
https://docs.fontawesome.com/web/setup/host-yourself/webfonts

38 50 https://www.unicode.org/emoji/charts-17.0/
https://www.unicode.org/emoji/charts-17.0/

41 https://m3.material.io/blog/material-icons-sehee-lee-interview
https://m3.material.io/blog/material-icons-sehee-lee-interview

44 https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html
https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html

46 https://docs.fontawesome.com/web/dig-deeper/webfont-vs-svg
https://docs.fontawesome.com/web/dig-deeper/webfont-vs-svg

49 https://developer.android.com/develop/ui/compose/system/icon_design_adaptive
https://developer.android.com/develop/ui/compose/system/icon_design_adaptive

52 58 59 https://www.w3.org/TR/skos-reference/
https://www.w3.org/TR/skos-reference/

54 https://www.getty.edu/research/tools/vocabularies/aat/
https://www.getty.edu/research/tools/vocabularies/aat/

55 https://cldr.unicode.org/translation/characters/short-names-and-keywords
https://cldr.unicode.org/translation/characters/short-names-and-keywords

56 https://learn.microsoft.com/en-us/typography/opentype/spec/otvaroverview
https://learn.microsoft.com/en-us/typography/opentype/spec/otvaroverview

60 https://www.copyright.gov/circs/circ33.pdf
https://www.copyright.gov/circs/circ33.pdf

19


### Extracted images (34):
- `parsed-documents://20260527-130252-548730/History_of_Icons_and_Iconography_for_Font-Creation_Backends.pdf/images/page_1.jpg`
- `parsed-documents://20260527-130252-548730/History_of_Icons_and_Iconography_for_Font-Creation_Backends.pdf/images/page_10.jpg`
- `parsed-documents://20260527-130252-548730/History_of_Icons_and_Iconography_for_Font-Creation_Backends.pdf/images/page_10_image_1_v2.jpg`
- `parsed-documents://20260527-130252-548730/History_of_Icons_and_Iconography_for_Font-Creation_Backends.pdf/images/page_10_table_1_v2.jpg`
- `parsed-documents://20260527-130252-548730/History_of_Icons_and_Iconography_for_Font-Creation_Backends.pdf/images/page_11.jpg`
- `parsed-documents://20260527-130252-548730/History_of_Icons_and_Iconography_for_Font-Creation_Backends.pdf/images/page_11_table_1_v2.jpg`
- `parsed-documents://20260527-130252-548730/History_of_Icons_and_Iconography_for_Font-Creation_Backends.pdf/images/page_12.jpg`
- `parsed-documents://20260527-130252-548730/History_of_Icons_and_Iconography_for_Font-Creation_Backends.pdf/images/page_12_table_1_v2.jpg`
- `parsed-documents://20260527-130252-548730/History_of_Icons_and_Iconography_for_Font-Creation_Backends.pdf/images/page_13.jpg`
- `parsed-documents://20260527-130252-548730/History_of_Icons_and_Iconography_for_Font-Creation_Backends.pdf/images/page_13_table_1_v2.jpg`
- `parsed-documents://20260527-130252-548730/History_of_Icons_and_Iconography_for_Font-Creation_Backends.pdf/images/page_14.jpg`
- `parsed-documents://20260527-130252-548730/History_of_Icons_and_Iconography_for_Font-Creation_Backends.pdf/images/page_14_table_1_v2.jpg`
- `parsed-documents://20260527-130252-548730/History_of_Icons_and_Iconography_for_Font-Creation_Backends.pdf/images/page_15.jpg`
- `parsed-documents://20260527-130252-548730/History_of_Icons_and_Iconography_for_Font-Creation_Backends.pdf/images/page_16.jpg`
- `parsed-documents://20260527-130252-548730/History_of_Icons_and_Iconography_for_Font-Creation_Backends.pdf/images/page_17.jpg`
- `parsed-documents://20260527-130252-548730/History_of_Icons_and_Iconography_for_Font-Creation_Backends.pdf/images/page_17_chart_1_v2.jpg`
- `parsed-documents://20260527-130252-548730/History_of_Icons_and_Iconography_for_Font-Creation_Backends.pdf/images/page_18.jpg`
- `parsed-documents://20260527-130252-548730/History_of_Icons_and_Iconography_for_Font-Creation_Backends.pdf/images/page_19.jpg`
- `parsed-documents://20260527-130252-548730/History_of_Icons_and_Iconography_for_Font-Creation_Backends.pdf/images/page_1_image_1_v2.jpg`
- `parsed-documents://20260527-130252-548730/History_of_Icons_and_Iconography_for_Font-Creation_Backends.pdf/images/page_2.jpg`
- `parsed-documents://20260527-130252-548730/History_of_Icons_and_Iconography_for_Font-Creation_Backends.pdf/images/page_3.jpg`
- `parsed-documents://20260527-130252-548730/History_of_Icons_and_Iconography_for_Font-Creation_Backends.pdf/images/page_3_chart_1_v2.jpg`
- `parsed-documents://20260527-130252-548730/History_of_Icons_and_Iconography_for_Font-Creation_Backends.pdf/images/page_3_image_1_v2.jpg`
- `parsed-documents://20260527-130252-548730/History_of_Icons_and_Iconography_for_Font-Creation_Backends.pdf/images/page_4.jpg`
- `parsed-documents://20260527-130252-548730/History_of_Icons_and_Iconography_for_Font-Creation_Backends.pdf/images/page_4_table_1_v2.jpg`
- `parsed-documents://20260527-130252-548730/History_of_Icons_and_Iconography_for_Font-Creation_Backends.pdf/images/page_5.jpg`
- `parsed-documents://20260527-130252-548730/History_of_Icons_and_Iconography_for_Font-Creation_Backends.pdf/images/page_5_table_1_v2.jpg`
- `parsed-documents://20260527-130252-548730/History_of_Icons_and_Iconography_for_Font-Creation_Backends.pdf/images/page_6.jpg`
- `parsed-documents://20260527-130252-548730/History_of_Icons_and_Iconography_for_Font-Creation_Backends.pdf/images/page_6_table_1_v2.jpg`
- `parsed-documents://20260527-130252-548730/History_of_Icons_and_Iconography_for_Font-Creation_Backends.pdf/images/page_7.jpg`
- `parsed-documents://20260527-130252-548730/History_of_Icons_and_Iconography_for_Font-Creation_Backends.pdf/images/page_7_table_1_v2.jpg`
- `parsed-documents://20260527-130252-548730/History_of_Icons_and_Iconography_for_Font-Creation_Backends.pdf/images/page_8.jpg`
- `parsed-documents://20260527-130252-548730/History_of_Icons_and_Iconography_for_Font-Creation_Backends.pdf/images/page_9.jpg`
- `parsed-documents://20260527-130252-548730/History_of_Icons_and_Iconography_for_Font-Creation_Backends.pdf/images/page_9_table_1_v2.jpg`