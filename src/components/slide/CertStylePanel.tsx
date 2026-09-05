// Editor controls for the credential proof split module: layout and styling
// knobs plus full structure editing (pass-rate figures, spec-sheet points and
// the credential cards themselves).

import {
  CERT_BADGE_SHAPES,
  CERT_CARD_LOOKS,
  CERT_LIMITS,
  CERT_STAT_TILES,
  isDefaultCertStyle,
  patchCertStyle,
  resetCertStyle,
  resolveCertStyle,
  type CertStyle,
} from "@/lib/cert-style";
import { canMoveDown, canMoveUp, moveDown, moveUp } from "@/lib/reorder";

const MAX_CERTS = 3;
const MAX_POINTS = 6;
const MAX_HIGHLIGHTS = 3;

type Cert = { label?: unknown; points?: unknown; [k: string]: unknown };

const str = (v: unknown) => (typeof v === "string" ? v : "");
const strList = (v: unknown): string[] =>

  Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x : String(x ?? ""))) : [];

const certList = (v: unknown): Cert[] =>
  Array.isArray(v) ? v.filter((x) => !!x && typeof x === "object").map((x) => x as Cert) : [];

const LABEL =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45 flex items-center justify-between";
const FIELD =
  "w-full rounded-lg border border-black/10 px-2.5 py-1.5 text-[12px] text-[#03002C] outline-none focus:border-[#003FC7]";
const CHIP =
  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition border-black/10 text-black/60 hover:border-[#003FC7] hover:text-[#003FC7]";
const CHIP_ON = "rounded-full border px-2.5 py-1 text-[11px] font-medium border-[#003FC7] bg-[#003FC7]/8 text-[#003FC7]";
const TINY =
  "rounded-md border border-black/10 px-1.5 text-[11px] leading-5 text-black/55 transition hover:border-[#003FC7] hover:text-[#003FC7] disabled:opacity-30";

function Toggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={on ? CHIP_ON : CHIP}
    >
      {on ? "✓ " : ""}
      {label}
    </button>
  );
}

function Slider({
  label,
  value,
  suffix,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="mt-3 flex flex-col gap-1">
      <span className={LABEL}>
        {label}
        <span className="tabular-nums text-black/60">
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="w-full accent-[#003FC7]"
      />
    </label>
  );
}

function Choices<T extends string>({
  label,
  options,
  current,
  onPick,
}: {
  label: string;
  options: { id: T; label: string }[];
  current: T;
  onPick: (v: T) => void;
}) {
  return (
    <div className="mt-4">
      <span className={LABEL}>{label}</span>
      <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={current === o.id}
            onClick={() => onPick(o.id)}
            className={current === o.id ? CHIP_ON : CHIP}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function StringList({
  title,
  hint,
  values,
  max,
  placeholder,
  onChange,
}: {
  title: string;
  hint?: string;
  values: string[];
  max: number;
  placeholder: string;
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="mt-5 border-t border-black/5 pt-4">
      <div className="flex items-center justify-between">
        <span className={LABEL}>{title}</span>
        <button
          type="button"
          onClick={() => onChange([...values, ""])}
          disabled={values.length >= max}
          className={TINY}
        >
          + Add
        </button>
      </div>
      {hint && <p className="mt-1 text-[11px] text-black/50">{hint}</p>}
      <div className="mt-2 flex flex-col gap-1.5">
        {values.map((v, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              className={FIELD}
              value={v}
              placeholder={placeholder}
              aria-label={`${title} ${i + 1}`}
              onChange={(e) => {
                const next = [...values];
                next[i] = e.target.value;
                onChange(next);
              }}
            />
            <button
              type="button"
              className={TINY}
              disabled={!canMoveUp(i)}
              aria-label={`Move ${title} ${i + 1} up`}
              onClick={() => onChange(moveUp(values, i))}
            >
              ↑
            </button>
            <button
              type="button"
              className={TINY}
              disabled={!canMoveDown(i, values.length)}
              aria-label={`Move ${title} ${i + 1} down`}
              onClick={() => onChange(moveDown(values, i))}
            >
              ↓
            </button>
            <button
              type="button"
              className={TINY}
              aria-label={`Remove ${title} ${i + 1}`}
              onClick={() => onChange(values.filter((_, k) => k !== i))}
            >
              ✕
            </button>
          </div>
        ))}
        {values.length === 0 && <p className="text-[11px] text-black/40">Nothing yet.</p>}
      </div>
    </div>
  );
}

export function CertStylePanel({
  content,
  onChangeField,
}: {
  content: Record<string, unknown>;
  onChangeField: (field: string, value: unknown) => void;
}) {
  const style = resolveCertStyle(content.certStyle);
  const set = (patch: Partial<CertStyle>) =>
    onChangeField("certStyle", patchCertStyle(content.certStyle, patch));

  const highlights = strList(content.cardHighlights);
  const points = strList(content.cardPoints);
  const certs = certList(content.certs);

  const setCerts = (next: Cert[]) => onChangeField("certs", next);

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[13px] font-semibold text-[#03002C]">Certification module</h3>
          <p className="text-[11px] text-black/55">
            Layout, card styling and the content of every figure, point and credential.
          </p>
        </div>
        {!isDefaultCertStyle(style) && (
          <button
            type="button"
            onClick={() => onChangeField("certStyle", resetCertStyle())}
            className="rounded-full border border-black/10 px-2.5 py-1 text-[10px] font-medium text-black/60 transition hover:border-[#003FC7] hover:text-[#003FC7]"
          >
            ⟲ Reset styling
          </button>
        )}
      </div>

      <Choices
        label="Cards side"
        current={style.cardsSide}
        options={[
          { id: "right" as const, label: "Cards right" },
          { id: "left" as const, label: "Cards left" },
        ]}
        onPick={(cardsSide) => set({ cardsSide })}
      />

      <Slider
        label="Column balance"
        value={Math.round(style.split * 100)}
        suffix="%"
        min={Math.round(CERT_LIMITS.split.min * 100)}
        max={Math.round(CERT_LIMITS.split.max * 100)}
        step={2}
        onChange={(v) => set({ split: v / 100 })}
      />

      <Choices
        label="Card look"
        current={style.cardLook}
        options={CERT_CARD_LOOKS}
        onPick={(cardLook) => set({ cardLook })}
      />

      <Slider
        label="Accent edge"
        value={style.accentBar}
        suffix="px"
        min={CERT_LIMITS.accentBar.min}
        max={CERT_LIMITS.accentBar.max}
        step={1}
        onChange={(accentBar) => set({ accentBar })}
      />
      <Slider
        label="Card stagger"
        value={style.stagger}
        suffix="px"
        min={CERT_LIMITS.stagger.min}
        max={CERT_LIMITS.stagger.max}
        step={2}
        onChange={(stagger) => set({ stagger })}
      />
      <Slider
        label="Corner radius"
        value={style.cardRadius}
        suffix="px"
        min={CERT_LIMITS.cardRadius.min}
        max={CERT_LIMITS.cardRadius.max}
        step={1}
        onChange={(cardRadius) => set({ cardRadius })}
      />

      <Choices
        label="Badge well"
        current={style.badge}
        options={CERT_BADGE_SHAPES}
        onPick={(badge) => set({ badge })}
      />
      <Choices
        label="Figure treatment"
        current={style.statTile}
        options={CERT_STAT_TILES}
        onPick={(statTile) => set({ statTile })}
      />
      <Choices
        label="Spacing"
        current={style.density}
        options={[
          { id: "comfortable" as const, label: "Comfortable" },
          { id: "compact" as const, label: "Compact" },
        ]}
        onPick={(density) => set({ density })}
      />

      <div className="mt-4">
        <span className={LABEL}>Decoration</span>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <Toggle label="Tinted band" on={style.band} onChange={(band) => set({ band })} />
          <Toggle label="Corner arcs" on={style.showArcs} onChange={(showArcs) => set({ showArcs })} />
          <Toggle
            label="Card numbers"
            on={style.showIndex}
            onChange={(showIndex) => set({ showIndex })}
          />
          <Toggle
            label="Numbered points"
            on={style.numberedPoints}
            onChange={(numberedPoints) => set({ numberedPoints })}
          />
        </div>
      </div>

      <label className="mt-4 flex flex-col gap-1">
        <span className={LABEL}>Points heading</span>
        <input
          className={FIELD}
          value={style.coversLabel}
          placeholder="What it covers"
          onChange={(e) => set({ coversLabel: e.target.value })}
        />
      </label>

      <StringList
        title="Pass-rate figures"
        hint="Start with the number, e.g. “6% technical field pass rate”."
        values={highlights}
        max={MAX_HIGHLIGHTS}
        placeholder="6% technical field pass rate"
        onChange={(v) => onChangeField("cardHighlights", v)}
      />

      <StringList
        title="Programme points"
        values={points}
        max={MAX_POINTS}
        placeholder="Subject-matter testing"
        onChange={(v) => onChangeField("cardPoints", v)}
      />

      <div className="mt-5 border-t border-black/5 pt-4">
        <div className="flex items-center justify-between">
          <span className={LABEL}>Credentials</span>
          <button
            type="button"
            className={TINY}
            disabled={certs.length >= MAX_CERTS}
            onClick={() => setCerts([...certs, { label: "New credential", points: [""] }])}
          >
            + Add credential
          </button>
        </div>
        <div className="mt-2 flex flex-col gap-3">
          {certs.map((cert, i) => {
            const bullets = strList(cert.points);
            const patch = (p: Partial<Cert>) =>
              setCerts(certs.map((x, k) => (k === i ? { ...x, ...p } : x)));
            return (
              <div key={i} className="rounded-xl border border-black/10 p-2.5">
                <div className="flex items-center gap-1.5">
                  <input
                    className={FIELD}
                    value={typeof cert.label === "string" ? cert.label : ""}
                    aria-label={`Credential ${i + 1} name`}
                    placeholder="ISO 17100:2015"
                    onChange={(e) => patch({ label: e.target.value })}
                  />
                  <button
                    type="button"
                    className={TINY}
                    disabled={!canMoveUp(i)}
                    aria-label={`Move credential ${i + 1} up`}
                    onClick={() => setCerts(moveUp(certs, i))}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={TINY}
                    disabled={!canMoveDown(i, certs.length)}
                    aria-label={`Move credential ${i + 1} down`}
                    onClick={() => setCerts(moveDown(certs, i))}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={TINY}
                    aria-label={`Remove credential ${i + 1}`}
                    onClick={() => setCerts(certs.filter((_, k) => k !== i))}
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-2 flex flex-col gap-1.5">
                  {bullets.map((b, k) => (
                    <div key={k} className="flex items-center gap-1.5">
                      <input
                        className={FIELD}
                        value={b}
                        aria-label={`Credential ${i + 1} point ${k + 1}`}
                        placeholder="Certified process scope"
                        onChange={(e) => {
                          const next = [...bullets];
                          next[k] = e.target.value;
                          patch({ points: next });
                        }}
                      />
                      <button
                        type="button"
                        className={TINY}
                        disabled={!canMoveUp(k)}
                        aria-label={`Move credential ${i + 1} point ${k + 1} up`}
                        onClick={() => patch({ points: moveUp(bullets, k) })}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className={TINY}
                        disabled={!canMoveDown(k, bullets.length)}
                        aria-label={`Move credential ${i + 1} point ${k + 1} down`}
                        onClick={() => patch({ points: moveDown(bullets, k) })}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className={TINY}
                        aria-label={`Remove credential ${i + 1} point ${k + 1}`}
                        onClick={() => patch({ points: bullets.filter((_, x) => x !== k) })}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className={`${TINY} self-start`}
                    disabled={bullets.length >= MAX_POINTS}
                    onClick={() => patch({ points: [...bullets, ""] })}
                  >
                    + Add point
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/45">
                      Logo — light slides
                    </span>
                    <input
                      className={FIELD}
                      value={str(cert.logoUrl)}
                      placeholder="https://…/logo-color.svg"
                      onChange={(e) => patch({ logoUrl: e.target.value })}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/45">
                      Logo — dark slides
                    </span>
                    <input
                      className={FIELD}
                      value={str(cert.logoUrlDark)}
                      placeholder="https://…/logo-white.svg"
                      onChange={(e) => patch({ logoUrlDark: e.target.value })}
                    />
                  </label>
                </div>

              </div>
            );
          })}
          {certs.length === 0 && (
            <p className="text-[11px] text-black/40">No credentials yet — add one.</p>
          )}
        </div>
      </div>
    </section>
  );
}
