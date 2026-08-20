import type { NextRequest } from "next/server";
import { createHash } from "node:crypto";

export function routeError(error: unknown) {
  if (error instanceof Response) return error;
  console.error(error);
  return Response.json({ error: "Wystąpił błąd serwera" }, { status: 500 });
}

export function clientIpHash(request: NextRequest) {
  const source = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "local";
  return createHash("sha256").update(source.trim()).digest("hex");
}
