import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { visitDateFilter } from "@/lib/date-filter";
import { routeError } from "@/lib/http";

export async function GET(request: NextRequest) {
  try {
    requireUser(request, { role: "MANAGER" });
    const filter = visitDateFilter(request.nextUrl.searchParams.get("range"), request.nextUrl.searchParams.get("from"), request.nextUrl.searchParams.get("to"));
    const analytics = getDb().prepare(`SELECT r.id,r.code,r.partner_name AS partnerName,COUNT(v.id) AS completed,
      COALESCE(ROUND(AVG(v.score),1),0) AS average,COALESCE(SUM(CASE WHEN v.score=100 THEN 1 ELSE 0 END),0) AS perfect,
      COUNT(DISTINCT v.store_id) AS visitedStores
      FROM partner_regions r LEFT JOIN visits v ON v.visited_region_id=r.id AND v.status='COMPLETED' ${filter.sql}
      GROUP BY r.id ORDER BY r.code`).all(...filter.params);
    const stores = getDb().prepare(`SELECT s.id AS storeId,s.mpc,s.street,v.visited_region_id AS regionId,COUNT(v.id) AS completed,
      ROUND(AVG(v.score),1) AS average,MAX(v.completed_at) AS latestAt
      FROM visits v JOIN stores s ON s.id=v.store_id
      WHERE v.status='COMPLETED' ${filter.sql}
      GROUP BY s.id,s.mpc,s.street,v.visited_region_id ORDER BY latestAt DESC`).all(...filter.params);
    const visits = getDb().prepare(`SELECT v.id,v.visited_region_id AS regionId,v.store_id AS storeId,s.mpc,s.street,v.score,
      v.completed_at AS completedAt,u.display_name AS conductedBy,u.role AS conductedByRole
      FROM visits v JOIN stores s ON s.id=v.store_id JOIN users u ON u.id=v.conducted_by
      WHERE v.status='COMPLETED' ${filter.sql} ORDER BY v.completed_at DESC`).all(...filter.params);
    const alerts = getDb().prepare(`SELECT v.visited_region_id AS regionId,v.store_id AS storeId,s.mpc,
      a.question_number AS number,a.question_text AS text,COUNT(*) AS noCount,MAX(v.completed_at) AS latestAt
      FROM visit_answers a JOIN visits v ON v.id=a.visit_id JOIN stores s ON s.id=v.store_id
      WHERE v.status='COMPLETED' AND a.answer=0 ${filter.sql}
      GROUP BY v.store_id,a.question_number HAVING COUNT(*)>=2
      ORDER BY noCount DESC,latestAt DESC`).all(...filter.params);
    return Response.json({ analytics, stores, visits, alerts });
  } catch (error) { return routeError(error); }
}
