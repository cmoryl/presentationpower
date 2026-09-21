import { LONDON_2026_PROGRAMMES } from "./lib/next-agenda-london-2026";
import { agendaParallels } from "./lib/next-agenda";
for (const [k, p] of Object.entries(LONDON_2026_PROGRAMMES as any)) {
  const days: any[] = (p as any).days ?? [{ sessions: (p as any).sessions ?? [] }];
  days.forEach((d: any, di: number) =>
    (d.sessions ?? []).forEach((s: any) => {
      const pars = agendaParallels(s);
      if (pars.length)
        console.log(k, di, s.time, "main room:", JSON.stringify(s.room ?? ""), pars.map((x: any) => [x.title, x.room ?? "", x.detail]));
    }),
  );
}
