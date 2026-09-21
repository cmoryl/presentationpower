import { LONDON_2026_PROGRAMMES } from "./lib/next-agenda-london-2026";
import { agendaSimultaneousGroups } from "./lib/next-agenda";
for (const [k, p] of Object.entries(LONDON_2026_PROGRAMMES as any)) {
  const days: any[] = (p as any).days ?? [{ sessions: (p as any).sessions ?? [] }];
  days.forEach((d: any, di: number) => {
    const g = agendaSimultaneousGroups(d.sessions ?? []);
    if (g.length)
      console.log(k, "day", di, JSON.stringify(g.map((x: number[]) => x.map((i) => d.sessions[i].time + " | " + d.sessions[i].title))));
  });
}
console.log("done");
