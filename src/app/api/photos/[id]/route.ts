import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { requireUser } from "@/lib/auth";
import { getDb, uploadDirectory } from "@/lib/db";
import { routeError } from "@/lib/http";

export async function GET(request: NextRequest, context: RouteContext<"/api/photos/[id]">) {
  try {
    const user = requireUser(request);
    const { id } = await context.params;
    const access = user.role === "PARTNER" ? "AND (v.conducted_by=? OR v.visited_region_id=?)" : "";
    const args = user.role === "PARTNER" ? [id, user.id, user.regionId] : [id];
    let photo = getDb().prepare(`SELECT p.path,p.mime_type AS mimeType FROM visit_photos p JOIN visits v ON v.id=p.visit_id WHERE p.id=? ${access}`).get(...args) as { path:string;mimeType:string } | undefined;
    if (!photo) photo = getDb().prepare(`SELECT p.photo_path AS path,p.mime_type AS mimeType FROM visit_area_reviews p JOIN visits v ON v.id=p.visit_id WHERE p.id=? AND p.photo_path IS NOT NULL ${access}`).get(...args) as { path:string;mimeType:string } | undefined;
    if (!photo) return NextResponse.json({ error: "Nie znaleziono zdjęcia" }, { status: 404 });
    const safeName = path.basename(photo.path);
    const bytes = await fs.readFile(path.join(/* turbopackIgnore: true */ uploadDirectory(), safeName));
    return new NextResponse(new Uint8Array(bytes), { headers: { "Content-Type": photo.mimeType, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return routeError(error); }
}
