import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { audit, createSession, verifyCredentials } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { clientIpHash, routeError } from "@/lib/http";

const Login = z.object({ login: z.string().trim().min(1).max(30), password: z.string().min(1).max(200) });

export async function POST(request: NextRequest) {
  try {
    const input = Login.parse(await request.json());
    const ip = clientIpHash(request);
    const failures = (getDb().prepare(`SELECT COUNT(*) AS count FROM login_attempts
      WHERE login=? AND ip_hash=? AND success=0 AND created_at >= datetime('now','-15 minutes')`).get(input.login, ip) as { count: number }).count;
    if (failures >= 5) return NextResponse.json({ error: "Zbyt wiele prób. Spróbuj ponownie za 15 minut." }, { status: 429 });
    const userId = await verifyCredentials(input.login, input.password);
    getDb().prepare("INSERT INTO login_attempts(login,ip_hash,success) VALUES (?,?,?)").run(input.login, ip, userId ? 1 : 0);
    if (!userId) return NextResponse.json({ error: "Nieprawidłowy login lub hasło" }, { status: 401 });
    const response = NextResponse.json({ ok: true });
    createSession(userId, response, request);
    audit(userId, "login_success", "user", String(userId));
    return response;
  } catch (error) { return routeError(error); }
}
