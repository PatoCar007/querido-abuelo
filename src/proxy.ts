import { NextRequest, NextResponse } from "next/server";
import { COOKIE_ORG, leerTokenOrg } from "@/lib/orgAuth";

// Protege el panel de las organizaciones. El login y el registro quedan abiertos.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/organizacion/login") || pathname.startsWith("/organizacion/registro")) {
    return NextResponse.next();
  }
  if (await leerTokenOrg(req.cookies.get(COOKIE_ORG)?.value)) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.redirect(new URL("/organizacion/login", req.url));
}

export const config = { matcher: ["/organizacion/:path*", "/api/residentes/:path*"] };