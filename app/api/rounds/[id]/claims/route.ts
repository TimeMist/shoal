import { claudeTriage, triage } from "@/lib/agents/triage";
import type { Photo } from "@/lib/agents/triage";
import { ConfigError, body, fail } from "@/lib/http";
import type { Claim } from "@/lib/store";
import { getState } from "@/lib/store";

const MAX_PHOTO = 5 * 1024 * 1024;

// JSON `photo` as a base64 data URL; jpeg or png, at most 5 MB decoded.
function parsePhoto(v: unknown): Photo | null {
  const m = typeof v === "string" ? /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/]+={0,2})$/.exec(v) : null;
  if (!m || Buffer.from(m[2], "base64").length > MAX_PHOTO) return null;
  return { media_type: m[1] as Photo["media_type"], data: m[2] };
}

export async function POST(request: Request, ctx: RouteContext<"/api/rounds/[id]/claims">) {
  const { id } = await ctx.params;
  const s = getState(id);
  if (!s) return fail("Round not found", 404);
  const b = await body(request);
  const c = s.commitments.find((x) => x.id === b.commitmentId);
  if (!c) return fail("Commitment not found", 404);
  if (!["missing", "damaged", "short"].includes(b.kind as string)) return fail("kind must be missing, damaged or short", 400);
  if (!Number.isInteger(b.cartons) || (b.cartons as number) < 1 || (b.cartons as number) > c.qty) return fail("cartons must be between 1 and the shop's order", 400);
  let photo: Photo | undefined;
  if (b.photo !== undefined) {
    photo = parsePhoto(b.photo) ?? undefined;
    if (!photo) return fail("photo must be a JPEG or PNG data URL, 5 MB or less", 400);
  }
  if (c.status !== "captured" && c.status !== "delivered") return fail("Claims can only be filed on a captured or delivered order", 409);

  const claim: Claim = {
    id: crypto.randomUUID(),
    commitmentId: c.id,
    kind: b.kind as Claim["kind"],
    cartons: b.cartons as number,
    note: typeof b.note === "string" ? b.note.slice(0, 1000) : "",
    hasPhoto: !!photo,
    priorStatus: c.status,
    status: "open",
  };
  // Claim the slot before the slow model call so a second filing gets a 409.
  const before = c.status;
  c.status = "claim";
  try {
    claim.proposal = await triage(claim, c, s.round.finalPrice ?? 0, s.holdbackLeft, claudeTriage, photo);
  } catch (e) {
    c.status = before;
    if (e instanceof ConfigError) return fail(e.message, e.status);
    return fail(e instanceof Error ? e.message : "Triage failed", 502);
  }
  s.claims.push(claim);
  return Response.json(claim);
}
