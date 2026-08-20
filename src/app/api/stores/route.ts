import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { routeError } from "@/lib/http";
import { normalizeMpcs } from "@/lib/logic";

const Query = z.object({
  mpcs: z.array(z.string()).max(50).optional(),
  regionId: z.number().int().positive().optional(),
  purpose: z.enum(["VISIT","PLANNING"]).default("VISIT"),
});

export async function POST(request: NextRequest) {
  try {
    const user = requireUser(request);
    const input = Query.parse(await request.json());
    if (input.regionId) {
      if (user.role === "PARTNER" && input.purpose === "PLANNING" && input.regionId !== user.regionId) return NextResponse.json({ error: "Można planować tylko sklepy własnej struktury" }, { status: 403 });
      const stores = getDb().prepare(`SELECT s.id,s.mpc,s.street,r.code AS regionCode FROM stores s JOIN partner_regions r ON r.id=s.region_id
        WHERE s.region_id=? ORDER BY s.mpc`).all(input.regionId);
      return NextResponse.json({ stores });
    }
    const normalized = normalizeMpcs(input.mpcs || []);
    if (!normalized.length) return NextResponse.json({ stores: [], missing: [] });
    const placeholders = normalized.map(() => "?").join(",");
    const stores = getDb().prepare(`SELECT s.id,s.mpc,s.street,r.code AS regionCode FROM stores s JOIN partner_regions r ON r.id=s.region_id
      WHERE s.mpc IN (${placeholders}) ORDER BY s.mpc`).all(...normalized) as { mpc: string }[];
    const found = new Set(stores.map(s => s.mpc));
    const missing = normalized.filter(mpc => !found.has(mpc));
    return NextResponse.json({ stores, missing });
  } catch (error) { return routeError(error); }
}
