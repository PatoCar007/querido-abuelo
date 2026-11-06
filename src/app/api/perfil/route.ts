import { NextResponse } from "next/server";
import { z } from "zod";
import { MAYORIA_DE_EDAD } from "@/lib/actividades";
import { db } from "@/lib/db";
import { limpiarFallos, minutosBloqueado, registrarFallo } from "@/lib/limite";
import { ContactoSchema, TutorSchema, VoluntarioSchema } from "@/lib/schemas";
import { cuentaActual, verificarClave } from "@/lib/sesion";

const err = (error: string, status: number) => NextResponse.json({ error }, { status });

const PerfilSchema = z
  .object({
    email: z.string().trim().toLowerCase().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Escribe un correo válido"),
    claveActual: z.string().max(100).optional(),
    contacto: ContactoSchema, // si es menor de edad, es el teléfono del adulto responsable
    voluntario: VoluntarioSchema,
    tutor: TutorSchema.optional(),
  })
  .refine((d) => d.voluntario.edad >= MAYORIA_DE_EDAD || !!d.tutor, {
    message: "Las personas menores de edad deben indicar los datos de un adulto responsable.", path: ["tutor"],
  });

// El voluntario edita sus datos.
export async function PATCH(req: Request) {
  const cuentaId = await cuentaActual();
  if (!cuentaId) return err("Inicia sesión para continuar.", 401);
  const parsed = PerfilSchema.safeParse(await req.json());
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Revisa los datos del formulario.", 400);
  const d = parsed.data;
  const menor = d.voluntario.edad < 18;

  const [{ data: cuenta }, { data: vol }] = await Promise.all([
    db.from("cuentas").select("email, clave_hash").eq("id", cuentaId).maybeSingle(),
    db.from("voluntarios").select("id").eq("cuenta_id", cuentaId).maybeSingle(),
  ]);
  if (!cuenta || !vol) return err("Inicia sesión de nuevo.", 401);

  // Cambiar el correo (con el que se inicia sesión) exige la contraseña actual.
  const cambiaCorreo = d.email !== cuenta.email.toLowerCase();
  if (cambiaCorreo) {
    const espera = await minutosBloqueado("perfil", cuentaId);
    if (espera) return err(`Demasiados intentos fallidos. Por seguridad, intenta de nuevo en ${espera} minutos.`, 429);
    if (!(await verificarClave(d.claveActual ?? "", cuenta.clave_hash))) {
      await registrarFallo("perfil", cuentaId);
      return err("La contraseña actual no es correcta.", 403);
    }
    await limpiarFallos("perfil", cuentaId);
    const { data: otro } = await db.from("cuentas").select("id").eq("email", d.email).neq("id", cuentaId).maybeSingle();
    if (otro) return err("Ese correo ya tiene otra cuenta.", 409);
  }

  const { error: e1 } = await db.from("voluntarios")
    .update({ ...d.voluntario, otras_actividades: d.voluntario.otras_actividades || null }).eq("id", vol.id);
  if (e1) return err(e1.message, 500);

  const { error: e2 } = await db.from("contactos_voluntarios").upsert({
    voluntario_id: vol.id, contacto: d.contacto,
    tutor_nombre: menor ? d.tutor?.nombre : null,
    tutor_edad: menor ? d.tutor?.edad : null,
    tutor_correo: menor ? d.tutor?.correo : null,
  });
  if (e2) return err(e2.message, 500);

  if (cambiaCorreo) {
    const { error: e3 } = await db.from("cuentas").update({ email: d.email }).eq("id", cuentaId);
    if (e3) return err(e3.code === "23505" ? "Ese correo ya tiene otra cuenta." : e3.message, e3.code === "23505" ? 409 : 500);
  }
  return NextResponse.json({ ok: true });
}