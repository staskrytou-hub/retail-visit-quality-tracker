import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { audit, requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { routeError } from "@/lib/http";
import { googleMapsDirectionsUrl } from "@/lib/logic";

const Navigation = z.object({ storeId: z.number().int().positive() });

function getNavigation(user: ReturnType<typeof requireUser>, storeId: number) {
  const store = getDb().prepare("SELECT id,mpc,city,street,region_id FROM stores WHERE id=?").get(storeId) as { id:number;mpc:string;city:string;street:string;region_id:number } | undefined;
  if (!store) return { error: NextResponse.json({ error: "Nie znaleziono sklepu" }, { status: 404 }) };
  audit(user.id, "navigation_opened", "store", String(store.id));
  return { url: googleMapsDirectionsUrl(store.city, store.street, store.mpc) };
}

export async function GET(request: NextRequest) {
  try {
    const user = requireUser(request);
    const { storeId } = Navigation.parse({ storeId: Number(request.nextUrl.searchParams.get("storeId")) });
    const result = getNavigation(user, storeId);
    if (result.error) return result.error;
    return NextResponse.redirect(result.url);
  } catch (error) { return routeError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireUser(request);
    const { storeId } = Navigation.parse(await request.json());
    const result = getNavigation(user, storeId);
    if (result.error) return result.error;
    return NextResponse.json({ url: result.url });
  } catch (error) { return routeError(error); }
}
