import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { visitDateFilter } from "@/lib/date-filter";
import { routeError } from "@/lib/http";

const Query = z.object({
  q: z.string().trim().max(20).optional(),
  mpc: z.string().trim().max(20).optional(),
  range: z.enum(["all", "30", "90", "180", "360"]).default("all"),
});

type StoreRow = {
  id: number;
  mpc: string;
  street: string;
  regionId: number;
  regionCode: string;
  partnerName: string;
};

export async function GET(request: NextRequest) {
  try {
    const user = requireUser(request);
    const input = Query.parse({
      q: request.nextUrl.searchParams.get("q") || undefined,
      mpc: request.nextUrl.searchParams.get("mpc") || undefined,
      range: request.nextUrl.searchParams.get("range") || "all",
    });
    const db = getDb();
    const normalizedQuery = (input.mpc || input.q || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!normalizedQuery) return Response.json({ stores: [] });

    const accessSql = user.role === "MANAGER"
      ? "1=1"
      : `(s.region_id=? OR EXISTS (
          SELECT 1 FROM visits access_visit
          WHERE access_visit.store_id=s.id AND access_visit.conducted_by=? AND access_visit.status='COMPLETED'
        ))`;
    const accessParams = user.role === "MANAGER" ? [] : [user.regionId, user.id];

    if (!input.mpc) {
      const visibleVisitJoin = user.role === "MANAGER" ? "" : "AND (s.region_id=? OR v.conducted_by=?)";
      const visibleVisitParams = user.role === "MANAGER" ? [] : [user.regionId, user.id];
      const stores = db.prepare(`SELECT s.id,s.mpc,s.street,s.region_id AS regionId,r.code AS regionCode,r.partner_name AS partnerName,
        COUNT(DISTINCT CASE WHEN v.status='COMPLETED' THEN v.id END) AS visitCount,
        MAX(CASE WHEN v.status='COMPLETED' THEN v.completed_at END) AS latestAt
        FROM stores s JOIN partner_regions r ON r.id=s.region_id
        LEFT JOIN visits v ON v.store_id=s.id ${visibleVisitJoin}
        WHERE ${accessSql} AND s.mpc LIKE ?
        GROUP BY s.id ORDER BY CASE WHEN s.mpc=? THEN 0 ELSE 1 END,s.mpc LIMIT 30`)
        .all(...visibleVisitParams, ...accessParams, `${normalizedQuery}%`, normalizedQuery);
      return Response.json({ stores });
    }

    const store = db.prepare(`SELECT s.id,s.mpc,s.street,s.region_id AS regionId,r.code AS regionCode,r.partner_name AS partnerName
      FROM stores s JOIN partner_regions r ON r.id=s.region_id
      WHERE ${accessSql} AND s.mpc=?`).get(...accessParams, normalizedQuery) as StoreRow | undefined;
    if (!store) return Response.json({ error: "Nie znaleziono sklepu lub brak dostępu do jego historii" }, { status: 404 });

    const dateFilter = visitDateFilter(input.range === "360" ? null : input.range);
    const extra360 = input.range === "360" ? "AND v.completed_at>=datetime('now','-360 days')" : "";
    const ownStore = user.role === "MANAGER" || store.regionId === user.regionId;
    const visibilitySql = ownStore ? "" : "AND v.conducted_by=?";
    const visibilityParams = ownStore ? [] : [user.id];
    const visitParams = [store.id, ...dateFilter.params, ...visibilityParams];

    const visits = db.prepare(`SELECT v.id,v.score,v.completed_at AS completedAt,u.display_name AS conductedBy,
      u.role AS conductedByRole,v.employee_ref AS employeeRef
      FROM visits v JOIN users u ON u.id=v.conducted_by
      WHERE v.store_id=? AND v.status='COMPLETED' ${dateFilter.sql} ${extra360} ${visibilitySql}
      ORDER BY v.completed_at DESC`).all(...visitParams) as Array<{
        id: string; score: number; completedAt: string; conductedBy: string;
        conductedByRole: "MANAGER" | "PARTNER"; employeeRef: string | null;
      }>;

    const visitIds = visits.map(item => item.id);
    const issues = visitIds.length ? db.prepare(`SELECT a.question_number AS number,a.question_text AS text,
      COUNT(*) AS checks,SUM(CASE WHEN a.answer=0 THEN 1 ELSE 0 END) AS noCount
      FROM visit_answers a WHERE a.visit_id IN (${visitIds.map(() => "?").join(",")})
      GROUP BY a.question_number,a.question_text HAVING noCount>0
      ORDER BY (noCount * 1.0 / checks) DESC,noCount DESC LIMIT 5`).all(...visitIds) : [];
    const average = visits.length ? visits.reduce((sum, item) => sum + Number(item.score), 0) / visits.length : 0;
    const chronological = [...visits].reverse();
    const trend = chronological.length > 1
      ? Number(chronological.at(-1)?.score || 0) - Number(chronological[0]?.score || 0)
      : 0;

    return Response.json({
      store,
      stats: {
        visitCount: visits.length,
        average: Math.round(average * 10) / 10,
        latestAt: visits[0]?.completedAt || null,
        trend: Math.round(trend * 10) / 10,
      },
      visits,
      issues,
    });
  } catch (error) {
    return routeError(error);
  }
}
