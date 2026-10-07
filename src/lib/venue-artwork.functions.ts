// AI design review for a submitted venue spot: reads the location photo, the
// live file's artboards and the event's past lessons, and returns a design
// brief in the event's existing look. It never sets sizes or invents facts.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AI_MODELS } from "@/lib/ai-models";

export const reviewVenueArtwork = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ spotId: z.string().uuid(), eventId: z.string().min(1).max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: spot, error } = await sb
      .from("venue_sign_spots")
      .select("id,label,kind,floor_key,room,w_in,h_in,sides,note,photo_path,artwork_name,artboards,venue_id")
      .eq("id", data.spotId)
      .single();
    if (error || !spot) throw new Error(error?.message ?? "Spot not found.");
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured.");

    let photoUrl: string | null = null;
    if (spot.photo_path) {
      const s = await sb.storage.from("venue-sign-photos").createSignedUrl(spot.photo_path, 600);
      photoUrl = s.data?.signedUrl ?? null;
    }
    const { data: lessons } = await sb
      .from("event_venue_knowledge")
      .select("title,body,city")
      .or("body.ilike.%floor%,body.ilike.%stair%,body.ilike.%vinyl%,body.ilike.%gradient%,body.ilike.%legib%,title.ilike.%floor%,title.ilike.%stair%")
      .order("updated_at", { ascending: false })
      .limit(15);

    const facts = {
      spot: spot.label,
      type: spot.kind,
      floor: spot.floor_key,
      room: spot.room,
      measured_size_in: spot.w_in && spot.h_in ? `${spot.w_in} x ${spot.h_in}` : "NOT MEASURED",
      sides: spot.sides,
      note: spot.note,
      live_file: spot.artwork_name,
      live_file_artboards_in: spot.artboards,
    };
    const system =
      "You are the TransPerfect NEXT 2026 event design reviewer. House look: enterprise palette only (ink #03002C, blue #003FC7, surface #EEF1F7, white), NEXT gradient ramp from deep blue, Geist Bold type, white lockups on dark grounds, NEXT arrows as the graphic device. Body text never in accent colours. RGB house colour space; never suggest silently converting to CMYK. " +
      "Review the submitted venue spot using the location photo, the live file artboards and past event lessons. Return JSON {\"summary\":string,\"fit\":[{\"ok\":boolean,\"text\":string}],\"design\":[string],\"risks\":[string],\"ask_venue\":[string]}. " +
      "fit = checks of the live file against the spot (artboard count vs visible surfaces, proportions, bleed present or missing, measured size missing). design = concrete steps to design it in the existing NEXT look (where the logo/wording reads from the approach angle, gradient direction, arrows, what to keep plain). risks = print/on-site issues (slip-resistant laminate for floors and treads, seams on riser/tread edges, legibility from distance, foot traffic). ask_venue = facts still needed. " +
      "Never invent measurements, dates, rooms or facts; if size is NOT MEASURED, say it must be measured on site and that artboard sizes are the designer's, not a survey. Cite a past lesson when you use one. Max 6 items per list. Plain English.";
    const userContent: unknown[] = [
      { type: "text", text: `Spot facts:\n${JSON.stringify(facts, null, 2)}\n\nPast event lessons:\n${(lessons ?? []).map((l) => `- ${l.title} (${l.city ?? "all events"}): ${String(l.body).slice(0, 300)}`).join("\n") || "none"}` },
    ];
    if (photoUrl) userContent.push({ type: "image_url", image_url: { url: photoUrl } });

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: AI_MODELS.quick,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: userContent }],
      }),
    });
    if (!res.ok) throw new Error(res.status === 429 ? "AI is busy, try again shortly." : res.status === 402 ? "AI credits are used up." : `AI error ${res.status}`);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const Out = z.object({
      summary: z.string().max(1500),
      fit: z.array(z.object({ ok: z.boolean(), text: z.string().max(400) })).max(8),
      design: z.array(z.string().max(400)).max(8),
      risks: z.array(z.string().max(400)).max(8),
      ask_venue: z.array(z.string().max(400)).max(8),
    });
    let review: z.infer<typeof Out>;
    try {
      review = Out.parse(JSON.parse(json.choices?.[0]?.message?.content ?? "{}"));
    } catch {
      throw new Error("The review couldn't be read. Nothing was changed — try again.");
    }
    const { error: upErr } = await sb
      .from("venue_sign_spots")
      .update({ review: review as never, reviewed_at: new Date().toISOString() })
      .eq("id", spot.id);
    if (upErr) throw new Error(upErr.message);
    return { review, usedPhoto: !!photoUrl, lessons: lessons?.length ?? 0 };
  });
