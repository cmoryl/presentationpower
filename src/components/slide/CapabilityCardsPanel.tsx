/**
 * CapabilityCardsPanel — structural + style editor for MV-SOL-CAP-CARDS.
 *
 * The generic "Editable fields" list can only retype what already exists; this
 * panel owns the structure: add / remove / reorder up to four cards, each with
 * its own label band, lead claim, bullet list (add, remove, reorder) and its
 * own photograph (upload, paste a URL, pick from the division library, or fall
 * back to the seeded imagery). Style knobs live in one blob so the renderer
 * and the PowerPoint export read the same values.
 */
import * as React from "react";
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
import { SlideImageryPanel } from "@/components/slide/SlideImageryPanel";
import {
  CAP_CARD_LIMITS,
  CAP_CARD_TONES,
  DEFAULT_CAP_CARD_STYLE,
  MAX_CARDS,
  MAX_CARD_BULLETS,
  MIN_CARDS,
  addBullet,
  addCard,
  isDefaultCapCardStyle,
  moveBullet,
  moveCard,
  patchBullet,
  patchCapCardStyle,
  patchCard,
  readCards,
  removeBullet,
  removeCard,
  resolveCapCardStyle,
  type CapCard,
  type CapCardStyle,
} from "@/lib/showcase-cards";

type Props = {
  cards: unknown;
  style: unknown;
  divisionId?: string;
  onChangeCards: (cards: CapCard[]) => void;
  onChangeStyle: (style: CapCardStyle) => void;
};

const inputCls =
  "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-black/30";
const btnCls =
  "inline-flex items-center gap-1 rounded-lg border border-black/15 px-2 py-1 text-xs text-black/70 transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 disabled:cursor-not-allowed disabled:opacity-40";
const labelCls = "block text-[11px] uppercase tracking-wider text-black/50";

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="mt-1 inline-flex flex-wrap gap-1">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-widest transition ${
              value === o.id
                ? "border-transparent bg-[#03002C] text-white"
                : "border-black/15 text-black/60 hover:bg-black/5"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block">
      <span className={labelCls}>
        {label} <span className="text-black/40">· {value}{suffix ?? ""}</span>
      </span>
      <input
        className="mt-2 w-full"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export function CapabilityCardsPanel({
  cards: raw,
  style: rawStyle,
  divisionId,
  onChangeCards,
  onChangeStyle,
}: Props) {
  const cards = React.useMemo(() => readCards(raw), [raw]);
  const st = React.useMemo(() => resolveCapCardStyle(rawStyle), [rawStyle]);

  return (
    <section
      aria-label="Capability cards"
      className="rounded-2xl border border-black/10 bg-white p-6"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xs uppercase tracking-widest text-black/50">Capability cards</h3>
          <p className="mt-1 text-xs text-black/50">
            {cards.length} of {MAX_CARDS} cards · up to {MAX_CARD_BULLETS} bullets each
          </p>
        </div>
        <button
          type="button"
          className={btnCls}
          disabled={cards.length >= MAX_CARDS}
          onClick={() => onChangeCards(addCard(cards))}
        >
          <Plus size={14} aria-hidden /> Add card
        </button>
      </header>

      <div className="mt-5 space-y-5">
        {cards.map((card, i) => (
          <div key={i} className="rounded-xl border border-black/10 bg-black/[0.02] p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-black/60">
                Card {i + 1}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className={btnCls}
                  aria-label={`Move card ${i + 1} left`}
                  disabled={i === 0}
                  onClick={() => onChangeCards(moveCard(cards, i, -1))}
                >
                  <ArrowLeft size={14} aria-hidden />
                </button>
                <button
                  type="button"
                  className={btnCls}
                  aria-label={`Move card ${i + 1} right`}
                  disabled={i === cards.length - 1}
                  onClick={() => onChangeCards(moveCard(cards, i, 1))}
                >
                  <ArrowRight size={14} aria-hidden />
                </button>
                <button
                  type="button"
                  className={btnCls}
                  aria-label={`Remove card ${i + 1}`}
                  disabled={cards.length <= MIN_CARDS}
                  onClick={() => onChangeCards(removeCard(cards, i))}
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={labelCls}>Label band</span>
                <input
                  className={`${inputCls} mt-1`}
                  value={card.label}
                  onChange={(e) => onChangeCards(patchCard(cards, i, { label: e.target.value }))}
                />
              </label>
              <div>
                <Segmented
                  label="Band colour"
                  value={card.tone}
                  options={CAP_CARD_TONES}
                  onChange={(tone) => onChangeCards(patchCard(cards, i, { tone }))}
                />
              </div>
              <label className="block">
                <span className={labelCls}>Lead claim</span>
                <input
                  className={`${inputCls} mt-1`}
                  value={card.lead}
                  onChange={(e) => onChangeCards(patchCard(cards, i, { lead: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className={labelCls}>Lead support line</span>
                <input
                  className={`${inputCls} mt-1`}
                  value={card.leadNote}
                  onChange={(e) => onChangeCards(patchCard(cards, i, { leadNote: e.target.value }))}
                />
              </label>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between gap-3">
                <span className={labelCls}>
                  Bullets ({card.bullets.length}/{MAX_CARD_BULLETS})
                </span>
                <button
                  type="button"
                  className={btnCls}
                  disabled={card.bullets.length >= MAX_CARD_BULLETS}
                  onClick={() => onChangeCards(addBullet(cards, i))}
                >
                  <Plus size={13} aria-hidden /> Add bullet
                </button>
              </div>
              <div className="mt-2 space-y-2">
                {card.bullets.map((b, bi) => (
                  <div key={bi} className="flex items-center gap-1">
                    <input
                      className={inputCls}
                      value={b}
                      aria-label={`Card ${i + 1} bullet ${bi + 1}`}
                      onChange={(e) => onChangeCards(patchBullet(cards, i, bi, e.target.value))}
                    />
                    <button
                      type="button"
                      className={btnCls}
                      aria-label={`Move bullet ${bi + 1} up`}
                      disabled={bi === 0}
                      onClick={() => onChangeCards(moveBullet(cards, i, bi, -1))}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className={btnCls}
                      aria-label={`Move bullet ${bi + 1} down`}
                      disabled={bi === card.bullets.length - 1}
                      onClick={() => onChangeCards(moveBullet(cards, i, bi, 1))}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className={btnCls}
                      aria-label={`Remove bullet ${bi + 1}`}
                      onClick={() => onChangeCards(removeBullet(cards, i, bi))}
                    >
                      <Trash2 size={13} aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Per-card photograph — upload, URL, team library or seeded */}
            <SlideImageryPanel
              title={`Card ${i + 1} image`}
              mediaUrl={card.mediaUrl}
              mediaSeed={card.mediaSeed}
              divisionId={divisionId}
              onChange={(next, nextPath) =>
                onChangeCards(
                  patchCard(cards, i, {
                    mediaUrl: next ?? undefined,
                    ...(nextPath !== undefined ? { mediaPath: nextPath ?? undefined } : {}),
                  }),
                )
              }
            />
          </div>
        ))}
      </div>

      {/* Card design knobs */}
      <div className="mt-6 border-t border-black/10 pt-5">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-xs uppercase tracking-widest text-black/50">Card design</h4>
          <button
            type="button"
            className={btnCls}
            disabled={isDefaultCapCardStyle(rawStyle)}
            onClick={() => onChangeStyle({ ...DEFAULT_CAP_CARD_STYLE })}
          >
            Reset
          </button>
        </div>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <Slider
            label="Image share"
            value={Math.round(st.imageRatio * 100)}
            min={Math.round(CAP_CARD_LIMITS.imageRatio.min * 100)}
            max={Math.round(CAP_CARD_LIMITS.imageRatio.max * 100)}
            step={1}
            suffix="%"
            onChange={(n) => onChangeStyle(patchCapCardStyle(rawStyle, { imageRatio: n / 100 }))}
          />
          <Slider
            label="Corner radius"
            value={st.cardRadius}
            min={CAP_CARD_LIMITS.cardRadius.min}
            max={CAP_CARD_LIMITS.cardRadius.max}
            step={CAP_CARD_LIMITS.cardRadius.step}
            suffix="px"
            onChange={(n) => onChangeStyle(patchCapCardStyle(rawStyle, { cardRadius: n }))}
          />
          <Slider
            label="Gap between cards"
            value={st.gap}
            min={CAP_CARD_LIMITS.gap.min}
            max={CAP_CARD_LIMITS.gap.max}
            step={CAP_CARD_LIMITS.gap.step}
            suffix="px"
            onChange={(n) => onChangeStyle(patchCapCardStyle(rawStyle, { gap: n }))}
          />
          <Segmented
            label="Card look"
            value={st.cardLook}
            options={[
              { id: "elevated", label: "Raised" },
              { id: "flat", label: "Flat" },
              { id: "outline", label: "Outline" },
            ]}
            onChange={(cardLook) => onChangeStyle(patchCapCardStyle(rawStyle, { cardLook }))}
          />
          <Segmented
            label="Label case"
            value={st.bandCase}
            options={[
              { id: "upper", label: "Uppercase" },
              { id: "as-typed", label: "As typed" },
            ]}
            onChange={(bandCase) => onChangeStyle(patchCapCardStyle(rawStyle, { bandCase }))}
          />
          <Segmented
            label="Bullet marker"
            value={st.bulletMark}
            options={[
              { id: "dot", label: "Dot" },
              { id: "dash", label: "Dash" },
              { id: "number", label: "Numbered" },
            ]}
            onChange={(bulletMark) => onChangeStyle(patchCapCardStyle(rawStyle, { bulletMark }))}
          />
          <Segmented
            label="Lead colour"
            value={st.leadColor}
            options={[
              { id: "tone", label: "Band colour" },
              { id: "accent", label: "Accent" },
              { id: "ink", label: "Ink" },
            ]}
            onChange={(leadColor) => onChangeStyle(patchCapCardStyle(rawStyle, { leadColor }))}
          />
          <Segmented
            label="Spacing"
            value={st.density}
            options={[
              { id: "comfortable", label: "Comfortable" },
              { id: "compact", label: "Compact" },
            ]}
            onChange={(density) => onChangeStyle(patchCapCardStyle(rawStyle, { density }))}
          />
          <label className="flex items-center gap-2 text-xs text-black/70">
            <input
              type="checkbox"
              checked={st.showBandRule}
              onChange={(e) =>
                onChangeStyle(patchCapCardStyle(rawStyle, { showBandRule: e.target.checked }))
              }
            />
            Accent rule above the copy
          </label>
        </div>
      </div>
    </section>
  );
}
