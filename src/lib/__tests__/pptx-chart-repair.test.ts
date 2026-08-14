import { describe, expect, it } from "vitest";
import { repairChartXml } from "../pptx-chart-repair";

const space = (body: string) =>
  `<?xml version="1.0"?><c:chartSpace xmlns:c="c" xmlns:a="a"><c:chart><c:plotArea>${body}</c:plotArea></c:chart></c:chartSpace>`;

const CAT_VAL =
  '<c:catAx><c:axId val="1"/><c:auto val="1"/></c:catAx><c:valAx><c:axId val="2"/><c:auto val="1"/><c:lblAlgn val="ctr"/></c:valAx>';

describe("repairChartXml", () => {
  it("leaves non-chart XML untouched", () => {
    expect(repairChartXml("<p:sld/>")).toBe("<p:sld/>");
  });

  it("trims surplus axIds and strips cat-axis-only elements from valAx", () => {
    const xml = space(
      '<c:barChart><c:barDir val="col"/><c:ser><c:idx val="0"/></c:ser><c:axId val="1"/><c:axId val="2"/><c:axId val="3"/></c:barChart>' +
        CAT_VAL,
    );
    const out = repairChartXml(xml);
    const bar = /<c:barChart>([\s\S]*?)<\/c:barChart>/.exec(out)![1];
    expect((bar.match(/<c:axId/g) ?? []).length).toBe(2);
    const val = /<c:valAx>([\s\S]*?)<\/c:valAx>/.exec(out)![1];
    expect(val).not.toContain("c:auto");
    expect(val).not.toContain("c:lblAlgn");
    // the category axis keeps its own auto
    expect(/<c:catAx>([\s\S]*?)<\/c:catAx>/.exec(out)![1]).toContain("c:auto");
  });

  it("adds grouping to a lineChart and keeps it before the first series", () => {
    const out = repairChartXml(
      space('<c:lineChart><c:ser><c:idx val="0"/></c:ser><c:axId val="1"/></c:lineChart>' + CAT_VAL),
    );
    expect(out).toContain('<c:grouping val="standard"/>');
    expect(out.indexOf("<c:grouping")).toBeLessThan(out.indexOf("<c:ser>"));
  });

  it("re-sequences series children into schema order (dLbls before cat/val)", () => {
    const ser =
      '<c:ser><c:idx val="1"/><c:order val="1"/><c:cat><c:strRef><c:f>A</c:f></c:strRef></c:cat><c:val><c:numRef><c:f>B</c:f></c:numRef></c:val><c:dLbls><c:showVal val="0"/></c:dLbls><c:marker><c:symbol val="circle"/></c:marker></c:ser>';
    const out = repairChartXml(space(`<c:lineChart><c:grouping val="standard"/>${ser}<c:axId val="1"/></c:lineChart>` + CAT_VAL));
    const body = /<c:ser>([\s\S]*?)<\/c:ser>/.exec(out)![1];
    expect(body.indexOf("<c:marker")).toBeLessThan(body.indexOf("<c:dLbls"));
    expect(body.indexOf("<c:dLbls")).toBeLessThan(body.indexOf("<c:cat"));
    expect(body.indexOf("<c:cat")).toBeLessThan(body.indexOf("<c:val"));
    // no content lost
    expect(body).toContain("<c:f>A</c:f>");
    expect(body).toContain("<c:f>B</c:f>");
  });

  it("replaces an illegal line width with a 1pt hairline", () => {
    const out = repairChartXml(
      space('<c:barChart><c:ser><c:spPr><a:ln w="3.996568951241272e+28" cap="flat"/></c:spPr></c:ser></c:barChart>'),
    );
    expect(out).toContain('<a:ln w="12700" cap="flat"/>');
  });

  it("keeps legal line widths exactly as authored", () => {
    const xml = space('<c:barChart><c:ser><c:spPr><a:ln w="25400"/></c:spPr></c:ser></c:barChart>');
    expect(repairChartXml(xml)).toContain('<a:ln w="25400"/>');
  });

  it("is idempotent", () => {
    const xml = space(
      '<c:lineChart><c:ser><c:idx val="0"/><c:val><c:numRef><c:f>B</c:f></c:numRef></c:val><c:dLbls/></c:ser><c:axId val="1"/><c:axId val="2"/><c:axId val="3"/></c:lineChart>' +
        CAT_VAL,
    );
    const once = repairChartXml(xml);
    expect(repairChartXml(once)).toBe(once);
  });
});
