import { NextRequest, NextResponse } from "next/server";
import { COOKIE_ORG, leerTokenOrg } from "@/lib/orgAuth";

const COOKIE_ADMIN = "qa_admin"; // el mismo nombre que en src/lib/adminAuth.ts

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Administración: solo con la sesión de administrador (el login queda abierto).
  if (pathname.startsWith("/admin")) {
    if (pathname.startsWith("/admin/login")) return NextResponse.next();
    const id = await leerTokenOrg(req.cookies.get(COOKIE_ADMIN)?.value);
    return id === "admin" ? NextResponse.next() : NextResponse.redirect(new URL("/admin/login", req.url));
  }

  // Panel de las organizaciones (el login y el registro quedan abiertos).
  if (pathname.startsWith("/organizacion/login") || pathname.startsWith("/organizacion/registro")) {
    return NextResponse.next();
  }
  if (await leerTokenOrg(req.cookies.get(COOKIE_ORG)?.value)) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.redirect(new URL("/organizacion/login", req.url));
}

export const config = { matcher: ["/organizacion/:path*", "/admin/:path*", "/api/residentes/:path*"] };