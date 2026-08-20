import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { audit, requireUser } from "@/lib/auth";
import { EXTENDED_QUESTIONS } from "@/lib/constants";
import { getDb, uploadDirectory } from "@/lib/db";
import { routeError } from "@/lib/http";
import { calculateScoreForQuestions } from "@/lib/logic";
import { VISIT_AREAS } from "@/lib/visit-areas";

const Payload = z.object({
  idempotencyKey: z.string().min(10).max(100), storeId: z.number().int().positive(), employeeRef: z.string().trim().min(1).max(100),
  assignmentId: z.string().uuid().optional(),
  productDetail: z.string().max(500).optional(), wentWell: z.string().max(1500).optional(), needsImprovement: z.string().max(1500).optional(),
  comment: z.string().max(2000).optional(), noReceiptReason: z.string().max(500).optional(),
  receiptUploadId: z.string().uuid().optional(),
  areaUploadIds: z.object({
    warzywa_owoce: z.string().uuid().optional(),
    pieczywo: z.string().uuid().optional(),
    dania_przekaski: z.string().uuid().optional(),
  }).optional(),
  areas: z.object({
    warzywa_owoce: z.string().max(1000).optional(),
    pieczywo: z.string().max(1000).optional(),
    dania_przekaski: z.string().max(1000).optional(),
  }).optional(),
  answers: z.record(z.string(), z.boolean()), startedAt: z.string().datetime().optional(),
});

const allowedMime = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
type StoredImage = { id:string; name:string; mime:string; size:number; checksum:string; staged:boolean };

export async function POST(request: NextRequest) {
  const savedPaths: string[] = [];
  try {
    const user = requireUser(request);
    const form = await request.formData();
    const rawPayload = form.get("payload");
    if (typeof rawPayload !== "string") return NextResponse.json({ error: "Brak danych wizyty" }, { status: 400 });
    const payload = Payload.parse(JSON.parse(rawPayload));
    const existing = getDb().prepare("SELECT id,score FROM visits WHERE idempotency_key=?").get(payload.idempotencyKey) as { id:string;score:number } | undefined;
    if (existing) return NextResponse.json({ ok: true, visit: existing, duplicate: true });

    const store = getDb().prepare("SELECT id,region_id FROM stores WHERE id=?").get(payload.storeId) as { id:number;region_id:number } | undefined;
    if (!store) return NextResponse.json({ error: "Nie znaleziono sklepu" }, { status: 404 });
    if (payload.assignmentId) {
      const assignment = getDb().prepare(`SELECT id,assignee_user_id AS assigneeUserId,store_id AS storeId,status
        FROM visit_assignments WHERE id=?`).get(payload.assignmentId) as {id:string;assigneeUserId:number;storeId:number;status:string}|undefined;
      if (!assignment || assignment.status !== "PENDING" || assignment.assigneeUserId !== user.id || assignment.storeId !== payload.storeId) {
        return NextResponse.json({ error: "To zlecenie wizyty jest nieaktualne lub nie pasuje do wybranego sklepu" }, { status: 409 });
      }
    }
    const visitQuestions = EXTENDED_QUESTIONS;
    const normalizedAnswers = visitQuestions.map(q => ({ ...q, answer: payload.answers[String(q.number)] }));
    if (normalizedAnswers.some(item => typeof item.answer !== "boolean")) return NextResponse.json({ error: `Odpowiedz na wszystkie ${visitQuestions.length} pytań` }, { status: 400 });
    const score = calculateScoreForQuestions(normalizedAnswers);

    const file = form.get("receipt");
    const hasFile = file instanceof File && file.size > 0;
    if (!hasFile && !payload.receiptUploadId) return NextResponse.json({ error: "Zdjęcie paragonu jest wymagane" }, { status: 400 });
    function stagedImage(id:string): StoredImage {
      const item = getDb().prepare("SELECT id,path,mime_type AS mime,size,checksum FROM pending_uploads WHERE id=? AND created_by=?")
        .get(id,user.id) as {id:string;path:string;mime:string;size:number;checksum:string}|undefined;
      if (!item) throw NextResponse.json({ error: "Jedno ze zdjęć wygasło lub nie zostało przesłane. Spróbuj zapisać wizytę ponownie." }, { status: 409 });
      return { id:item.id, name:item.path, mime:item.mime, size:item.size, checksum:item.checksum, staged:true };
    }
    async function saveImage(image:File): Promise<StoredImage> {
      if (image.size > 10 * 1024 * 1024) throw NextResponse.json({ error: "Każde zdjęcie może mieć maksymalnie 10 MB" }, { status: 413 });
      if (!allowedMime.has(image.type)) throw NextResponse.json({ error: "Dozwolone formaty zdjęć: JPG, PNG, WEBP, HEIC" }, { status: 415 });
      const bytes = Buffer.from(await image.arrayBuffer());
      let imageBytes: Buffer;
      try { imageBytes = await sharp(bytes).rotate().jpeg({ quality: 88, mozjpeg: true }).toBuffer(); }
      catch { throw NextResponse.json({ error: "Nie udało się odczytać jednego ze zdjęć. Zrób nowe zdjęcie i spróbuj ponownie." }, { status: 415 }); }
      const id = randomUUID();
      const name = `${id}.jpg`;
      const savedPath = path.join(/* turbopackIgnore: true */ uploadDirectory(), name);
      await fs.writeFile(savedPath, imageBytes, { flag: "wx" });
      savedPaths.push(savedPath);
      return { id, name, mime: "image/jpeg", size: imageBytes.length, checksum: createHash("sha256").update(imageBytes).digest("hex"), staged:false };
    }

    let photo: StoredImage | null = payload.receiptUploadId ? stagedImage(payload.receiptUploadId) : null;
    if (!photo && hasFile) {
      if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Zdjęcie może mieć maksymalnie 10 MB" }, { status: 413 });
      if (!allowedMime.has(file.type)) return NextResponse.json({ error: "Dozwolone formaty: JPG, PNG, WEBP, HEIC" }, { status: 415 });
      photo = await saveImage(file);
    }

    const areaReviews: Array<{id:string;key:string;comment:string|null;photo:StoredImage|null}> = [];
    for (const area of VISIT_AREAS) {
      const rawAreaPhoto = form.get(`areaPhoto:${area.key}`);
      const areaPhotoFile = rawAreaPhoto instanceof File && rawAreaPhoto.size > 0 ? rawAreaPhoto : null;
      const stagedAreaId = payload.areaUploadIds?.[area.key];
      const comment = payload.areas?.[area.key]?.trim() || null;
      if (!areaPhotoFile && !stagedAreaId && !comment) continue;
      areaReviews.push({ id: randomUUID(), key: area.key, comment, photo: stagedAreaId ? stagedImage(stagedAreaId) : areaPhotoFile ? await saveImage(areaPhotoFile) : null });
    }

    const visitId = randomUUID();
    const completedAt = new Date().toISOString();
    getDb().transaction(() => {
      getDb().prepare(`INSERT INTO visits(id,idempotency_key,conducted_by,visited_region_id,store_id,visit_type,status,score,employee_ref,product_detail,went_well,needs_improvement,comment,no_receipt_reason,started_at,completed_at)
        VALUES (?,?,?,?,?,?,'COMPLETED',?,?,?,?,?,?,?,?,?)`).run(visitId, payload.idempotencyKey, user.id, store.region_id, store.id, "EXTENDED", score,
        payload.employeeRef, payload.productDetail?.trim() || null, payload.wentWell?.trim() || null,
        payload.needsImprovement?.trim() || null, payload.comment?.trim() || null, null,
        payload.startedAt || completedAt, completedAt);
      const insertAnswer = getDb().prepare("INSERT INTO visit_answers(visit_id,question_number,question_text,answer) VALUES (?,?,?,?)");
      for (const item of normalizedAnswers) insertAnswer.run(visitId, item.number, item.text, item.answer ? 1 : 0);
      if (photo) getDb().prepare("INSERT INTO visit_photos(id,visit_id,path,mime_type,size,checksum,created_by) VALUES (?,?,?,?,?,?,?)")
        .run(photo.id, visitId, photo.name, photo.mime, photo.size, photo.checksum, user.id);
      const insertArea = getDb().prepare("INSERT INTO visit_area_reviews(id,visit_id,area_key,comment,photo_path,mime_type,size,checksum,created_by) VALUES (?,?,?,?,?,?,?,?,?)");
      for (const area of areaReviews) insertArea.run(area.id, visitId, area.key, area.comment, area.photo?.name || null, area.photo?.mime || null, area.photo?.size || null, area.photo?.checksum || null, user.id);
      for (const image of [photo,...areaReviews.map(area=>area.photo)]) if (image?.staged) {
        getDb().prepare("DELETE FROM pending_uploads WHERE id=? AND created_by=?").run(image.id,user.id);
      }
      if (payload.assignmentId) getDb().prepare(`UPDATE visit_assignments SET status='COMPLETED',completed_visit_id=?,completed_at=?
        WHERE id=? AND assignee_user_id=? AND status='PENDING'`).run(visitId,completedAt,payload.assignmentId,user.id);
      audit(user.id, "visit_completed", "visit", visitId);
    })();
    return NextResponse.json({ ok: true, visit: { id: visitId, score } }, { status: 201 });
  } catch (error) {
    await Promise.all(savedPaths.map(savedPath => fs.unlink(savedPath).catch(() => undefined)));
    if (error instanceof z.ZodError || error instanceof SyntaxError) return NextResponse.json({ error: "Nieprawidłowe dane wizyty" }, { status: 400 });
    return routeError(error);
  }
}
