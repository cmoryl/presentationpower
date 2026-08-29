import { autoFixQa } from "@/lib/qa-autofix";
import { runQa } from "@/lib/qa";
const slide: any = { id:"s1", position:0, mode:"dark", variantId:"MV-CTX-TREND", layoutId:"LF-02", content:{ title:"Trend", items:[{label:"a",value:"1",body:"x"},{label:"b",value:"2",body:"y"}] } };
console.log("before", runQa([slide], "bm-enterprise"));
const r = autoFixQa([slide], { brandModeId: "bm-enterprise" });
console.log("fixes", r.fixes.map(f=>f.kind+": "+f.detail));
console.log("after", runQa(r.slides, "bm-enterprise"));
