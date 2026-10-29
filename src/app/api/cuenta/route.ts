import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { COOKIE_SESION, cuentaActual } from "@/lib/sesion";

// Elimina la cuenta del voluntario. La base de datos borra en cascada su perfil,
// su contacto y sus solicitudes, y el correo queda libre para registrarse de nuevo.
export async function DELETE() {
  const cuentaId = await cuentaActual();
  if (!cuentaId) return NextResponse.json({ error: "Inicia sesión para continuar." }, { status: 401 });
  const { error } = await db.from("cuentas").delete().eq("id", cuentaId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  (await cookies()).delete(COOKIE_SESION);
  return NextResponse.json({ ok: true });
}