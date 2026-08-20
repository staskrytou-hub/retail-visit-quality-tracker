import { NextRequest, NextResponse } from "next/server";
import { destroySession, readUserFromRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const user = readUserFromRequest(request);
  const response = NextResponse.json({ ok: true });
  destroySession(request, response);
  if (user) {
    const { audit } = await import("@/lib/auth");
    audit(user.id, "logout", "user", String(user.id));
  }
  return response;
}

