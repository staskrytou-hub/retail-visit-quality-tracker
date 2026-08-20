import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { requireUser } from "@/lib/auth";
import { getDb, uploadDirectory } from "@/lib/db";
import { routeError } from "@/lib/http";

const allowedMime = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const MAX_SOURCE_SIZE = 25 * 1024 * 1024;

async function cleanupExpiredUploads() {
  const expired = getDb().prepare("SELECT id,path FROM pending_uploads WHERE created_at < datetime('now','-24 hours') LIMIT 100")
    .all() as Array<{id:string;path:string}>;
  for (const item of expired) {
    await fs.unlink(path.join(/* turbopackIgnore: true */ uploadDirectory(), item.path)).catch(() => undefined);
    getDb().prepare("DELETE FROM pending_uploads WHERE id=?").run(item.id);
  }
}

export async function POST(request: NextRequest) {
  let savedPath = "";
  try {
    const user = requireUser(request);
    await cleanupExpiredUploads();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Brak zdjęcia" }, { status: 400 });
    if (file.size > MAX_SOURCE_SIZE) return NextResponse.json({ error: "Pojedyncze zdjęcie jest zbyt duże (maks. 25 MB)" }, { status: 413 });
    if (!allowedMime.has(file.type)) return NextResponse.json({ error: "Dozwolone formaty: JPG, PNG, WEBP, HEIC" }, { status: 415 });

    const source = Buffer.from(await file.arrayBuffer());
    let imageBytes: Buffer;
    try {
      imageBytes = await sharp(source)
        .rotate()
        .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer();
    } catch {
      return NextResponse.json({ error: "Nie udało się odczytać zdjęcia. Zrób nowe zdjęcie i spróbuj ponownie." }, { status: 415 });
    }

    const id = randomUUID();
    const name = `${id}.jpg`;
    savedPath = path.join(/* turbopackIgnore: true */ uploadDirectory(), name);
    await fs.writeFile(savedPath, imageBytes, { flag: "wx" });
    getDb().prepare("INSERT INTO pending_uploads(id,path,mime_type,size,checksum,created_by) VALUES (?,?,?,?,?,?)")
      .run(id, name, "image/jpeg", imageBytes.length, createHash("sha256").update(imageBytes).digest("hex"), user.id);
    return NextResponse.json({ upload: { id, size: imageBytes.length } }, { status: 201 });
  } catch (error) {
    if (savedPath) await fs.unlink(savedPath).catch(() => undefined);
    return routeError(error);
  }
}
