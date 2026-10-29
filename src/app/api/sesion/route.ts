import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { COOKIE_SESION, OPCIONES_COOKIE, crearToken, verificarClave } from "@/lib/sesion";

// Hash de relleno: así tarda lo mismo aunque el correo no exista.
const FALSO = `${"0".repeat(32)}:${"0".repeat(128)}`;

// Iniciar sesión
export async function POST(req: Request) {
  if (!process.env.SESSION_SECRET) return NextResponse.json({ error: "Falta SESSION_SECRET en .env.local" }, { status: 500 });
  const { email, clave } = await req.json();
  const { data } = await db.from("cuentas").select("id, clave_hash")
    .eq("email", String(email ?? "").trim().toLowerCase()).maybeSingle();
  const ok = await verificarClave(String(clave ?? ""), data?.clave_hash ?? FALSO);
  if (!data || !ok) return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
  (await cookies()).set(COOKIE_SESION, crearToken(data.id), OPCIONES_COOKIE);
  return NextResponse.json({ ok: true });
}

// Cerrar sesión
export async function DELETE() {
  (await cookies()).delete(COOKIE_SESION);
  return NextResponse.json({ ok: true });
}