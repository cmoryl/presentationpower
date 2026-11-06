// Master image-creation prompts for every Design Set 5 asset, for use in
// external image tools. Each asset id resolves to a complete standalone
// prompt: shared Bowl design DNA + per-asset art direction + output spec.
import type { SjbSet5Asset } from './sjb-set5-assets';

export const SJB_SET5_PROMPT_DNA =
  'TransPerfect San Juan Bowl college football championship artwork, Design Set 5 "Light Cinematic" system. ' +
  'Brand palette is exact: Bowl Navy #0D0E21, electric cyan #00AAE7, gold #FFD600, pure white #FFFFFF — no other hues except natural leather brown on the football. ' +
  'Aesthetic: premium sports-broadcast key art with a cinematic Caribbean night-game mood; crisp studio-grade lighting; deep soft shadows; fine film grain; sharp focus on the hero subject; generous uncluttered negative space reserved for typography. ' +
  'Light behaves physically: gold and cyan light streams have bright cores with soft exponential falloff, sparks are small and sparse, floodlight bloom is subtle and never washes out the frame. ' +
  'Any lettering is set in Geist (geometric sans), uppercase, tight tracking, white or navy only. ' +
  'Event facts, when copy appears: SAN JUAN BOWL, DECEMBER 16, 2026, HIRAM BITHORN STADIUM, SAN JUAN, PR, SANJUANBOWL.COM. ' +
  'Never invent team logos, team uniforms, player likenesses, sponsor marks or scores — no teams are announced.';

const LEATHER_BALL =
  'a photorealistic worn brown leather American football: pebbled grain with visible pore texture, slightly darkened panels from handling, crisp white laces with individual thread detail, white stripe near each end, subtle specular highlight along the top curve';
const NAVY_BALL =
  'a matte Bowl Navy #0D0E21 American football: soft satin finish, electric cyan #00AAE7 laces, thin gold #FFD600 accent stripes near each end, gentle rim light separating it from the ground';

const FORMAT_SPECS: Record<string, string> = {
  wide: 'Output 1920 × 1088 px (16:9-class social wide), RGB, sRGB, sharp to the corners.',
  ultrawide: 'Output 1920 × 640 px (3:1 ultrawide billboard strip), RGB, sRGB, sharp to the corners.',
  square: 'Output 1920 × 1920 px (1:1 feed square), RGB, sRGB, sharp to the corners.',
  portrait: 'Output 1536 × 1920 px (4:5 portrait feed), RGB, sRGB, sharp to the corners.',
  story: 'Output 1088 × 1920 px (9:16-class story), RGB, sRGB, sharp to the corners.',
  email: 'Output 1920 × 960 px (2:1 email header), RGB, sRGB, sharp to the corners.',
  object: 'Output as a transparent-background PNG (true alpha, clean 1-2 px edge falloff, no fringe, no background colour contamination), subject crisp at native resolution.',
};

const ENLARGED_NOTE =
  ' Render at the highest resolution the tool allows and finish with a high-quality upscale pass targeting a 12,000 px long edge at 300 dpi for billboard output; enlargement adds pixels, not recovered detail, so keep edges and light-stream cores clean before upscaling.';

function motionCompositePrompt(ball: string, intensity: 'hero' | 'restrained' | 'velocity'): string {
  const trails = {
    hero: 'Balanced streaming light: two gold #FFD600 ribbons and one cyan #00AAE7 ribbon arc behind the ball in a smooth S-curve, with a soft gold contour glow hugging the leather and a dozen tiny sparks at the trail heads.',
    restrained: 'Minimal elegant motion: a single thin gold #FFD600 ribbon and a faint cyan #00AAE7 whisper trail, low sparkle count, most of the frame left as quiet negative space for copy.',
    velocity: 'Maximum speed energy: three to four overlapping gold and cyan ribbons with motion-streak tapering, a brighter comet head at the ball, denser spark field, and a subtle cyan under-glow, while the ball itself stays tack sharp.',
  }[intensity];
  return (
    `Transparent-PNG hero object: ${ball}, frozen mid-flight at a dynamic three-quarter angle, nose slightly up, laces catching the key light. ` +
    `${trails} Light streams sit BEHIND and AROUND the ball as separate visual layers so the composite can be re-positioned; keep a clean alpha edge on the ball itself. ` +
    'Lighting: large soft key from upper left, cool cyan rim from lower right, faint gold bounce from below. ' +
    FORMAT_SPECS.object
  );
}

function trailPrompt(color: 'cyan' | 'gold', intensity: 'hero' | 'restrained' | 'velocity'): string {
  const hex = color === 'cyan' ? '#00AAE7' : '#FFD600';
  const body = {
    hero: 'two flowing parallel ribbons in a wide S-curve, bright cores fading to soft glow, moderate spark accents at the heads',
    restrained: 'a single hairline ribbon with long elegant taper, very low glow, almost no sparks',
    velocity: 'three stacked streaked ribbons with aggressive taper and motion blur, bright comet heads, scattered micro-sparks',
  }[intensity];
  return (
    `Transparent-PNG light-trail overlay only (no football, no background): ${color} ${hex} streaming light trails, ${body}. ` +
    'Trails travel left-to-right with a slight upward lift, occupy the middle band of the frame, and fade to fully transparent at both ends so the overlay tiles cleanly over any ground. ' +
    'Glow must be additive-style: bright saturated core, exponential alpha falloff, no hard edges. ' +
    FORMAT_SPECS.object
  );
}

function wrapPrompt(ball: 'leather' | 'navy', intensity: 'hero' | 'restrained' | 'velocity', kind: 'contour' | 'wrap'): string {
  const name = ball === 'leather' ? 'a brown leather football silhouette' : 'a Bowl Navy #0D0E21 football silhouette';
  const strength = { hero: 'medium', restrained: 'very subtle', velocity: 'strong' }[intensity];
  const shape =
    kind === 'contour'
      ? `a ${strength} gold #FFD600 contour glow that hugs the exact outline of ${name}, like a rim of sunlight tracing the leather, 8-16 px soft band, transparent interior`
      : `a ${strength} cyan #00AAE7 and gold #FFD600 light wrap that crosses IN FRONT of ${name} as a thin ribbon band, masking around the laces, transparent everywhere else`;
  return (
    `Transparent-PNG effect layer only: ${shape}. ` +
    'Designed to be composited over the matching motion-football PNG at identical 3000 × 1600 px framing; alignment must be pixel-true, so keep the canvas size and subject position identical to the base ball render. ' +
    FORMAT_SPECS.object
  );
}

function backgroundPrompt(scene: string, format: keyof typeof FORMAT_SPECS): string {
  return `${scene} ${FORMAT_SPECS[format]}`;
}

const SPECIFIC: Record<string, string> = {
  // — Rule of thirds backgrounds —
  'variety-thirds-left-wide': backgroundPrompt(
    'Wide cinematic night-game background: a photorealistic leather football with gold #FFD600 and cyan #00AAE7 light trails rests exactly on the LEFT vertical rule-of-thirds line, slightly below the horizontal centre; the entire right two-thirds is smooth, quiet white-to-pale-navy gradient copy space with only a whisper of film grain. Distant out-of-focus stadium floodlights glow softly along the top edge; a faint palm-frond silhouette kisses the top-left corner.',
    'wide'),
  'variety-thirds-right-wide': backgroundPrompt(
    'Wide cinematic night-game background, mirror composition: the leather football with streaming gold #FFD600 and cyan #00AAE7 trails sits exactly on the RIGHT vertical rule-of-thirds line, its light trail sweeping in from the left edge; the left two-thirds is calm white copy space. Soft floodlight bokeh along the top, faint palm silhouette top-right.',
    'wide'),
  'variety-thirds-top-story': backgroundPrompt(
    'Vertical story background: the leather football with gold and cyan light trails sits on the TOP horizontal rule-of-thirds line, centred left-right; the lower two-thirds falls away into a clean, bright, evenly lit white field for stacked copy. Floodlight glow at the very top, subtle vignette at the bottom corners only.',
    'story'),

  // — Cinematic power backgrounds —
  'variety-power-wide': backgroundPrompt(
    'High-energy wide key art: a burning-hot leather football tears across the frame left-to-right at a slight upward angle, wrapped in aggressive gold #FFD600 and cyan #00AAE7 light streams with a bright comet head, ember sparks, and heat-shimmer distortion; stadium floodlights flare in the deep navy background; the right third stays calmer for a headline. Dramatic but controlled: highlights never clip to pure white except at the comet core.',
    'wide'),
  'variety-power-ultrawide': backgroundPrompt(
    'Ultrawide billboard strip: the burning leather football with gold and cyan comet trails enters from the left and exits frame-right, stretched cinematic composition; floodlight bank glows far left, deep navy sky, fine ember field; the central band is darkest so white billboard copy reads at highway distance.',
    'ultrawide'),
  'variety-power-square': backgroundPrompt(
    'Square feed key art: the burning football bursts upward from the lower-left corner toward the upper-right, gold and cyan ribbons spiralling behind it, sparks drifting down; upper-right quadrant kept quiet for copy; deep navy ground with a soft radial stadium glow behind the ball.',
    'square'),
  'variety-power-story': backgroundPrompt(
    'Vertical story key art: the burning football rockets upward through the lower half, gold and cyan light streams trailing down and out of frame, embers falling; top third opens into calm deep-navy space for the event lockup; floodlight bloom hugs the bottom edge.',
    'story'),
  'variety-power-portrait': backgroundPrompt(
    'Portrait 4:5 key art: the football bursts up from the bottom-left corner at a steep diagonal, wrapped in gold #FFD600 and cyan #00AAE7 streams with a hot comet head; the upper-right half is smooth quiet navy for copy; faint palm silhouettes frame the extreme left edge; floodlight flare low right.',
    'portrait'),
  'variety-power-email-closeup': backgroundPrompt(
    'Email-header close-up: extreme crop on the football\'s laces and pebbled leather filling the right edge of the frame, every stitch and pore tack sharp, gold and cyan light streams wrapping around the ball and trailing left across a deep navy field; the left half stays dark and calm for headline text.',
    'email'),
  'variety-power-burst-center': backgroundPrompt(
    'Wide radial-burst key art: the football sits dead centre, exploding toward the viewer with a slight fisheye sense of speed; gold and cyan light ribbons radiate outward symmetrically, sparks fly to the corners, stadium floodlights bloom directly behind the ball like a halo; the four corners fall to quiet navy for corner-placed copy.',
    'wide'),
  'variety-power-light-horizon': backgroundPrompt(
    'Ultrawide atmosphere piece with NO football: a low horizon of gold #FFD600 and cyan #00AAE7 light ribbons streaming horizontally across a deep navy night sky, stadium floodlight towers glowing at both ends, palm silhouettes along the bottom edge, thin atmospheric haze; the whole upper half is clean dark copy space for billboard typography.',
    'ultrawide'),
  'variety-power-football-comet':
    `Transparent-PNG hero object: ${LEATHER_BALL}, rendered as a comet — the ball is the bright head at frame-right, with a long tapered gold #FFD600 and cyan #00AAE7 light trail streaming behind it to the left, ember sparks embedded in the trail, glow fading to full transparency at the trail's tail. Diagonal upward-left-to-right motion. ` +
    FORMAT_SPECS.object,

  // — New backgrounds (first variety batch) —
  'variety-left-flight': backgroundPrompt(
    'Wide background: the leather football in smooth level flight enters from the left edge at mid-height, a single elegant gold #FFD600 ribbon and a faint cyan #00AAE7 trail behind it; the right half is a clean bright white field for copy; soft floodlight bokeh top edge, faint grain throughout.',
    'wide'),
  'variety-panoramic-flight': backgroundPrompt(
    'Ultrawide 3:1 strip: the football in level flight crosses the full width left-to-right with long horizontal gold and cyan trails that stretch across the entire frame; deep navy ground, floodlight towers at both extremes, the central band kept dark and even for a single line of huge billboard copy.',
    'ultrawide'),
  'variety-square-lift': backgroundPrompt(
    'Square background: the football lifts off from the bottom centre toward the top, short vertical gold and cyan trails beneath it like a launch; generous white-to-pale gradient fills the upper two-thirds for copy; faint palm crowns in the bottom corners.',
    'square'),
  'variety-portrait-sweep': backgroundPrompt(
    'Portrait background: the football sweeps in a wide arc from bottom-left to top-right, its gold and cyan trail drawing a elegant curved line across the frame; the concave side of the arc (upper-left) is calm light space for copy; soft stadium glow at the arc\'s origin.',
    'portrait'),
  'variety-story-rise': backgroundPrompt(
    'Story background: the football rises straight up through the centre, vertical gold and cyan streams below it fading out at the bottom edge; top third is open bright space for the date lockup; subtle vignette, fine grain.',
    'story'),
  'variety-stadium-clean': backgroundPrompt(
    'Clean wide stadium atmosphere with NO football: an empty night stadium bowl rendered soft and out of focus, floodlights glowing warm gold against a deep navy sky, the hint of a palm-lined concourse; foreground two-thirds is a smooth bright field for copy. Calm, premium, uncluttered.',
    'wide'),
  'variety-palm-frame': backgroundPrompt(
    'Square background framed by palms: lush palm fronds silhouette in from all four corners over a deep navy night sky, gold floodlight glow behind the fronds, a single cyan light streak crossing the centre horizontally; the central 60% of the frame is clean dark copy space.',
    'square'),
  'variety-motion-border': backgroundPrompt(
    'Ultrawide strip where the light effects form a border: gold #FFD600 and cyan #00AAE7 streams run along the very top and bottom edges like a frame, sparks at the corners, and the entire central band is flat, even, deep navy — a perfect field for one line of large white billboard type.',
    'ultrawide'),

  // — Transparent objects —
  'variety-leather-three-quarter':
    `Transparent-PNG object: ${LEATHER_BALL}, isolated at a classic three-quarter product angle, laces facing up-right, soft studio key from upper left, gentle contact shadow omitted (pure transparency under the ball). ` +
    FORMAT_SPECS.object,
  'variety-navy-ascending':
    `Transparent-PNG object: ${NAVY_BALL}, captured ascending at a steep 60° climb, nose high, with a short elegant gold #FFD600 trail tapering off the bottom and two or three sparks; trail fades to full transparency. ` +
    FORMAT_SPECS.object,
  'variety-leather-end-on':
    `Transparent-PNG object: ${LEATHER_BALL}, seen end-on (pointing at the viewer) with a soft radial gold #FFD600 halo ringing the ball and a faint cyan #00AAE7 outer glow; dramatic, symmetric, icon-like. ` +
    FORMAT_SPECS.object,
  'variety-palm-fronds':
    'Transparent-PNG object: a cluster of lush tropical palm fronds, deep green with warm gold #FFD600 rim light from behind as if backlit by stadium floodlights, individual leaflets crisp, stems converging at the bottom; designed to frame design corners. ' +
    FORMAT_SPECS.object,

  // — Motion footballs (composites) —
  'motion-composites-leather-hero-3000px.png': motionCompositePrompt(LEATHER_BALL, 'hero'),
  'motion-composites-leather-restrained-3000px.png': motionCompositePrompt(LEATHER_BALL, 'restrained'),
  'motion-composites-leather-velocity-3000px.png': motionCompositePrompt(LEATHER_BALL, 'velocity'),
  'motion-composites-navy-hero-3000px.png': motionCompositePrompt(NAVY_BALL, 'hero'),
  'motion-composites-navy-restrained-3000px.png': motionCompositePrompt(NAVY_BALL, 'restrained'),
  'motion-composites-navy-velocity-3000px.png': motionCompositePrompt(NAVY_BALL, 'velocity'),

  // — Motion balls (plain flights) —
  'motion-balls-leather-flight-native.png':
    `Transparent-PNG object: ${LEATHER_BALL}, frozen mid-flight at a three-quarter angle with NO light effects — a clean plate ball for custom compositing; crisp alpha edge, studio key upper-left, cyan rim lower-right. ` +
    FORMAT_SPECS.object,
  'motion-balls-navy-flight-native.png':
    `Transparent-PNG object: ${NAVY_BALL}, frozen mid-flight at a three-quarter angle with NO light effects — a clean plate ball for custom compositing; crisp alpha edge, gold rim light to separate the navy leather from dark grounds. ` +
    FORMAT_SPECS.object,

  // — Motion effects: trails —
  'motion-effects-hero-cyan-trails.png': trailPrompt('cyan', 'hero'),
  'motion-effects-hero-gold-trails.png': trailPrompt('gold', 'hero'),
  'motion-effects-restrained-cyan-trails.png': trailPrompt('cyan', 'restrained'),
  'motion-effects-restrained-gold-trails.png': trailPrompt('gold', 'restrained'),
  'motion-effects-velocity-cyan-trails.png': trailPrompt('cyan', 'velocity'),
  'motion-effects-velocity-gold-trails.png': trailPrompt('gold', 'velocity'),

  // — Motion effects: contour glows & front wraps —
  'motion-effects-leather-hero-contour-glow.png': wrapPrompt('leather', 'hero', 'contour'),
  'motion-effects-leather-restrained-contour-glow.png': wrapPrompt('leather', 'restrained', 'contour'),
  'motion-effects-leather-velocity-contour-glow.png': wrapPrompt('leather', 'velocity', 'contour'),
  'motion-effects-navy-hero-contour-glow.png': wrapPrompt('navy', 'hero', 'contour'),
  'motion-effects-navy-restrained-contour-glow.png': wrapPrompt('navy', 'restrained', 'contour'),
  'motion-effects-navy-velocity-contour-glow.png': wrapPrompt('navy', 'velocity', 'contour'),
  'motion-effects-leather-hero-front-wrap.png': wrapPrompt('leather', 'hero', 'wrap'),
  'motion-effects-leather-restrained-front-wrap.png': wrapPrompt('leather', 'restrained', 'wrap'),
  'motion-effects-leather-velocity-front-wrap.png': wrapPrompt('leather', 'velocity', 'wrap'),
  'motion-effects-navy-hero-front-wrap.png': wrapPrompt('navy', 'hero', 'wrap'),
  'motion-effects-navy-restrained-front-wrap.png': wrapPrompt('navy', 'restrained', 'wrap'),
  'motion-effects-navy-velocity-front-wrap.png': wrapPrompt('navy', 'velocity', 'wrap'),

  // — Cinematic effects —
  'cinematic-leather-cinematic-transparent.png':
    `Transparent-PNG cinematic hero: ${LEATHER_BALL}, wrapped in rich interweaving gold #FFD600 and cyan #00AAE7 streaming ribbons that spiral around the leather, dense but elegant spark field, soft volumetric glow; the most premium, most detailed treatment in the set. ` +
    FORMAT_SPECS.object,
  'cinematic-navy-cinematic-transparent.png':
    `Transparent-PNG cinematic hero: ${NAVY_BALL}, wrapped in rich interweaving gold #FFD600 and cyan #00AAE7 streaming ribbons that spiral around the satin navy leather, dense but elegant spark field, soft volumetric glow. ` +
    FORMAT_SPECS.object,
  'cinematic-leather-streaming-light-black.jpg':
    `Black-background light painting (for screen-blend compositing): gold #FFD600 and cyan #00AAE7 light streams and sparks swirling around ${LEATHER_BALL}, everything rendered additively on pure #000000 black so the layer can be Screen-blended over any ground; no grey haze, true black between streams. Output 1920 × 1280 px JPG, RGB.`,
  'cinematic-navy-streaming-light-black.jpg':
    `Black-background light painting (for screen-blend compositing): gold #FFD600 and cyan #00AAE7 light streams and sparks swirling around ${NAVY_BALL}, everything rendered additively on pure #000000 black so the layer can be Screen-blended over any ground; no grey haze, true black between streams. Output 1920 × 1280 px JPG, RGB.`,
  'cinematic-leather-wake-overlay.png':
    'Transparent-PNG overlay: only the trailing wake — gold #FFD600 and cyan #00AAE7 ribbons, sparks and soft glow that stream BEHIND a leather football, with a football-shaped transparent void at the head so the separate ball PNG drops in perfectly; designed to layer under the matching cinematic ball at identical 1920 × 1280 px framing. ' +
    FORMAT_SPECS.object,
  'cinematic-navy-wake-overlay.png':
    'Transparent-PNG overlay: only the trailing wake — gold #FFD600 and cyan #00AAE7 ribbons, sparks and soft glow that stream BEHIND a navy football, with a football-shaped transparent void at the head so the separate ball PNG drops in perfectly; designed to layer under the matching cinematic ball at identical 1920 × 1280 px framing. ' +
    FORMAT_SPECS.object,

  // — Base transparent pieces —
  'base-transparent-pieces-floodlight-bank-native.png':
    'Transparent-PNG object: a stadium floodlight tower bank — a lattice steel mast with a rectangular array of bright floodlight heads, each lamp a warm gold-white point with subtle starburst bloom, seen from a low three-quarter angle; crisp alpha around the steelwork, no sky. ' +
    FORMAT_SPECS.object,
  'base-transparent-pieces-football-studio-native.png':
    `Transparent-PNG object: ${LEATHER_BALL}, perfectly lit studio product shot, straight-on three-quarter view, even soft lighting from a large overhead softbox, zero background, zero effects — the neutral master ball for any layout. ` +
    FORMAT_SPECS.object,
  'base-transparent-pieces-palm-crown-native.png':
    'Transparent-PNG object: the crown of a royal palm — a full radial burst of arching fronds seen slightly from below, deep green leaves with warm gold #FFD600 backlight edges, trunk cut cleanly at the bottom edge of the alpha; designed to anchor the top or corner of a layout. ' +
    FORMAT_SPECS.object,

  // — Vector pieces (describe as vector artwork specs) —
  'base-vector-pieces-cyan-motion-shards.svg':
    'Vector artwork spec (SVG / Illustrator, not a photo): a scatter of sharp elongated cyan #00AAE7 shards and slivers flying left-to-right like frozen motion fragments, flat fills with a few pieces at reduced opacity for depth, on a transparent artboard; clean bezier edges, no gradients heavier than two stops.',
  'base-vector-pieces-fine-motion-lines.svg':
    'Vector artwork spec: a set of ultra-fine horizontal speed lines in gold #FFD600 and cyan #00AAE7, varying lengths and weights (0.5-3 pt), grouped in threes, tapering at both ends, on a transparent artboard; minimal, elegant, usable as a divider or texture.',
  'base-vector-pieces-gold-content-rule.svg':
    'Vector artwork spec: a single premium content divider rule — a 2 pt gold #FFD600 horizontal line with a small diamond node at its centre and hairline cyan #00AAE7 echoes above and below, transparent artboard; scales to any width.',
  'base-vector-pieces-gold-speed-ribbon.svg':
    'Vector artwork spec: a sweeping gold #FFD600 ribbon curve with a tapered comet head, built from smooth beziers with a soft two-stop gradient along its length (solid gold core to transparent tail), one thin cyan #00AAE7 echo ribbon beneath, transparent artboard.',
  'base-vector-pieces-halftone-fade.svg':
    'Vector artwork spec: a halftone dot fade — rows of navy #0D0E21 dots shrinking from large to pin-point across the artboard left-to-right until they vanish, even spacing, transparent background; usable as a texture wash at low opacity.',
  'base-vector-pieces-navy-motion-slashes.svg':
    'Vector artwork spec: bold diagonal navy #0D0E21 motion slashes — three to five parallel 60° slashed bars with crisp flat fills and one gold #FFD600 accent slash, transparent artboard; a strong graphic device for corners and edges.',
  'base-vector-pieces-stadium-light-bloom.svg':
    'Vector artwork spec: a soft stadium light bloom — concentric radial gradients from warm white-gold centre to fully transparent edge, with four faint cross flare streaks, built as gradient-filled ellipses on a transparent artboard; designed to sit behind a logo or headline.',

  // — Layered artwork —
  'base-layered-compositions-wide-layered.svg':
    'Layered composition spec (rebuild as separate movable layers, 1920 × 1088): Layer 1 ground — smooth white-to-pale-navy vertical gradient; Layer 2 — soft gold floodlight bloom upper-left; Layer 3 — palm crown silhouettes at the top corners; Layer 4 — the leather football with gold and cyan trails on the left third; Layer 5 — fine motion lines and spark accents; keep the right two-thirds empty for copy.',
  'base-layered-compositions-portrait-layered.svg':
    'Layered composition spec (separate movable layers, 1536 × 1920 portrait): Layer 1 ground — pale gradient; Layer 2 — floodlight bloom top; Layer 3 — palm fronds at the upper corners; Layer 4 — football sweeping bottom-left to top-right with trails; Layer 5 — motion line accents; calm copy field upper-left.',
  'base-layered-compositions-tall-layered.svg':
    'Layered composition spec (separate movable layers, 1088 × 1920 story): Layer 1 ground — bright vertical gradient; Layer 2 — glow at the top; Layer 3 — football rising through the centre with vertical trails; Layer 4 — sparks and fine lines; bottom two-thirds reserved for stacked copy.',
  'base-layered-compositions-email-layered.svg':
    'Layered composition spec (separate movable layers, 1920 × 960 email header): Layer 1 ground — deep navy; Layer 2 — gold and cyan streams crossing the frame; Layer 3 — football close-crop at the right edge; Layer 4 — spark accents; left half kept flat and dark for headline text.',
  'motion-layered-leather-hero.svg':
    'Layered composition spec (3000 × 1600, movable layers): leather football plate + separate hero gold/cyan trail layer + separate contour glow layer + separate spark layer, aligned so effects can be toggled or re-positioned independently.',
  'motion-layered-leather-restrained.svg':
    'Layered composition spec (3000 × 1600, movable layers): leather football plate + single restrained gold ribbon layer + faint cyan whisper layer, minimal and elegant.',
  'motion-layered-leather-velocity.svg':
    'Layered composition spec (3000 × 1600, movable layers): leather football plate + stacked velocity trail layers + comet head glow + dense spark layer, maximum energy.',
  'motion-layered-navy-hero.svg':
    'Layered composition spec (3000 × 1600, movable layers): navy football plate + separate hero gold/cyan trail layer + contour glow + sparks, aligned for independent toggling.',
  'motion-layered-navy-restrained.svg':
    'Layered composition spec (3000 × 1600, movable layers): navy football plate + single restrained gold ribbon + faint cyan whisper, minimal and elegant.',
  'motion-layered-navy-velocity.svg':
    'Layered composition spec (3000 × 1600, movable layers): navy football plate + stacked velocity trails + comet head glow + dense sparks, maximum energy.',

  // — Rebuilt 6000px backgrounds —
  'base-rebuilt-backgrounds-wide-6000px-composite.png': backgroundPrompt(
    'The master Set 5 wide background rebuilt for large format: bright white ground with a soft pale-navy gradient at the edges, the leather football with gold #FFD600 and cyan #00AAE7 trails on the left third, floodlight bloom and palm crowns at the top, right two-thirds clean for copy. Render at maximum resolution, then upscale cleanly toward a 6000 px long edge.',
    'wide'),
  'base-rebuilt-backgrounds-portrait-6000px-composite.png': backgroundPrompt(
    'The master Set 5 portrait background rebuilt for large format: pale gradient ground, football sweeping bottom-left to top-right with gold and cyan trails, palms at the top corners, calm upper-left copy field. Render at maximum resolution, then upscale cleanly toward a 6000 px long edge.',
    'portrait'),
  'base-rebuilt-backgrounds-tall-6000px-composite.png': backgroundPrompt(
    'The master Set 5 story background rebuilt for large format: bright ground, football rising through the centre with vertical gold and cyan trails, open lower copy field. Render at maximum resolution, then upscale cleanly toward a 6000 px long edge.',
    'story'),
  'base-rebuilt-backgrounds-email-6000px-composite.png': backgroundPrompt(
    'The master Set 5 email background rebuilt for large format: deep navy ground, gold and cyan streams crossing the frame, close-cropped football at the right edge, flat dark left half for headline text. Render at maximum resolution, then upscale cleanly toward a 6000 px long edge.',
    'email'),

  // — Official logos (honest guidance: never AI-generate the mark) —
  'base-official-logos-sjb-logo-color.svg':
    'Do NOT AI-generate this asset. The San Juan Bowl shield is approved supplied vector artwork and must be placed from the master logo files, never redrawn or recreated by an image model. Usage: colour shield on white or light grounds only; keep clear space of at least one ribbon-height on all sides; never distort, recolour, outline, add effects, or place over busy imagery.',
  'base-official-logos-sjb-logo-dark.svg':
    'Do NOT AI-generate this asset. The San Juan Bowl dark-background shield (white-outline master) is approved supplied vector artwork and must be placed from the master logo files. Usage: white-outline shield on Bowl Navy #0D0E21 or dark imagery only; keep clear space of at least one ribbon-height; never distort, recolour or add glows.',

  // — Hi-res originals & rebuilds —
  'hires-wide-original':
    'This is the recovered Canva master wide background (1600 × 912) enlarged, not a regeneration. To recreate outside the system: take the exported Canva background PNG and upscale with a high-quality resampler (Lanczos or a conservative AI upscaler at low creativity) to a 12,000 px long edge at 300 dpi; do not restyle, add or remove elements.',
  'hires-portrait-original':
    'This is the recovered Canva master portrait background (1088 × 1360) enlarged, not a regeneration. Upscale the exported Canva PNG with a high-quality resampler to a 12,000 px long edge at 300 dpi; do not restyle, add or remove elements.',
  'hires-story-original':
    'This is the recovered Canva master story background (1088 × 1920) enlarged, not a regeneration. Upscale the exported Canva PNG with a high-quality resampler to a 12,000 px long edge at 300 dpi; do not restyle, add or remove elements.',
  'hires-email-original':
    'This is the recovered Canva master email background (840 × 426) enlarged, not a regeneration. Upscale the exported Canva PNG with a high-quality resampler to a 12,000 px long edge at 300 dpi; expect softness from the small source; do not restyle, add or remove elements.',
  'hires-wide-rebuild': backgroundPrompt(
    'High-detail AI rebuild of the Set 5 wide master: bright white ground, leather football with gold #FFD600 and cyan #00AAE7 trails on the left third, floodlight bloom and palm crowns at the top, clean right-side copy field — rebuilt with crisper leather grain, cleaner trail cores and finer sparks than the original. Render at maximum resolution, then upscale toward a 12,000 px long edge.',
    'wide'),
  'hires-portrait-rebuild': backgroundPrompt(
    'High-detail AI rebuild of the Set 5 portrait master: pale gradient ground, football sweeping bottom-left to top-right with gold and cyan trails, palms at the top corners, calm upper-left copy field — rebuilt with crisper detail than the original. Render at maximum resolution, then upscale toward a 12,000 px long edge.',
    'portrait'),
  'hires-story-rebuild': backgroundPrompt(
    'High-detail AI rebuild of the Set 5 story master: bright ground, football rising through the centre with vertical gold and cyan trails, open lower copy field — rebuilt with crisper detail than the original. Render at maximum resolution, then upscale toward a 12,000 px long edge.',
    'story'),
  'hires-email-rebuild': backgroundPrompt(
    'High-detail AI rebuild of the Set 5 email master: deep navy ground, gold and cyan streams crossing the frame, close-cropped football at the right edge, flat dark left half for headline text — rebuilt with crisper detail than the original. Render at maximum resolution, then upscale toward a 12,000 px long edge.',
    'email'),
};

const FULL_MESSAGE: Record<string, Record<string, string>> = {
  'std-en': { line: 'SAVE THE DATE', lang: 'English' },
  'std-es': { line: 'RESERVA LA FECHA', lang: 'Spanish' },
  'tix-en': { line: 'TICKETS ON SALE', lang: 'English' },
  'tix-es': { line: 'BOLETOS A LA VENTA', lang: 'Spanish' },
};

function fullDesignPrompt(id: string): string | null {
  const match = id.match(/^full-(board-1728x512|board-840x400|social)-(thirds-left-wide|thirds-right-wide|thirds-top-story)-(std|tix)-(en|es)$/);
  if (!match) return null;
  const [, surface, comp, msg, lang] = match;
  const message = FULL_MESSAGE[`${msg}-${lang}`];
  const size =
    surface === 'board-1728x512' ? '1728 × 512 px digital billboard' :
    surface === 'board-840x400' ? '840 × 400 px digital billboard' :
    comp === 'thirds-top-story' ? '1088 × 1920 px vertical story' : '1920 × 1088 px wide social post';
  const composition =
    comp === 'thirds-left-wide'
      ? 'the football with its gold and cyan light trails sits on the LEFT rule-of-thirds line and the right two-thirds carries the copy'
      : comp === 'thirds-right-wide'
        ? 'the football with its gold and cyan light trails sits on the RIGHT rule-of-thirds line and the left two-thirds carries the copy'
        : 'the football with its gold and cyan light trails sits on the TOP rule-of-thirds line and the lower two-thirds carries the stacked copy';
  return (
    `Finished ${size} design for the TransPerfect San Juan Bowl, in ${message.lang}. ` +
    `Background: the Set 5 rule-of-thirds cinematic night-game background where ${composition}. ` +
    `Foreground copy, all in Geist uppercase with tight tracking: the approved San Juan Bowl shield placed from the master logo files (never AI-redrawn; white-outline version on dark areas), the headline "${message.line}" in large white type, then "DECEMBER 16, 2026", "HIRAM BITHORN STADIUM · SAN JUAN, PR" and "SANJUANBOWL.COM" as smaller lines. ` +
    'Hierarchy: shield and headline dominate, date and venue secondary, URL smallest; all copy sits in the quiet copy field with generous margins and never overlaps the football or its trails. ' +
    `Output: flat RGB PNG at exactly ${size.split(' px')[0]} px, sharp type, no placeholder text, no team marks.`
  );
}

/** Full standalone creation prompt for any Set 5 gallery asset. */
export function set5CreationPrompt(asset: Pick<SjbSet5Asset, 'id' | 'title' | 'category'>): string {
  const full = fullDesignPrompt(asset.id);
  if (full) return `${SJB_SET5_PROMPT_DNA} ${full}`;
  const enlarged = asset.id.endsWith('-enlarged');
  const baseId = enlarged ? asset.id.slice(0, -'-enlarged'.length) : asset.id;
  const specific = SPECIFIC[baseId];
  const body = specific ?? `Recreate the Set 5 asset "${asset.title}" (${asset.category}) faithful to the shared design system.`;
  return `${SJB_SET5_PROMPT_DNA} ${body}${enlarged ? ENLARGED_NOTE : ''}`;
}
