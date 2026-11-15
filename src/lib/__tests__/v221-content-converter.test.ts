import { describe, expect, it } from 'vitest';
import { convertElementContent } from '../element-update/content-converter';
import { workingLayout } from '../element-update/registry';

describe('Step 1 non-destructive v221 conversion', () => {
  it('retains the original object and does not activate workingLayout routing', () => {
    const c={client:'Customer',challenge:{heading:'Challenge',body:'Real copy'},stats:[{value:'62',unit:'%',label:'Review cycles'}]};
    const before=structuredClone(c), r=convertElementContent('case-study',c);
    expect(c).toEqual(before);
    expect(workingLayout(c)).toBeUndefined();
    expect(r.status).toBe('clean');
    expect(r.layout?.modules.find(m=>m.type==='stats')?.data.items).toEqual([{value:'62%',caption:'Review cycles',delta:'',icon:''}]);
  });
  it('never restores suppressed story, quote or CTA copy', () => {
    const r=convertElementContent('case-study',{client:'Customer',hiddenSections:['story','quote','cta'],challenge:{body:'Hidden'},quote:{text:'Hidden'},cta:{label:'Hidden'}});
    expect(r.layout?.modules.map(m=>m.type)).toEqual(['hero']);
    expect(JSON.stringify(r.layout)).not.toContain('Hidden');
  });
  it('reports every native variant as a geometry gap rather than certifying exact parity', () => {
    const r=convertElementContent('case-study',{modules:[{kind:'hero',title:'Stored',variantId:'hero-photo-fade'}]});
    expect(r.status).toBe('partial');
    expect(r.issues).toContainEqual({path:'content.modules[0].variantId',construct:'native geometry variant: hero-photo-fade'});
  });
  it('fails absolute-position originals instead of substituting a narrative approximation', () => {
    const r=convertElementContent('case-study',{original:{pages:[{texts:[{text:'Original'}]}]}});
    expect(r.status).toBe('failed'); expect(r.layout).toBeNull();
    expect(r.issues[0]?.path).toBe('content.original');
  });
  it('excludes event and brand-kit records without reading authored text as scope', () => {
    for (const context of [{eventId:'next-london'},{brandKitId:'bowl'},{calendarId:'campaign'},{sourceLibrary:'social-calendar'}]) expect(convertElementContent('case-study',{},context).status).toBe('excluded');
    expect(convertElementContent('case-study',{client:'Next customer'}).status).toBe('clean');
  });
  it('keeps existing v221 stacks and elib references without rewriting IDs or example approvals', () => {
    const source={format:'story',modules:[{id:'retained',type:'hero',data:{title:'Stored',photo:{elib:'img/original.jpg'}}}]};
    const r=convertElementContent('case-study',{elementLayout:source});
    expect(r.layout).toEqual(source); expect(r.basis).toBe('existing_v221');
    expect(r.layout).not.toBe(source); expect(r.status).toBe('clean');
  });
  it('reports unknown modules, photo adjustments and custom sizes concretely', () => {
    const r=convertElementContent('case-study',{client:'Customer',heroMedia:{imageUrl:'https://example.org/image.jpg',adjust:{rotate:12}},modules:[{kind:'device',imageUrl:'https://example.org/screen.jpg'}]}, {pageSize:'Custom'});
    expect(r.status).toBe('partial');
    expect(r.issues.map(i=>i.path)).toEqual(expect.arrayContaining(['content.heroMedia.adjust','content.modules[0]','context.pageSize']));
  });
  it('preserves all native numerical strings without inventing or computing figures', () => {
    const r=convertElementContent('case-study',{stats:[{value:'$1.2',unit:'M',label:'Annualized savings'}]});
    expect(JSON.stringify(r.layout)).toContain('$1.2M');
    expect(JSON.stringify(r.layout)).not.toContain('3.4');
  });
});