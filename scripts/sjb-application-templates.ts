/** Fixed application-source generation. Run with bun; assets and outputs stay in /tmp. */
import fs from "node:fs";
import path from "node:path";
import pptxgen from "pptxgenjs";
import opentype from "opentype.js";
import { Document, Packer, Paragraph, TextRun, ImageRun, Header, Footer, PageNumber, HeadingLevel, AlignmentType } from "docx";
import { SJB_COLORS, SJB_EVENT } from "../src/lib/san-juan-bowl";

const out = "/tmp/sjb-applications";
const palette = Object.fromEntries(SJB_COLORS.map(c => [c.id, c.hex.slice(1)]));
const site = "SANJUANBOWL.COM";
const png = (mode: string) => fs.readFileSync(path.join(out, `logo-${mode}.png`));
const svg = (mode: string) => fs.readFileSync(path.join(out, `logo-${mode}.svg`), "utf8");
const layouts = ["cover", "section", "agenda", "text-image", "comparison", "timeline", "partners", "closing"];
const boldBytes = fs.readFileSync("public/fonts/Geist-Bold.ttf");
const boldFont = opentype.parse(boldBytes.buffer.slice(boldBytes.byteOffset, boldBytes.byteOffset + boldBytes.byteLength));
const manifests: Record<string, unknown>[] = [];

function image(s: pptxgen.Slide, mode: string, x: number, y: number, size: number) {
  s.addImage({ data: `image/png;base64,${png(mode).toString("base64")}`, x, y, w: size, h: size });
}
function text(s: pptxgen.Slide, value: string, x: number, y: number, w: number, h: number, size: number, color: string, bold = false) {
  s.addText(value, { x, y, w, h, fontFace: "Geist", fontSize: size, color, bold, margin: 0, breakLine: false, valign: "mid" });
}
function rect(s: pptxgen.Slide, x: number, y: number, w: number, h: number, fill: string) {
  s.addShape("rect", { x, y, w, h, fill: { color: fill }, line: { color: fill, transparency: 100 } });
}
async function deck(mode: "light" | "dark") {
  const p = new pptxgen(); p.layout = "LAYOUT_WIDE"; p.author = "TransPerfect Element"; p.title = `${SJB_EVENT.shortName} presentation kit · ${mode}`;
  const ink = mode === "dark" ? palette.white : palette.navy;
  const bg = mode === "dark" ? palette.navy : palette.white;
  for (const kind of layouts) {
    const s = p.addSlide(); s.background = { color: bg };
    image(s, mode === "dark" ? "dark" : "color", 0.55, 0.4, 1.0);
    text(s, site, 10.5, 6.95, 2.25, 0.25, 12, ink);
    text(s, SJB_EVENT.shortName.toUpperCase(), 1.8, 0.7, 6, 0.3, 14, ink, true);
    if (kind === "cover" || kind === "closing") {
      image(s, mode === "dark" ? "dark" : "color", 8.1, 1.6, 4.25);
      text(s, kind === "cover" ? SJB_EVENT.name : "[Closing headline]", 0.65, 2.0, 7.0, 1.9, 44, ink, true);
      text(s, `${SJB_EVENT.datesLabel}\n${SJB_EVENT.venue}\n${SJB_EVENT.city}`, 0.65, 4.2, 6.8, 1.25, 22, ink);
    } else if (kind === "section") {
      text(s, "[Section title]", 0.7, 2.45, 10.8, 1.0, 48, ink, true);
      text(s, "[Section introduction]", 0.7, 3.8, 10.8, 0.8, 26, ink);
    } else {
      text(s, ({agenda:"[Agenda title]", "text-image":"[Headline]",comparison:"[Comparison headline]",timeline:"[Timeline headline]",partners:"[Partner headline]"} as Record<string,string>)[kind] ?? "[Headline]", 0.65, 1.6, 11.9, 0.8, 38, ink, true);
      if (kind === "text-image") {
        text(s, "[Approved body copy]\n\n[Supporting detail]", 0.7, 2.9, 5.6, 2.6, 26, ink);
        rect(s, 7.0, 2.8, 5.5, 3.5, palette.sky);
        text(s, "[Approved image]", 7.45, 4.1, 4.6, 0.6, 24, palette.navy, true);
      } else {
        const count = kind === "comparison" ? 2 : kind === "partners" ? 3 : 4;
        const w = (11.9 - (count - 1) * 0.3) / count;
        for (let i = 0; i < count; i++) {
          const x = 0.7 + i * (w + 0.3);
          rect(s, x, 2.9, w, 0.12, i % 2 ? palette.sky : palette.gold);
          text(s, kind === "partners" ? "[Partner logo]" : `[${kind === "timeline" ? "Milestone" : "Item"} ${i+1}]`, x, 3.35, w, 0.8, 24, ink, true);
          text(s, "[Approved detail]", x, 4.4, w, 1.3, 22, ink);
        }
      }
    }
    s.addNotes("Editable template. Replace bracketed fields with approved content. Supplied logo is unchanged. No invented outcomes or sponsor claims. Geist must be installed.");
  }
  const name = `presentation-${mode}.pptx`; await p.writeFile({ fileName: path.join(out,name) });
  manifests.push({ id:`presentation-${mode}`, family:"presentation", surface:"documents", title:`Presentation kit · ${mode}`, size:"16:9 · 13⅓ × 7½ in", width:1920, height:1080, source:name, pages:8, format:"PowerPoint", mode });
}

async function doc(kind: string, paper: "letter"|"a4") {
  const width = paper === "letter" ? 12240 : 11906, height = paper === "letter" ? 15840 : 16838;
  const para = (value:string, heading = false) => new Paragraph({ ...(heading ? { heading:HeadingLevel.HEADING_1 } : {}), spacing:{ after:180 }, children:[new TextRun(value)] });
  const children: Paragraph[] = [];
  if (kind === "letterhead") children.push(para("[Recipient / organisation]"),para("[Date]"),para("[Subject]",true),para("[Approved correspondence]"),para("[Name and role]"));
  if (kind === "fact-sheet") children.push(para(SJB_EVENT.name,true),...Object.values({date:SJB_EVENT.datesLabel,venue:SJB_EVENT.venue,city:SJB_EVENT.city,kickoff:SJB_EVENT.kickoffLabel,matchup:SJB_EVENT.matchupLabel}).map(v=>para(v)),para("[Approved event overview]",true),para("[Additional confirmed information]"),para("[Approved contact information]"));
  if (kind === "report") children.push(para("[Report title]",true),para(SJB_EVENT.name),para("[Author / department]"),new Paragraph({pageBreakBefore:true,heading:HeadingLevel.HEADING_1,children:[new TextRun("[Section title]")]}),para("[Approved summary]"),para("[Key findings]",true),para("[Sourced findings and citations]"),para("[Next steps]",true),para("[Approved actions]"));
  const d = new Document({title:`${SJB_EVENT.shortName} ${kind}`, creator:"TransPerfect Element", styles:{default:{document:{run:{font:"Geist",size:24,color:"000000"},paragraph:{spacing:{line:336}}}},paragraphStyles:[{id:"Heading1",name:"Heading 1",basedOn:"Normal",next:"Normal",quickFormat:true,run:{font:"Geist",bold:true,size:36,color:"000000"},paragraph:{spacing:{before:240,after:180},outlineLevel:0}}]},sections:[{properties:{page:{size:{width,height},margin:{top:1700,bottom:1440,left:1440,right:1440}}},headers:{default:new Header({children:[new Paragraph({children:[new ImageRun({type:"png",data:png("color"),transformation:{width:88,height:88},altText:{title:"Supplied Bowl logo",description:"Unchanged full-colour logo",name:"Bowl logo"}})]})]})},footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.RIGHT,children:[new TextRun({text:site,font:"Geist",size:18,color:"000000"}),new TextRun("  |  "),new TextRun({children:[PageNumber.CURRENT]})]})]})},children}]});
  const name = `${kind}-${paper}.docx`;fs.writeFileSync(path.join(out,name),await Packer.toBuffer(d));
  manifests.push({id:`${kind}-${paper}`,family:kind,surface:"documents",title:kind==="letterhead"?"Letterhead":kind==="report"?"Report":"Event fact sheet",size:paper==="letter"?"US Letter · 8½ × 11 in":"A4 · 210 × 297 mm",width:paper==="letter"?816:794,height:paper==="letter"?1056:1123,source:name,pages:kind==="report"?2:1,format:"Word",mode:"light"});
}

function sourceSvg(id:string, family:string, title:string, w:number,h:number,size:string,mode="dark", motion=false) {
  const light=mode==="light", bg=light?palette.white:palette.navy,ink=light?palette.navy:palette.white;
  const badge=svg(light?"color":"dark").replace(/<\?xml[^>]*>/g,"").replace(/<svg\b/,`<svg x="0" y="0" width="100%" height="100%"`);
  const min=Math.min(w,h), landscape=w>h, logo=min*(family==="lower-third"?0.13:family==="pull-up"?0.48:0.32), margin=min*.08;
  const isLower=family==="lower-third";
  const logoX=isLower?margin:landscape?w-logo-margin:(w-logo)/2,logoY=isLower?h*.77:margin;
  const tx=margin,ty=isLower?h*.82:landscape?h*.39:logoY+logo+min*.12;
  const subSize=min*(isLower?.026:family==="pull-up"?.046:.034);
  const heading=family==="holding"?"WELCOME":family==="directional"?"[DESTINATION]":family==="opening"?"SAN JUAN BOWL":family==="closing"?"[CLOSING HEADLINE]":isLower?"[SPEAKER NAME]":"[HEADLINE]";
  const contentWidth=landscape&&!isLower?w-logo-3*margin:w-2*margin;
  const titleSize=Math.min(min*(isLower?.045:family==="pull-up"?.12:.09),contentWidth/boldFont.getAdvanceWidth(heading,1));
  const body=isLower?"[Role / organisation]":family==="holding"?SJB_EVENT.datesLabel:family==="opening"?SJB_EVENT.datesLabel:"[Approved supporting information]";
  const textX=isLower?margin+logo+min*.04:tx;
  const physical:Record<string,[string,string]>={"poster-18x24":["18in","24in"],"poster-a3":["297mm","420mm"],"directional-24x18":["24in","18in"],"tabletop-5x7":["5in","7in"],"tabletop-a5":["148mm","210mm"],"pull-up-33x80":["33in","80in"]};
  const dims=physical[id]??[String(w),String(h)];
  const clean=`<svg xmlns="http://www.w3.org/2000/svg" width="${dims[0]}" height="${dims[1]}" viewBox="0 0 ${w} ${h}"><title>${title}</title><g id="background">${isLower?`<rect y="${h*.74}" width="${w}" height="${h*.26}" fill="#${bg}"/>`:`<rect width="${w}" height="${h}" fill="#${bg}"/>`}<path d="M ${w*.73} ${h} L ${w} ${h*.57} L ${w} ${h} Z" fill="#${palette.sky}"/><path d="M ${w*.83} ${h} L ${w} ${h*.74} L ${w} ${h} Z" fill="#${palette.gold}"/></g><g id="supplied-logo" transform="translate(${logoX} ${logoY})"><svg width="${logo}" height="${logo}" viewBox="0 0 1254 1254">${badge.replace(/^.*?<svg[^>]*>/s,"").replace(/<\/svg>\s*$/,"")}</svg></g><g id="editable-copy" font-family="Geist"><text x="${textX}" y="${ty}" fill="#${ink}" font-size="${titleSize}" font-weight="700">${heading}</text><text x="${textX}" y="${ty+titleSize*.8}" fill="#${ink}" font-size="${subSize}">${body}</text>${family==="directional"?`<path id="editable-arrow" d="M ${margin} ${h*.7} h ${min*.27} m ${-min*.09} ${-min*.09} l ${min*.09} ${min*.09} l ${-min*.09} ${min*.09}" fill="none" stroke="#${ink}" stroke-width="${min*.018}"/>`:""}<text x="${textX}" y="${isLower?h*.965:h-margin*.7}" fill="#${ink}" font-size="${min*.027}" font-weight="700">${site}</text></g></svg>`;
  fs.writeFileSync(path.join(out,`${id}.svg`),clean);
  const guide=clean.replace(/<\/svg>\s*$/,`<g id="guides-remove-before-output" fill="none" stroke="#${palette.gold}" stroke-width="${min*.002}" stroke-dasharray="${min*.01}"><rect x="${w*.05}" y="${h*.05}" width="${w*.9}" height="${h*.9}"/><rect x="${w*.1}" y="${h*.1}" width="${w*.8}" height="${h*.8}"/></g></svg>`);
  fs.writeFileSync(path.join(out,`${id}-guides.svg`),guide);
  fs.writeFileSync(path.join(out,`${id}-handoff.txt`),`${title}\n${size}\nEditable RGB artwork, not print-approved. Supplied vector logo unchanged. Install Geist before editing.\n${motion?"5% action and 10% title safe overlays are optional defaults; confirm broadcaster/display requirements. Guides are separate and must not appear in final output. Target 30 fps; confirm delivery codec and alpha support.":"Proposed trim size only. Confirm final dimensions, hardware, mounting, substrate, bleed, safe zone and cut paths with supplier. Default sheet bleed suggestion: 3 mm; not a supplier approval. No CMYK conversion or PDF/X certification. Body copy must be 100K in vendor output."}\nReplace bracketed fields with approved text. No invented venue/sign destinations.\n`);
  manifests.push({id,family,surface:motion?"motion":"signage",title,size,width:w,height:h,source:`${id}.svg`,pages:1,format:"Layered SVG",mode,contentWidth});
}

async function avDeck(mode:"light"|"dark", portrait=false) {
  const p=new pptxgen();p.defineLayout({name:"AV",width:portrait?7.5:13.333333,height:portrait?13.333333:7.5});p.layout="AV";
  const w=portrait?7.5:13.333333,h=portrait?13.333333:7.5,bg=mode==="dark"?palette.navy:palette.white,ink=mode==="dark"?palette.white:palette.navy;
  for(const kind of ["opening","holding","speaker","closing"]) {
    const s=p.addSlide();s.background={color:bg};
    const m=.55,ls=portrait?2.6:2.3;image(s,mode==="dark"?"dark":"color",portrait?(w-ls)/2:w-ls-m,m,ls);
    const top=portrait?4.5:2.7,tw=portrait?w-1.1:9;
    text(s,kind==="opening"?"SAN JUAN BOWL":kind==="holding"?"WELCOME":kind==="speaker"?"[Speaker name]":"[Closing headline]",m,top,tw,1.15,portrait?30:42,ink,true);
    text(s,kind==="speaker"?"[Role / organisation]":SJB_EVENT.datesLabel,m,top+1.4,tw,.65,24,ink);
    text(s,site,m,h-.6,w-1.1,.25,14,ink,true);
    s.addNotes("Opening/closing and holding source. All objects editable. Suggested 5-second frames with fade in Canva; timing, alpha, frame rate and codec must be checked against AV supplier requirements. This PPTX is a static source, not a rendered motion file.");
  }
  const id=`av-sequence-${portrait?"portrait":"hd"}-${mode}`,name=id+".pptx";await p.writeFile({fileName:path.join(out,name)});
  manifests.push({id,family:portrait?"portrait-sequence":"av-sequence",surface:"motion",title:portrait?"Portrait screen kit":"AV screen & sequence kit",size:portrait?"9:16 · 1080 × 1920":"16:9 · 1920 × 1080",width:portrait?1080:1920,height:portrait?1920:1080,source:name,pages:4,format:"PowerPoint",mode});
}

await deck("light"); await deck("dark");
for(const mode of ["light","dark"] as const) {await avDeck(mode);await avDeck(mode,true);}
for(const paper of ["letter","a4"] as const) for(const kind of ["letterhead","fact-sheet","report"]) await doc(kind,paper);
for(const [id,family,title,w,h,size] of [
 ["poster-18x24","poster","Poster",1728,2304,"18 × 24 in"], ["poster-a3","poster","Poster",1123,1587,"A3 · 297 × 420 mm"],
 ["directional-24x18","directional","Directional sign",2304,1728,"24 × 18 in"],
 ["tabletop-5x7","tabletop","Tabletop sign",480,672,"5 × 7 in"],["tabletop-a5","tabletop","Tabletop sign",559,794,"A5 · 148 × 210 mm"],
 ["pull-up-33x80","pull-up","Pull-up banner",1584,3840,"Proposed 33 × 80 in"],
 ["backlit-artwork","backlit","Backlit artwork",1920,1080,"Proportional 16:9 · supplier size required"],["vinyl-artwork","vinyl","Vinyl artwork",1080,1080,"Proportional 1:1 · supplier size required"],
] as const) sourceSvg(id,family,title,w,h,size);
for(const mode of ["light","dark"]) {
 for(const [id,family,title,w,h,size] of [
 ["holding-hd","holding","Holding screen",1920,1080,"Full HD · 1920 × 1080"],["holding-4k","holding","Holding screen",3840,2160,"UHD · 3840 × 2160"],
 ["speaker-hd","lower-third","Speaker lower third",1920,1080,"Full HD · 1920 × 1080 · transparent ground"],
 ["opening-hd","opening","Opening frame",1920,1080,"Full HD · 1920 × 1080"],["closing-hd","closing","Closing frame",1920,1080,"Full HD · 1920 × 1080"],
 ["opening-portrait","opening","Portrait opening",1080,1920,"Portrait · 1080 × 1920"],["closing-portrait","closing","Portrait closing",1080,1920,"Portrait · 1080 × 1920"],
 ] as const) sourceSvg(`${id}-${mode}`,family,title,w,h,size,mode,true);
}
fs.writeFileSync(path.join(out,"manifest.json"),JSON.stringify(manifests,null,2));
console.log(`Created ${manifests.length} editable application sources`);