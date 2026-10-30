import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { RegistroSchema } from "@/lib/schemas";
import { COOKIE_SESION, OPCIONES_COOKIE, crearToken, hashClave } from "@/lib/sesion";

const err = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  if (!process.env.SESSION_SECRET) return err("Falta SESSION_SECRET en las variables de entorno.", 500);
  const parsed = RegistroSchema.safeParse(await req.json());
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Revisa los datos del formulario.", 400);
  const d = parsed.data;
  const esMenor = d.voluntario.edad < 18;

  const { data: cuenta, error: e1 } = await db.from("cuentas")
    .insert({ email: d.email, clave_hash: await hashClave(d.clave) }).select("id").single();
  if (e1) return err(e1.code === "23505" ? "Ese correo ya tiene una cuenta. Inicia sesión." : e1.message, e1.code === "23505" ? 409 : 500);

  const { data: vol, error: e2 } = await db.from("voluntarios")
    .insert({ ...d.voluntario, otras_actividades: d.voluntario.otras_actividades || null, cuenta_id: cuenta.id })
    .select("id").single();
  if (e2) {
    await db.from("cuentas").delete().eq("id", cuenta.id); // no dejar cuentas a medias
    return err(e2.message, 500);
  }

  const { error: e3 } = await db.from("contactos_voluntarios").insert({
    voluntario_id: vol.id, contacto: d.contacto,
    tutor_nombre: esMenor ? d.tutor?.nombre : null,
    tutor_edad: esMenor ? d.tutor?.edad : null,
    tutor_correo: esMenor ? d.tutor?.correo : null,
  });
  if (e3) {
    await db.from("cuentas").delete().eq("id", cuenta.id); // borra también el perfil (cascada)
    return err(e3.message, 500);
  }

  (await cookies()).set(COOKIE_SESION, crearToken(cuenta.id), OPCIONES_COOKIE);
  return NextResponse.json({ ok: true });
}