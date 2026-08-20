import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { EXTENDED_QUESTIONS, QUESTIONS } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { routeError } from "@/lib/http";
import { startOfWarsawWeekIso } from "@/lib/week";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = requireUser(request, { allowPasswordChange: true });
    if (user.mustChangePassword) return Response.json({ user, mustChangePassword: true });
    const db = getDb();
    const weekStart = startOfWarsawWeekIso();
    const regions = db.prepare(`SELECT r.id,r.code,r.partner_name AS partnerName,COUNT(s.id) AS storeCount
      FROM partner_regions r LEFT JOIN stores s ON s.region_id=r.id GROUP BY r.id ORDER BY r.code`).all();
    const where = user.role === "PARTNER" ? "WHERE v.conducted_by=?" : "";
    const statusFilter = user.role === "PARTNER" ? "WHERE v.conducted_by=? AND v.status='COMPLETED'" : "WHERE v.status='COMPLETED'";
    const args = user.role === "PARTNER" ? [user.id] : [];
    const stats = db.prepare(`SELECT COUNT(*) AS completed,
      COALESCE(ROUND(AVG(score),1),0) AS average,
      SUM(CASE WHEN completed_at >= ? THEN 1 ELSE 0 END) AS thisWeek,
      SUM(CASE WHEN date(completed_at)=date('now') THEN 1 ELSE 0 END) AS today
      FROM visits v ${statusFilter}`).get(weekStart, ...args);
    const recent = db.prepare(`SELECT v.id,v.score,v.completed_at AS completedAt,s.mpc,s.street,r.code AS regionCode,u.display_name AS conductedBy,u.role AS conductedByRole
      FROM visits v JOIN stores s ON s.id=v.store_id JOIN partner_regions r ON r.id=v.visited_region_id JOIN users u ON u.id=v.conducted_by
      ${where} ORDER BY v.completed_at DESC`).all(...args);
    const incomingVisits = user.role === "PARTNER" ? db.prepare(`SELECT v.id,v.score,v.completed_at AS completedAt,s.mpc,s.street,r.code AS regionCode,u.display_name AS conductedBy,u.role AS conductedByRole
      FROM visits v JOIN stores s ON s.id=v.store_id JOIN partner_regions r ON r.id=v.visited_region_id JOIN users u ON u.id=v.conducted_by
      WHERE v.status='COMPLETED' AND v.visited_region_id=? ORDER BY v.completed_at DESC`).all(user.regionId) : null;
    const performedVisits = user.role === "PARTNER" ? db.prepare(`SELECT v.id,v.score,v.completed_at AS completedAt,s.mpc,s.street,r.code AS regionCode,u.display_name AS conductedBy,u.role AS conductedByRole
      FROM visits v JOIN stores s ON s.id=v.store_id JOIN partner_regions r ON r.id=v.visited_region_id JOIN users u ON u.id=v.conducted_by
      WHERE v.status='COMPLETED' AND v.conducted_by=? ORDER BY v.completed_at DESC`).all(user.id) : null;
    const incomingStats = user.role === "PARTNER" ? db.prepare(`SELECT COUNT(*) AS received,
      COALESCE(ROUND(AVG(score),1),0) AS receivedAverage,
      SUM(CASE WHEN completed_at >= ? THEN 1 ELSE 0 END) AS receivedThisWeek,
      SUM(CASE WHEN date(completed_at)=date('now') THEN 1 ELSE 0 END) AS receivedToday
      FROM visits WHERE status='COMPLETED' AND visited_region_id=?`).get(weekStart, user.regionId) as Record<string,number> : null;
    const partnerStats = user.role === "PARTNER" ? {
      ...incomingStats,
      performed: Number((stats as Record<string,number>).completed || 0),
      performedAverage: Number((stats as Record<string,number>).average || 0),
      performedThisWeek: Number((stats as Record<string,number>).thisWeek || 0),
      performedToday: Number((stats as Record<string,number>).today || 0),
    } : null;
    const managerAnalytics = user.role === "MANAGER" ? db.prepare(`SELECT r.id,r.code,r.partner_name AS partnerName,COUNT(v.id) AS completed,
      COALESCE(ROUND(AVG(v.score),1),0) AS average,COALESCE(SUM(CASE WHEN v.score=100 THEN 1 ELSE 0 END),0) AS perfect,
      COUNT(DISTINCT v.store_id) AS visitedStores
      FROM partner_regions r LEFT JOIN visits v ON v.visited_region_id=r.id AND v.status='COMPLETED'
      GROUP BY r.id ORDER BY r.code`).all() : null;
    const assignableUsers = db.prepare(`SELECT u.id,u.display_name AS displayName,u.role,u.region_id AS regionId,r.code AS regionCode
      FROM users u LEFT JOIN partner_regions r ON r.id=u.region_id
      WHERE u.id<>? AND lower(u.login) NOT IN ('admin','administrator','demo.admin')
      ORDER BY CASE u.role WHEN 'MANAGER' THEN 0 ELSE 1 END,r.code`).all(user.id);
    const pendingAssignments = db.prepare(`SELECT a.id,a.store_id AS storeId,a.target_region_id AS targetRegionId,
      a.created_at AS createdAt,s.mpc,s.street,r.code AS regionCode,creator.display_name AS assignedBy
      FROM visit_assignments a JOIN stores s ON s.id=a.store_id JOIN partner_regions r ON r.id=a.target_region_id
      JOIN users creator ON creator.id=a.assigned_by
      WHERE a.assignee_user_id=? AND a.status='PENDING' ORDER BY r.code,s.mpc`).all(user.id);
    const assignmentOverview = user.role === "MANAGER" ? db.prepare(`SELECT a.id,a.status,a.created_at AS createdAt,a.completed_at AS completedAt,
      s.mpc,s.street,r.code AS regionCode,creator.display_name AS assignedBy,assignee.display_name AS assignee,
      assignee.role AS assigneeRole,assigneeRegion.code AS assigneeRegionCode,a.completed_visit_id AS completedVisitId
      FROM visit_assignments a
      JOIN stores s ON s.id=a.store_id
      JOIN partner_regions r ON r.id=a.target_region_id
      JOIN users creator ON creator.id=a.assigned_by
      JOIN users assignee ON assignee.id=a.assignee_user_id
      LEFT JOIN partner_regions assigneeRegion ON assigneeRegion.id=assignee.region_id
      ORDER BY CASE a.status WHEN 'PENDING' THEN 0 WHEN 'COMPLETED' THEN 1 ELSE 2 END,a.created_at DESC
      LIMIT 300`).all() : null;
    return Response.json({ user, mustChangePassword: false, questions: QUESTIONS, questionSets:{SHORT:QUESTIONS,EXTENDED:EXTENDED_QUESTIONS}, regions, stats, recent, incomingVisits, performedVisits, partnerStats, managerAnalytics, assignableUsers, pendingAssignments, assignmentOverview });
  } catch (error) { return routeError(error); }
}

