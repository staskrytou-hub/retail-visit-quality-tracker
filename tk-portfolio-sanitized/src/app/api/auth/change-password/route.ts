import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { changePassword, createSession, requireUser } from "@/lib/auth";
import { routeError } from "@/lib/http";

const Passwords = z.object({ current: z.string().min(1), next: z.string().min(8).max(128), confirm: z.string() }).refine(v => v.next === v.confirm, "Hasła nie są takie same");

export async function POST(request: NextRequest) {
  try {
    const user = requireUser(request, { allowPasswordChange: true });
    const input = Passwords.parse(await request.json());
    if (!(await changePassword(user.id, input.current, input.next))) return NextResponse.json({ error: "Obecne hasło jest nieprawidłowe" }, { status: 400 });
    const response = NextResponse.json({ ok: true });
    createSession(user.id, response, request);
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message || "Nieprawidłowe dane" }, { status: 400 });
    return routeError(error);
  }
}
