import rules from './conversion-rules.json';
import { record, string, records, SOURCE_MODULES, SOURCE_SUBMODULES, type SourceLayout, type SourceModule } from './registry';

export interface ConversionIssue { path: string; construct: string }
export interface ConversionResult { version: string; status: 'clean' | 'partial' | 'failed' | 'excluded'; layout: SourceLayout | null; issues: ConversionIssue[]; basis: string }
export const CONVERTER_VERSION = 'v221-content-1';
export const CONVERSION_RULES = rules as Record<string, unknown>;
const nonempty = (v: unknown): boolean => v !== null && v !== undefined && v !== '' && (Array.isArray(v) ? v.some(nonempty) : typeof v === 'object' ? Object.values(record(v)).some(nonempty) : true);
/** The same declarative mapping is evaluated by the database migration. No defaults/example copy. */
export function evaluateConversionRule(rule: unknown, input: unknown): unknown {
  const d = record(input);
  if (typeof rule === 'string') return rule.startsWith('$') ? d[rule.slice(1)] ?? '' : rule;
  if (Array.isArray(rule)) return rule.map(v => evaluateConversionRule(v, d));
  if (!rule || typeof rule !== 'object') return rule;
  const r = record(rule);
  if (r.each) return records(d[string(r.each)]).map(v => evaluateConversionRule(r.map, v));
  if (r.joinPath) return (Array.isArray(d[string(r.joinPath)]) ? d[string(r.joinPath)] as unknown[] : []).map(string).filter(Boolean).join(string(r.separator));
  if (Array.isArray(r.join)) return r.join.map(v => evaluateConversionRule(v, d)).map(string).filter(Boolean).join(string(r.separator));
  return Object.fromEntries(Object.entries(r).map(([k,v]) => [k,evaluateConversionRule(v,d)]));
}

export function convertElementContent(kind: string, content: unknown, context: unknown = {}): ConversionResult {
  const c = record(content), ctx = record(context), issues: ConversionIssue[] = [];
  const issue = (path: string, construct: string) => { if (!issues.some(i => i.path === path && i.construct === construct)) issues.push({path,construct}); };
  const done = (layout: SourceLayout | null, basis: string, excluded = false): ConversionResult => ({version:CONVERTER_VERSION,status:excluded ? 'excluded' : !layout ? 'failed' : issues.length ? 'partial' : 'clean',layout,issues,basis});
  // Explicit scope markers, not substring matching on authored text or a client name.
  if (['eventId','event','eventKey','kitId','brandKitId','calendarId'].some(k => nonempty(ctx[k])) || /^(san-juan-bowl|sjb|next|event|brand-kit|social-calendar)(-|$)/i.test(string(ctx.sourceLibrary))) return done(null,'out_of_scope',true);
  if (!['case-study','spotlight','ebrochure','adaptor-brief','msa-partnership','solution-proposal'].includes(kind)) { issue('kind','unsupported material kind'); return done(null,'native'); }
  const source = record(c.elementLayout ?? c.sourceLayout);
  if (Array.isArray(source.modules)) {
    const validate = (mods: unknown[], prefix: string, sub = false) => mods.forEach((v,i) => { const m=record(v), type=string(m.type ?? m.kind), defs=sub ? SOURCE_SUBMODULES : SOURCE_MODULES;
      if (!defs[type]) issue(`${prefix}[${i}].type`,`unknown v221 ${sub?'submodule':'module'}: ${type}`);
      if (type==='row') validate(records(record(m.data).slots).filter(nonempty),`${prefix}[${i}].data.slots`,true);
    });
    validate(source.modules,'source.modules');
    return done(structuredClone(source) as SourceLayout,'existing_v221');
  }
  if (nonempty(c.original)) { issue('content.original','absolute-position text/runs, vector shapes and image geometry have no module-stack mapping'); return done(null,'original_geometry'); }
  if (nonempty(c.pages)) { issue('content.pages','multi-page proposal page kinds and positioned content are not mapped'); return done(null,'native'); }
  const mods: SourceModule[] = [], hidden = new Set((Array.isArray(c.hiddenSections) ? c.hiddenSections : []).map(string));
  const emit = (type: string, data: Record<string, unknown>, path: string) => { if (nonempty(data)) mods.push({id:`converted-${mods.length}`,type,data}); };
  const mapped = (key: string, data: unknown, path: string) => {
    const rule = CONVERSION_RULES[key];
    if (!rule) { issue(path,`unsupported native module: ${key}`); return; }
    const m=record(evaluateConversionRule(rule,data)); emit(string(m.type),record(m.data),path);
  };
  const media=record(c.heroMedia);
  if (!hidden.has('masthead')) {
    emit('hero',{title:kind==='case-study'?string(c.summary || c.title || c.client):string(c.title || c.productName || c.partner),lead:kind==='case-study'?[c.industry,c.audience].map(string).filter(Boolean).join(' · '):[c.tagline,c.summary].map(string).filter(Boolean).join('\n'),eyebrow:string(c.eyebrow),photo:hidden.has('hero')?null:media.imageUrl ?? null,layout:!hidden.has('hero') && media.imageUrl?'full':'text'},'content.hero');
  }
  const narrative = (items: unknown[], path: string) => mapped('narrative',{items},path);
  if (!hidden.has('story') && kind==='case-study') narrative([c.challenge,c.solution,c.result].filter(nonempty),'content.story');
  if (!hidden.has('sections') && kind==='ebrochure') narrative(Array.isArray(c.sections)?c.sections:[],'content.sections');
  if (!hidden.has('capabilities') && kind==='spotlight') emit('capabilities',{items:records(c.capabilities).map(v=>({title:string(v.heading),text:string(v.body)}))},'content.capabilities');
  if (!hidden.has('features') && kind==='adaptor-brief') mapped('feature-list',{items:c.features},'content.features');
  if (!hidden.has('knowHow') && kind==='adaptor-brief') emit('checklist',{items:(Array.isArray(c.knowHow)?c.knowHow:[]).map(string).join('\n')},'content.knowHow');
  if (!hidden.has('stats')) mapped('stats',{items:c.stats},'content.stats');
  if (!hidden.has('quote')) mapped('quote',c.quote,'content.quote');
  if (!hidden.has('engagement')) { const e=record(c.engagement); emit('checklist',{title:string(e.title),items:(Array.isArray(e.bullets)?e.bullets:[]).map(string).join('\n')},'content.engagement'); }
  if (!hidden.has('discover')) { const d=record(c.discover); narrative(nonempty(d)?[{heading:'',body:d.body,bullets:d.bullets}]:[],'content.discover'); }
  if (!hidden.has('expert') && nonempty(c.expert)) mapped('contact',c.expert,'content.expert');
  for (const [i,m] of records(c.modules).entries()) {
    if (hidden.has(string(m.id))) continue;
    mapped(string(m.kind),m,`content.modules[${i}]`);
    for (const k of ['variantId','sectionLayoutId','rule','titleType','adjust','meta','stats','quote','partner','partnerLogoUrl','orgLogoUrl','heightPct','rows','path','deviceTone']) if (nonempty(m[k])) issue(`content.modules[${i}].${k}`,k==='variantId' ? `native geometry variant: ${string(m[k])}` : `native module ${k} not preserved by mapping`);
    if (m.kind==='table') issue(`content.modules[${i}]`,'table converted to labelled rows, not equivalent table semantics');
    if (m.kind==='logo-grid' && records(m.items).some(v=>v.path)) issue(`content.modules[${i}].items.path`,'private storage logo paths require signed-image resolution');
  }
  if (!hidden.has('cta')) { const a=record(c.cta); emit('cta',{title:string(a.label),sub:string(a.subhead),button:string(a.buttonLabel),link:string(a.url)},'content.cta'); }
  if (!hidden.has('footer')) emit('footer',{extra:(Array.isArray(record(c.footer).links)?record(c.footer).links as unknown[]:[]).map(string).join('\n')},'content.footer');
  const handled = new Set(['title','client','summary','eyebrow','industry','audience','tagline','productName','challenge','solution','result','sections','capabilities','features','knowHow','stats','quote','engagement','discover','expert','modules','cta','footer','hiddenSections','heroMedia']);
  for (const [k,v] of Object.entries(c)) if (!handled.has(k) && nonempty(v)) issue(`content.${k}`,'unmapped native construct');
  if (!hidden.has('hero')) for (const [k,v] of Object.entries(media)) if (k!=='imageUrl' && nonempty(v)) issue(`content.heroMedia.${k}`,'native photo crop/treatment not mapped');
  if (!hidden.has('hero') && string(media.imageUrl).includes('/object/sign/')) issue('content.heroMedia.imageUrl','stored expiring signed URL requires durable private-image resolution');
  for (const [k,v] of Object.entries(ctx)) if (nonempty(v) && !['pageSize','sourceLibrary','libraryItemId','sourceSlug','sourceFile','collection','divisionId','siblingDeckId','createdBy','distribution','starterTemplateId','blankStart','importReview','contactCard','exportPrefs'].includes(k)) issue(`context.${k}`,'native editor/layout setting not mapped');
  const pref=record(ctx.exportPrefs), size=string(pref.size || ctx.pageSize || 'Letter');
  const formats: Record<string,string>={A4:'a4',Letter:'letter',Square:'square'};
  if (!formats[size]) issue('context.pageSize',`unsupported native format: ${size}`);
  if (['msa-partnership','solution-proposal'].includes(kind)) issue('content',`${kind} dedicated structure not mapped`);
  return done(mods.length ? {format:formats[size] || 'letter',modules:mods} : null,'native');
}