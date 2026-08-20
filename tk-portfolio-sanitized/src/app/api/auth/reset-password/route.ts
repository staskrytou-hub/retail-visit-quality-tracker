import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resetPasswordWithConfirmation } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { clientIpHash, routeError } from "@/lib/http";

const ResetPassword = z.object({
  regionOrLogin: z.string().trim().min(1).max(30),
  confirmationRegion: z.string().trim().min(1).max(30),
});

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Uzupełnij rejon i powtórz go dla potwierdzenia" }, { status: 400 });
    }
    const input = ResetPassword.parse(body);
    const ip = clientIpHash(request);
    const auditLogin = `reset:${input.regionOrLogin}`;
    const failures = (getDb().prepare(`SELECT COUNT(*) AS count FROM login_attempts
      WHERE login=? AND ip_hash=? AND success=0 AND created_at >= datetime('now','-15 minutes')`).get(auditLogin, ip) as { count: number }).count;
    if (failures >= 5) return NextResponse.json({ error: "Zbyt wiele prób. Spróbuj ponownie za 15 minut." }, { status: 429 });

    const ok = await resetPasswordWithConfirmation(input.regionOrLogin, input.confirmationRegion);
    getDb().prepare("INSERT INTO login_attempts(login,ip_hash,success) VALUES (?,?,?)").run(auditLogin, ip, ok ? 1 : 0);
    if (!ok) return NextResponse.json({ error: "Rejon i potwierdzenie muszą być takie same i pasować do konta" }, { status: 400 });

    return NextResponse.json({
      ok: true,
      message: "Hasło zostało zresetowane do 123456. Po zalogowaniu ustaw nowe hasło.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Uzupełnij rejon i powtórz go dla potwierdzenia" }, { status: 400 });
    return routeError(error);
  }
}
