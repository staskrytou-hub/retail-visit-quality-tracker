import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";
import { requireUser } from "@/lib/auth";
import { QUESTIONS } from "@/lib/constants";
import { getDb, uploadDirectory } from "@/lib/db";
import { visitDateFilter } from "@/lib/date-filter";
import { routeError } from "@/lib/http";

export const runtime = "nodejs";

function pdfFontPath() {
  return [
    process.env.PDF_FONT_REGULAR,
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "C:/Windows/Fonts/arial.ttf",
  ].find((candidate): candidate is string => Boolean(candidate && fs.existsSync(candidate)));
}

function createPdf(filter: ReturnType<typeof visitDateFilter>) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 44, size: "A4", info: { Title: "Retail Visit Quality Report" } });
    const chunks: Buffer[] = [];
    doc.on("data", chunk => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    const reportFont = pdfFontPath();
    if (!reportFont) throw new Error("Brak czcionki Unicode wymaganej do wygenerowania raportu PDF.");
    doc.font(reportFont);
    const visits = getDb().prepare(`SELECT v.id,v.score,v.completed_at AS completedAt,s.mpc,r.code AS regionCode,u.display_name AS conductedBy,
      p.path AS photoPath FROM visits v JOIN stores s ON s.id=v.store_id JOIN partner_regions r ON r.id=v.visited_region_id
      JOIN users u ON u.id=v.conducted_by LEFT JOIN visit_photos p ON p.visit_id=v.id WHERE v.status='COMPLETED' ${filter.sql} ORDER BY v.completed_at DESC`).all(...filter.params) as Record<string, unknown>[];
    doc.fillColor("#0b5d38").fontSize(20).text("Retail Visit Quality Tracker");
    doc.fillColor("#334155").fontSize(10).text(`Raport wygenerowano: ${new Date().toLocaleString("pl-PL")}`);
    doc.moveDown().fillColor("#111827").fontSize(12).text(`Zakończone wizyty: ${visits.length}`);
    for (const question of QUESTIONS) {
      const result = getDb().prepare(`SELECT COUNT(*) AS total,SUM(a.answer) AS yes FROM visit_answers a JOIN visits v ON v.id=a.visit_id
        WHERE a.question_number=? ${filter.sql}`).get(question.number, ...filter.params) as { total:number;yes:number|null };
      const percent = result.total ? Math.round(((result.yes || 0) / result.total) * 100) : 0;
      doc.fontSize(9).text(`${question.number}. ${question.text} — ${percent}% Tak`);
    }
    doc.moveDown();
    for (const visit of visits) {
      if (doc.y > 700) doc.addPage();
      doc.fillColor("#0b5d38").fontSize(12).text(`${visit.mpc} · ${visit.regionCode} · ${Math.round(Number(visit.score))}%`);
      doc.fillColor("#475569").fontSize(9).text(`${visit.conductedBy} · ${new Date(String(visit.completedAt)).toLocaleString("pl-PL")}`);
      if (visit.photoPath) {
        const photoPath = path.join(/* turbopackIgnore: true */ uploadDirectory(), path.basename(String(visit.photoPath)));
        if (fs.existsSync(photoPath)) {
          try { doc.image(photoPath, { fit: [120, 80] }); } catch { doc.text("[Nie można osadzić zdjęcia]"); }
        }
      }
      doc.moveDown(0.6);
    }
    const receipts = visits.filter(visit => visit.photoPath);
    for (const visit of receipts) {
      const photoPath = path.join(/* turbopackIgnore: true */ uploadDirectory(), path.basename(String(visit.photoPath)));
      if (!fs.existsSync(photoPath)) continue;
      doc.addPage();
      doc.rect(0, 0, 595, 82).fill("#0b6b43");
      doc.fillColor("#ffffff").fontSize(20).text("Paragon - potwierdzenie wizyty", 44, 31, { width: 507 });
      doc.fillColor("#17211d").fontSize(10).text(`${visit.mpc} · ${visit.regionCode} · ${new Date(String(visit.completedAt)).toLocaleString("pl-PL")}`, 44, 99, { width: 507 });
      try { doc.image(photoPath, 44, 126, { fit: [507, 620], align: "center", valign: "center" }); }
      catch { doc.fillColor("#b42318").fontSize(11).text("Nie można osadzić zdjęcia paragonu.", 44, 140); }
    }
    doc.end();
  });
}

export async function GET(request: NextRequest) {
  try {
    requireUser(request, { role: "MANAGER" });
    const filter = visitDateFilter(request.nextUrl.searchParams.get("range"), request.nextUrl.searchParams.get("from"), request.nextUrl.searchParams.get("to"));
    const pdf = await createPdf(filter);
    return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="retail-visit-report-${new Date().toISOString().slice(0,10)}.pdf"` } });
  } catch (error) { return routeError(error); }
}
