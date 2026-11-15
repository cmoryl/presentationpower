import { forwardRef } from "react";
import { AlertTriangle, Check, Quote } from "lucide-react";
import { SOURCE_MODULES, UNPORTED_MODULES, record, records, string, sourceImage, type SourceModule } from "@/lib/element-update/registry";

export interface SourceModulePreviewProps { module: SourceModule; className?: string }
const words = (value: unknown) => string(value).split("\n").filter(Boolean);
export const SourceModulePreview = forwardRef<HTMLElement, SourceModulePreviewProps>(function SourceModulePreviewImpl({ module, className = "" }, ref) {
  const d = module.data; const type = module.type; const items = records(d.items); const definition = SOURCE_MODULES[type];
  const title = string(d.title); const image = sourceImage(d.photo); const layout = string(d.layout ?? d.variant);
  const heading = <>{d.eyebrow ? <p className="source-eyebrow">{string(d.eyebrow)}</p> : null}{title && <h2>{title}</h2>}{d.intro ? <p>{string(d.intro)}</p> : null}</>;
  let body;
  if (UNPORTED_MODULES.has(type) || !definition) body = <div className="source-unported"><AlertTriangle size={22} /><strong>{definition?.name ?? type}</strong><p>Source controls preserved · layout not yet ported</p></div>;
  else if (type === "hero" || type === "cover") body = <div className={`source-hero source-hero-${layout || "text"} source-align-${string(d.align)} source-valign-${string(d.valign)}`}>
    {image && <img className="source-hero-photo" src={image} alt="" style={{ objectPosition: `${Number(record(d.photo).fx ?? 50)}% ${Number(record(d.photo).fy ?? 50)}%` }} />}
    {!image && record(d.photo).elib ? <div className="source-missing">Missing source photograph</div> : null}
    <div className="source-hero-copy">{sourceImage(d.logo) && <img className="source-client-logo" src={sourceImage(d.logo)} alt="Client logo" />}{heading}{d.lead || d.sub ? <p>{string(d.lead ?? d.sub)}</p> : null}{d.meta ? <p className="source-eyebrow">{string(d.meta)}</p> : null}{d.chip ? <strong className="source-value">{string(d.chip)}<small>{string(d.chipSub)}</small></strong> : null}</div></div>;
  else if (type === "row") body = <div className={`source-grid source-cols-${string(d.layout).split("-").length === 2 ? "2" : string(d.layout)}`}>{records(d.slots).map((slot, i) => slot.type ? <SourceModulePreview key={i} module={{ type: string(slot.type), data: record(slot.data) }} /> : <div key={i} className="source-empty-slot">Empty slot</div>)}</div>;
  else if (["kpis", "stats", "numbersGrid", "quoteStats", "kpiTrend"].includes(type)) body = <>{heading}<div className={`source-grid source-stats source-style-${layout}`}>{items.map((item, i) => <div key={i} className="source-stat"><strong className="source-value">{string(item.value)}</strong><p>{string(item.caption ?? item.label)}</p>{item.trend ? <small>{string(item.trend)}</small> : null}</div>)}</div>{d.quote && <blockquote>{string(d.quote)}<cite>{string(d.attribution)}</cite></blockquote>}</>;
  else if (type === "bigMetric") body = <>{heading}<strong className="source-value source-value-big">{string(d.value)}</strong><p>{string(d.caption)}</p><div className="source-grid">{items.map((item, i) => <div key={i}><strong>{string(item.value)}</strong><p>{string(item.label ?? item.caption)}</p></div>)}</div></>;
  else if (type === "quote") body = <blockquote><Quote size={24} /><p>{string(d.quote ?? d.text)}</p><cite>{string(d.attribution ?? d.author)}</cite>{d.sideText ? <p>{string(d.sideText)}</p> : null}</blockquote>;
  else if (type === "cta") body = <div className={`source-cta ${d.fill === "navy" ? "source-cta-dark" : ""}`}>{heading}<p>{string(d.sub)}</p>{d.button ? <span className="source-cta-label">{string(d.button)}</span> : null}</div>;
  else if (type === "footer") body = <footer className="source-footer"><span>{string(d.url)}</span><span>{string(d.email)}</span></footer>;
  else if (type === "divider") body = <div className={`source-divider source-align-${layout === "centered" ? "center" : "left"}`}><span className="source-value">{string(d.num)}</span>{heading}<p>{string(d.sub)}</p></div>;
  else if (type === "checklist") body = <>{heading}<ul className="source-checklist">{words(d.items).map((line, i) => <li key={i}><Check size={17} /><span>{line}</span></li>)}</ul></>;
  else if (type === "comparison") body = <>{heading}<table><thead><tr><th>{string(d.rowLabel)}</th><th>{string(d.colA)}</th><th>{string(d.colB)}</th></tr></thead><tbody>{records(d.rows).map((r,i) => <tr key={i}><th>{string(r.label)}</th><td>{string(r.a)}</td><td>{string(r.b)}</td></tr>)}</tbody></table></>;
  else if (type === "dataChart") {
    const values = items.map(item => Number(item.value)); const max = Math.max(1, ...values.filter(Number.isFinite));
    body = <>{heading}<div className="source-chart">{items.map((item, i) => <div key={i} className="source-chart-row"><span>{string(item.label)}</span><div><div className="source-chart-bar" style={{ width: `${Math.max(0, (values[i] ?? 0) / max * 100)}%` }} /></div><strong>{string(item.value)}{string(d.unit)}</strong></div>)}</div><p className="source-note">{string(d.note)}</p>{d.kind !== "bar" ? <p className="source-note">{string(d.kind)} geometry pending · values shown as bars</p> : null}</>;
  } else if (type === "hub") body = <>{heading}<div className="source-grid source-cols-2">{["left", "right"].map(side => <div key={side} className="source-item"><h3>{string(d[`${side}Title`])}</h3>{words(d[side]).map((line,i) => <p key={i}>{line}</p>)}</div>)}</div></>;
  else if (type === "logoWall") body = <>{heading}<div className="source-grid">{records(d.logos ?? d.items).map((item, i) => sourceImage(item) ? <img className="source-client-logo" key={i} src={sourceImage(item)} alt={string(item.name)} /> : <p key={i}>Missing supplied logo</p>)}</div></>;
  else if (type === "pagebreak") body = null;
  else body = <>{heading}<div className={`source-grid source-type-${type} source-layout-${layout}`}>{items.map((item, i) => <div key={i} className={`source-item ${type === "tiers" && Number(d.featured) === i + 1 ? "source-featured" : ""}`}>
    {sourceImage(item.photo) && <img className="source-item-photo" src={sourceImage(item.photo)} alt="" />}
    {type === "agenda" || type === "stages" || type === "timeline" || type === "pipeline" ? <span className="source-step">{string(item.time ?? item.label) || String(i + 1).padStart(2, "0")}</span> : null}
    {item.value ? <strong className="source-value">{string(item.value)}</strong> : null}
    <h3>{string(item.heading ?? item.title ?? item.name ?? item.verb ?? item.label)}</h3><p>{string(item.text ?? item.body ?? item.line ?? item.quote ?? item.points)}</p>
    {item.role || item.attribution ? <small>{string(item.role ?? item.attribution)}</small> : null}
    {words(item.bullets ?? item.features).length > 0 && <ul>{words(item.bullets ?? item.features).map((line,j) => <li key={j}>{line}</li>)}</ul>}
    {item.cta ? <span className="source-cta-label">{string(item.cta)}</span> : null}
  </div>)}</div>{d.note ? <p className="source-note">{string(d.note)}</p> : null}</>;
  return <section ref={ref} data-source-module={type} className={`source-module ${className}`}>{body}</section>;
});