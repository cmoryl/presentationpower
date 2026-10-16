// GET /api/public/venue/next-sf → the venue's floor plans (hotel's own vector
// drawings) and room list, for BoothHub to lay under its 3D booths and signs.
// Public by design: the data is the hotel's own published fact sheet. No
// private fields, no user data. Plan scale is not claimed (the sheet carries
// none), so `metresPerUnit` is null and BoothHub fits the plan to its ground.
import { createFileRoute } from "@tanstack/react-router";
import { SF_EVENT } from "@/lib/event-booths";
import { SF_VENUE_FACT_SHEET, SF_VENUE_FLOORS, SF_VENUE_ROOMS } from "@/lib/next-sf-venue-rooms";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, max-age=300",
};

export const Route = createFileRoute("/api/public/venue/$event")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request, params }) => {
        if (params.event !== SF_EVENT && params.event !== "san-francisco") {
          return Response.json({ error: "No venue for this event." }, { status: 404, headers: CORS });
        }
        const origin = new URL(request.url).origin;
        const abs = (u: string) => (u.startsWith("http") ? u : `${origin}${u}`);
        return Response.json(
          {
            event: SF_EVENT,
            venue: "InterContinental San Francisco",
            source: SF_VENUE_FACT_SHEET.source,
            caution: SF_VENUE_FACT_SHEET.caution,
            metresPerUnit: null,
            floors: SF_VENUE_FLOORS.map((f) => ({
              id: `${SF_EVENT}:${f.floor}`,
              floor: f.floor,
              title: f.title,
              planSvg: abs(f.vectorUrl),
              planImage: abs(f.url),
              rooms: SF_VENUE_ROOMS.filter((r) => r.floor === f.floor).map((r) => ({
                name: r.name,
                dimsFt: r.dims,
                heightFt: r.heightFt,
                sqft: r.sqft,
                theater: r.theater,
                reception: r.reception,
              })),
            })),
          },
          { headers: CORS },
        );
      },
    },
  },
});
