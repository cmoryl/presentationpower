// Shared house times across the division agendas, and which boards differ.
//
// Reporting only. A divergent time can be correct, so nothing here edits a
// programme — it names the board, the time it keeps and the time the rest of
// the event keeps, and leaves the call to a person.

import { useMemo, useState } from "react";
import { AlertTriangle, Check, ChevronDown, ChevronRight } from "lucide-react";

import {
  agendaDivisionHouseDrift,
  agendaHouseSlotReports,
  HOUSE_TIME_QUORUM,
} from "@/lib/next-agenda-house-times";

export function AgendaHouseTimesPanel({ divisionId }: { divisionId?: string }) {
  const [open, setOpen] = useState(false);
  const reports = useMemo(() => agendaHouseSlotReports(), []);
  const ours = useMemo(() => agendaDivisionHouseDrift(divisionId), [divisionId]);
  const drifting = reports.filter((r) => r.drifting.length > 0);

  return (
    <div className="mt-4 rounded-lg border border-black/10 bg-white/70 p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="text-sm font-medium text-[#03002C]">Shared event times</span>
        {drifting.length ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#FFEB66] px-2 py-0.5 text-[11px] font-medium text-[#03002C]">
            <AlertTriangle size={11} /> {drifting.length} slot
            {drifting.length === 1 ? "" : "s"} where boards differ
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#A6FA87] px-2 py-0.5 text-[11px] font-medium text-[#03002C]">
            <Check size={11} /> every board on the same times
          </span>
        )}
      </button>

      {ours.length ? (
        <ul className="mt-3 space-y-1 border-l-2 border-[#003FC7] pl-3">
          {ours.map((d) => (
            <li key={`${d.label}-${d.day}`} className="text-xs text-[#03002C]">
              This board&rsquo;s <strong>{d.label.toLowerCase()}</strong> on day {d.day} is{" "}
              <strong>{d.ourTime}</strong>; most divisions keep <strong>{d.houseTime}</strong>.
              Correct it if that was not intended.
            </li>
          ))}
        </ul>
      ) : null}

      {open ? (
        <div className="mt-4 space-y-4">
          <p className="text-[11px] text-black/55">
            Registration, lunch and the reception are compared across every division programme, day
            by day. A time counts as the event&rsquo;s own once at least {HOUSE_TIME_QUORUM} boards
            and over half of them share it. Breaks are not compared — each division sets its own.
          </p>
          {reports.map((r) => (
            <div key={`${r.kind}-${r.day}`} className="rounded-md border border-black/10 p-3">
              <p className="text-xs font-medium text-[#03002C]">
                {r.label} — day {r.day}:{" "}
                {r.houseTime ? (
                  <span className="font-mono">{r.houseTime}</span>
                ) : (
                  <span className="text-black/55">no shared time — boards do not agree</span>
                )}
              </p>
              {r.drifting.length ? (
                <ul className="mt-2 space-y-1">
                  {r.drifting.map((d) => (
                    <li key={d.divisionId} className="text-xs text-[#03002C]">
                      <AlertTriangle size={11} className="mr-1 inline" />
                      {d.divisionName} keeps <span className="font-mono">{d.time}</span> ({d.title})
                    </li>
                  ))}
                </ul>
              ) : r.houseTime ? (
                <p className="mt-1 text-[11px] text-black/55">
                  All {r.agreeing.length} boards with this slot keep the same time.
                </p>
              ) : null}
              {r.missing.length ? (
                <p className="mt-1 text-[11px] text-black/55">
                  No {r.label.toLowerCase()} row recorded on day {r.day} for{" "}
                  {r.missing.map((m) => m.divisionName).join(", ")}.
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
