import { LONDON_2026_PROGRAMMES } from "./lib/next-agenda-london-2026";
import { agendaSimultaneousGroups } from "./lib/next-agenda";
for (const p of LONDON_2026_PROGRAMMES as any[]) {
  const days = p.days ?? [{ sessions: p.sessions ?? [] }];
  days.forEach((d: any, di: number) => {
    const g = agendaSimultaneousGroups(d.sessions ?? []);
    if (g.length) console.log(p.id ?? p.slug, "day", di, JSON.stringify(g), g.map(x=>x.map((i:number)=>d.sessions[i].time+" | "+d.sessions[i].title)));
  });
}
console.log("done");
