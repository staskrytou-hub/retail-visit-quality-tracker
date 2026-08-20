import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { audit, requireUser } from "@/lib/auth";
import { getDb, uploadDirectory } from "@/lib/db";
import { routeError } from "@/lib/http";
import { visitAreaLabel } from "@/lib/visit-areas";

export async function GET(request: NextRequest, context: RouteContext<"/api/visits/[id]">) {
  try {
    const user = requireUser(request);
    const { id } = await context.params;
    const access = user.role === "PARTNER" ? "AND (v.conducted_by=? OR v.visited_region_id=?)" : "";
    const args = user.role === "PARTNER" ? [id, user.id, user.regionId] : [id];
    const visit = getDb().prepare(`SELECT v.id,v.score,v.visit_type AS visitType,v.employee_ref AS employeeRef,v.product_detail AS productDetail,
      v.went_well AS wentWell,v.needs_improvement AS needsImprovement,v.comment,v.no_receipt_reason AS noReceiptReason,
      v.started_at AS startedAt,v.completed_at AS completedAt,s.mpc,s.street,r.code AS regionCode,u.display_name AS conductedBy,u.role AS conductedByRole
      FROM visits v JOIN stores s ON s.id=v.store_id JOIN partner_regions r ON r.id=v.visited_region_id JOIN users u ON u.id=v.conducted_by
      WHERE v.id=? ${access}`).get(...args);
    if (!visit) return NextResponse.json({ error: "Nie znaleziono wizyty" }, { status: 404 });
    const answers = getDb().prepare("SELECT question_number AS number,question_text AS text,answer FROM visit_answers WHERE visit_id=? ORDER BY id").all(id);
    const photo = getDb().prepare("SELECT id,mime_type AS mimeType,size FROM visit_photos WHERE visit_id=? LIMIT 1").get(id);
    const areas = (getDb().prepare(`SELECT id,area_key AS areaKey,comment,photo_path AS photoPath,mime_type AS mimeType,size
      FROM visit_area_reviews WHERE visit_id=? ORDER BY CASE area_key WHEN 'warzywa_owoce' THEN 1 WHEN 'pieczywo' THEN 2 ELSE 3 END`).all(id) as Array<Record<string,unknown>>)
      .map(area => ({ ...area, label: visitAreaLabel(String(area.areaKey)), photoId: area.photoPath ? area.id : null }));
    return NextResponse.json({ visit, answers, photo, areas });
  } catch (error) { return routeError(error); }
}

export async function DELETE(request: NextRequest, context: RouteContext<"/api/visits/[id]">) {
  try {
    const user = requireUser(request, { role: "MANAGER" });
    const { id } = await context.params;
    const visit = getDb().prepare("SELECT id FROM visits WHERE id=?").get(id);
    if (!visit) return NextResponse.json({ error: "Nie znaleziono wizyty" }, { status: 404 });
    const files = new Set<string>();
    const receipt = getDb().prepare("SELECT path FROM visit_photos WHERE visit_id=?").get(id) as { path:string } | undefined;
    if (receipt?.path) files.add(receipt.path);
    const areaPhotos = getDb().prepare("SELECT photo_path AS path FROM visit_area_reviews WHERE visit_id=? AND photo_path IS NOT NULL").all(id) as Array<{ path:string }>;
    for (const photo of areaPhotos) files.add(photo.path);
    getDb().transaction(() => {
      getDb().prepare("DELETE FROM visit_assignments WHERE completed_visit_id=?").run(id);
      getDb().prepare("DELETE FROM visits WHERE id=?").run(id);
      audit(user.id, "visit_deleted", "visit", id);
    })();
    await Promise.all([...files].map(file => fs.unlink(path.join(/* turbopackIgnore: true */ uploadDirectory(), path.basename(file))).catch(() => undefined)));
    return NextResponse.json({ ok: true });
  } catch (error) { return routeError(error); }
}
