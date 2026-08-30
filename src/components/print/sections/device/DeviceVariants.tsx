/**
 * DEVICE SHOWCASE — print section modules
 * ---------------------------------------------------------------------------
 * Portrait-native laptop / desktop-monitor mockups. The screen is a
 * replaceable image slot (`sec.<id>.screen`, plus `.screen2` on the duo), so an
 * editor can click or drag a product screenshot straight onto the monitor; the
 * override persists in `content.imageOverrides` and re-renders identically in
 * the editor, the PDF, and the PPTX.
 *
 * All geometry is `cq()`-scaled like every other print section, and the chassis
 * itself comes from the shared `DeviceFrame` used by the presentation modules —
 * one device language across print and slides.
 */

import { DeviceFrame, DeviceScreenPlaceholder } from "@/components/device/DeviceFrame";
import { DeviceScreenPicker } from "@/components/device/DeviceScreenPicker";
import {
  EditableImage,
  resolveImageSlot,
  usePrintImageEdit,
} from "@/components/print/PrintImageEdit";
import type { PrintDeviceSection } from "@/lib/print-assets.types";
import { cq, sectionInk, MODULE, safeList} from "../shared";

const TRANSPARENT_PX =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

type Props = {
  section: PrintDeviceSection;
  mode: "light" | "dark";
  accent: string;
};

/** Screen contents: authored/overridden screenshot, else a neutral UI wireframe.
 *  Always mounts an `EditableImage` on top so the screen stays a drop target. */
function Screen({
  section,
  slot,
  url,
  accent,
  label,
}: {
  section: PrintDeviceSection;
  slot: string;
  url?: string;
  accent: string;
  label: string;
}) {
  const ctx = usePrintImageEdit();
  const resolved = resolveImageSlot(ctx?.overrides, slot, url ?? "");
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {resolved ? (
        <img
          alt={section.caption ?? label}
          src={resolved}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <DeviceScreenPlaceholder accent={accent} />
      )}
      {ctx?.active && (
        <div style={{ position: "absolute", inset: 0 }}>
          <EditableImage
            slot={slot}
            src={TRANSPARENT_PX}
            alt={label}
            fit="cover"
            label="screen image"
          />
          <DeviceScreenPicker slot={slot} label={label} />
        </div>
      )}
    </div>
  );
}

function Copy({ section, mode, accent, align = "left" }: Props & { align?: "left" | "center" }) {
  const ink = sectionInk(mode);
  return (
    <div style={{ minWidth: 0, textAlign: align }}>
      {section.eyebrow && (
        <div
          style={{
            fontSize: cq(8.6),
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: accent,
          }}
        >
          {section.eyebrow}
        </div>
      )}
      {section.title && (
        <div
          style={{
            marginTop: cq(5),
            fontSize: cq(MODULE.title),
            lineHeight: 1.15,
            fontWeight: 700,
            letterSpacing: "-0.025em",
            color: ink.strong,
          }}
        >
          {section.title}
        </div>
      )}
      {section.body && (
        <div
          style={{
            marginTop: cq(7),
            fontSize: cq(MODULE.body),
            lineHeight: MODULE.bodyLead,
            color: ink.soft,
          }}
        >
          {section.body}
        </div>
      )}
      {!!section.items?.length && (
        <div style={{ marginTop: cq(10), display: "grid", gap: cq(7) }}>
          {safeList(section.items).map((it, i) => (
            <div key={i} style={{ display: "flex", gap: cq(8), alignItems: "flex-start" }}>
              <span
                style={{
                  marginTop: cq(4),
                  width: cq(5),
                  height: cq(5),
                  flexShrink: 0,
                  borderRadius: cq(1.4),
                  background: accent,
                }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: cq(9.8), fontWeight: 700, color: ink.strong }}>
                  {it.label}
                </div>
                {it.body && (
                  <div style={{ fontSize: cq(9.2), lineHeight: 1.5, color: ink.faint }}>
                    {it.body}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Caption({ section, mode }: Props) {
  const ink = sectionInk(mode);
  if (!section.caption) return null;
  return (
    <div
      style={{
        marginTop: cq(8),
        fontSize: cq(8.8),
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: ink.faint,
      }}
    >
      {section.caption}
    </div>
  );
}

/** Laptop beside supporting copy. */
export function DeviceLaptopShowcase(props: Props) {
  const { section, accent } = props;
  return (
    <section aria-label={section.title ?? "Product screen"} style={{ margin: 0 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: cq(MODULE.gridGap * 1.4),
          alignItems: "center",
        }}
      >
        <DeviceFrame
          kind="laptop"
          tone={section.deviceTone ?? "graphite"}
          accent={accent}
          shadow={false}
        >
          <Screen
            section={section}
            slot={`sec.${section.id}.screen`}
            url={section.imageUrl}
            accent={accent}
            label="Laptop screen"
          />
        </DeviceFrame>
        <div>
          <Copy {...props} />
          <Caption {...props} />
        </div>
      </div>
    </section>
  );
}

/** Centered monitor with the headline above and caption below. */
export function DeviceMonitorShowcase(props: Props) {
  const { section, accent } = props;
  return (
    <section aria-label={section.title ?? "Product screen"} style={{ margin: 0 }}>
      <Copy {...props} align="center" />
      <div style={{ margin: `${cq(MODULE.gridGap)} auto 0`, width: "82%" }}>
        <DeviceFrame
          kind="monitor"
          tone={section.deviceTone ?? "ink"}
          accent={accent}
          shadow={false}
        >
          <Screen
            section={section}
            slot={`sec.${section.id}.screen`}
            url={section.imageUrl}
            accent={accent}
            label="Monitor screen"
          />
        </DeviceFrame>
      </div>
      <div style={{ textAlign: "center" }}>
        <Caption {...props} />
      </div>
    </section>
  );
}

/** Monitor + laptop pair — desktop hero screen with a companion view. */
export function DeviceDuoShowcase(props: Props) {
  const { section, accent } = props;
  return (
    <section aria-label={section.title ?? "Product screens"} style={{ margin: 0 }}>
      <Copy {...props} />
      <div
        style={{
          marginTop: cq(MODULE.gridGap),
          display: "grid",
          gridTemplateColumns: "1.35fr 1fr",
          gap: cq(MODULE.gridGap),
          alignItems: "end",
        }}
      >
        <DeviceFrame
          kind="monitor"
          tone={section.deviceTone ?? "ink"}
          accent={accent}
          shadow={false}
        >
          <Screen
            section={section}
            slot={`sec.${section.id}.screen`}
            url={section.imageUrl}
            accent={accent}
            label="Monitor screen"
          />
        </DeviceFrame>
        <DeviceFrame
          kind="laptop"
          tone={section.deviceTone === "silver" ? "silver" : "graphite"}
          accent={accent}
          shadow={false}
        >
          <Screen
            section={section}
            slot={`sec.${section.id}.screen2`}
            url={section.secondaryImageUrl}
            accent={accent}
            label="Laptop screen"
          />
        </DeviceFrame>
      </div>
      <Caption {...props} />
    </section>
  );
}
