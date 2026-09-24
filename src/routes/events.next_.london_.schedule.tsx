// /events/next/london/schedule — room-by-room schedule for the QEII Centre.
//
// Every recorded space, floor by floor, with the issued session times beneath it
// and a link straight to that room on the floor plan, so a vendor can see where
// each event fits. Copy is the issued programme word for word; anything not on
// record says so.

import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Clock, Map as MapIcon, Search, Users } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { LONDON_VENUE } from "@/lib/next-london-signage";
import {
  londonRoomScheduleByFloor,
  londonRoomSchedule,
  londonSharedTimeSlots,
  roomSessionCount,
  type RoomScheduleEntry,
} from "@/lib/next-london-room-schedule";

export const Route = createFileRoute("/events/next_/london_/schedule")({
  head: () => ({
    meta: [
      { title: "NEXT 2026 London room schedule · which event runs where" },
      {
        name: "description",
        content:
          "Every QEII Centre space at TransPerfect NEXT 2026 London with its issued session times, function and division area, linked straight to the room on the floor plan.",
      },
      { property: "og:title", content: "NEXT 2026 London room schedule" },
      {
        property: "og:description",
        content:
          "Room-by-room session times for NEXT 2026 London, floor by floor, each space linked to its place on the QEII Centre plans.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LondonSchedulePage,
});

const card =
  "rounded-2xl border border-[#03002C]/12 bg-white p-5 shadow-[0_12px_28px_-24px_rgba(3,0,44,0.35)]";
const pill =
  "inline-flex items-center gap-1.5 rounded-full border border-[#03002C]/15 bg-[#F2F2F2] px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#03002C]/70";

function matches(entry: RoomScheduleEntry, q: string): boolean {
  if (!q) return true;
  const hay = [
    entry.space,
    entry.floor,
    entry.event,
    entry.fn ?? "",
    entry.rooms.join(" "),
    ...entry.days.flatMap((d) => d.sessions.map((s) => `${s.time} ${s.title} ${s.detail}`)),
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q.toLowerCase());
}

function LondonSchedulePage() {
  const [query, setQuery] = useState("");
  const [showShared, setShowShared] = useState(false);

  const entries = useMemo(() => londonRoomSchedule(), []);
  const floors = useMemo(
    () => londonRoomScheduleByFloor(entries.filter((e) => matches(e, query))),
    [entries, query],
  );
  const shared = useMemo(() => londonSharedTimeSlots(entries), [entries]);
  const totalSessions = entries.reduce((n, e) => n + roomSessionCount(e), 0);

  return (
    <AppShell>
      <div className="mx-auto max-w-[1180px] px-6 py-10">
        <Link
          to="/events/next/london"
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#003FC7] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> NEXT 2026 London
        </Link>

        <header className="mt-4">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#03002C]/60">
            Room schedule · {LONDON_VENUE.venue}
          </p>
          <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-[-0.02em] text-[#03002C]">
            What runs in each room, and when
          </h1>
          <p className="mt-3 max-w-[70ch] text-sm leading-relaxed text-[#03002C]/70">
            Every room and session is taken from the issued event space schedule and the issued
            division programmes. Open any room on the floor plan to see exactly where it sits.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 rounded-full border border-[#03002C]/20 bg-white px-3 py-2">
              <Search className="h-4 w-4 text-[#03002C]/50" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a room, a division or a session"
                className="w-[300px] bg-transparent text-[13px] text-[#03002C] outline-none placeholder:text-[#03002C]/45"
              />
            </label>
            <Link
              to="/events/next/london/maps"
              className="inline-flex items-center gap-2 rounded-full border border-[#03002C]/20 bg-white px-4 py-2 text-[13px] font-semibold text-[#03002C] hover:bg-[#F2F2F2]"
            >
              <MapIcon className="h-4 w-4 text-[#003FC7]" /> Floor plans
            </Link>
            {shared.length ? (
              <button
                type="button"
                onClick={() => setShowShared(!showShared)}
                className="inline-flex items-center gap-2 rounded-full border border-[#03002C]/20 bg-white px-4 py-2 text-[13px] font-semibold text-[#03002C] hover:bg-[#F2F2F2]"
              >
                <Clock className="h-4 w-4 text-[#003FC7]" />
                {showShared ? "Hide" : "Show"} {shared.length} times with more than one room busy
              </button>
            ) : null}
          </div>
        </header>

        {showShared ? (
          <section className="mt-7">
            <h2 className="text-lg font-semibold text-[#03002C]">Same time, more than one room</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {shared.map((slot) => (
                <div key={`${slot.meta}|${slot.time}`} className={card}>
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#03002C]/55">
                    {slot.meta}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#03002C]">{slot.time}</p>
                  <ul className="mt-2 space-y-1.5">
                    {slot.rooms.map((room) => (
                      <li key={room.space} className="text-[13px] text-[#03002C]/75">
                        <Link
                          to="/events/next/london/maps"
                          search={{ sheet: room.sheetId, room: room.space }}
                          className="font-semibold text-[#003FC7] hover:underline"
                        >
                          {room.space}
                        </Link>{" "}
                        — {room.title}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {floors.map((floor) => (
          <section key={floor.sheetId} className="mt-9">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-[#03002C]">{floor.title}</h2>
              <Link
                to="/events/next/london/maps"
                search={{ sheet: floor.sheetId }}
                className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#003FC7] hover:underline"
              >
                <MapIcon className="h-4 w-4" /> Open this floor plan
              </Link>
            </div>

            <div className="mt-4 grid gap-4">
              {floor.entries.map((entry) => (
                <article key={`${entry.sheetId}-${entry.space}`} className={card}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-[#03002C]">
                        {entry.space}
                      </h3>
                      <p className="mt-1 text-[13px] text-[#03002C]/70">
                        {[entry.fn, entry.event].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={pill}>
                        <Users className="h-3 w-3" /> {roomSessionCount(entry)} session
                        {roomSessionCount(entry) === 1 ? "" : "s"}
                      </span>
                      <Link
                        to="/events/next/london/maps"
                        search={{ sheet: entry.sheetId, room: entry.rooms[0] ?? entry.space }}
                        className="inline-flex items-center gap-2 rounded-full border border-[#003FC7] bg-[#003FC7] px-3.5 py-1.5 text-[12.5px] font-semibold text-white hover:opacity-90"
                      >
                        <MapIcon className="h-3.5 w-3.5" /> Show on the map
                      </Link>
                    </div>
                  </div>

                  {entry.days.length ? (
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      {entry.days.map((day) => (
                        <div key={day.meta}>
                          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#03002C]/55">
                            {day.meta}
                          </p>
                          <ul className="mt-2 divide-y divide-[#03002C]/8">
                            {day.sessions.map((session, i) => (
                              <li
                                key={`${day.meta}-${i}-${session.time}`}
                                className="flex gap-3 py-2"
                              >
                                <span className="w-[136px] shrink-0 font-mono text-[11.5px] uppercase tracking-[0.06em] text-[#03002C]/70">
                                  {session.time}
                                </span>
                                <span className="text-[13px] leading-relaxed text-[#03002C]">
                                  {session.title}
                                  {session.detail ? (
                                    <span className="block whitespace-pre-line text-[12px] text-[#03002C]/60">
                                      {session.detail}
                                    </span>
                                  ) : null}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {entry.programmeRoomLine ? (
                    <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#03002C]/50">
                      Programme room line: {entry.programmeRoomLine}
                    </p>
                  ) : null}

                  {entry.notes.length ? (
                    <ul className="mt-3 space-y-1">
                      {entry.notes.map((note) => (
                        <li key={note} className="text-xs leading-relaxed text-[#03002C]/60">
                          {note}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ))}

        {!floors.length ? (
          <p className="mt-9 text-sm text-[#03002C]/70">
            Nothing matches “{query}”. Clear the search to see every room.
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}
