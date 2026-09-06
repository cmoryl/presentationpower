// Side-effect barrel: importing this file guarantees every module family has
// registered itself with the module registry. `VariantRenderer` pulls the
// families in directly (it renders them), but registry CONSUMERS — the
// per-division conformance presets, audits and admin panels — only need the
// registrations, not the renderer, so they import this instead.

import "./viz";
import "./timeline";
import "./process";
import "./bento";
import "./quote";
import "./logos";
import "./close";
import "./stat";
import "./graph";
import "./opening";
import "./dashboard";
import "./image";
import "./info";
import "./narrative";
import "./team";
import "./business";
import "./advanced";
import "./editorial";
import "./locations";
import "./growth-orbits";
import "./certifications";
import "./showcase-cards";

export {};
