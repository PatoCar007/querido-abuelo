import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cuentaActual } from "@/lib/sesion";
import { avisarCancelacion, avisarSolicitud, cargarContexto } from "@/lib/notifications";
import { validarVisita } from "@/lib/visitas";

const err = (error: string, status: number) => NextResponse.json({ error }, { status });

type OrgInfo = { verificada: boolean; edad_minima: number };

// Crea una solicitud nueva, o REAGENDA una cancelada con nueva fecha y hora.
// Queda "pendiente" hasta que la casa de apoyo dueña del abuelito la apruebe o rechace.
export async function POST(req: Request) {
  const cuentaId = await cuentaActual();
  const { residenteId, fecha, hora } = await req.json();
  if (!cuentaId || !residenteId) return err("Inicia sesión para enviar una solicitud.", 401);
  const problema = validarVisita(fecha, hora);
  if (problema) return err(problema, 400);

  const [{ data: voluntario }, { data: residente }] = await Promise.all([
    db.from("voluntarios").select("id, edad").eq("cuenta_id", cuentaId).maybeSingle(),
    db.from("residentes").select("id, organizaciones(verificada, edad_minima)").eq("id", residenteId).maybeSingle(),
  ]);
  if (!voluntario) return err("Inicia sesión de nuevo.", 401);

  // Supabase puede tipar esta relación como lista; en realidad llega un solo objeto.
  const rel: unknown = residente?.organizaciones;
  const org = (Array.isArray(rel) ? rel[0] : rel) as OrgInfo | undefined;
  if (!residente || !org?.verificada) return err("Este perfil ya no está disponible.", 404);
  // Criterio de la casa de apoyo: edad mínima de los voluntarios
  if (voluntario.edad < org.edad_minima) {
    return err(`Esta casa de apoyo pide tener al menos ${org.edad_minima} años para visitar.`, 403);
  }

  const { data: previa } = await db.from("solicitudes").select("id, estado")
    .eq("voluntario_id", voluntario.id).eq("residente_id", residenteId).maybeSingle();
  if (previa && previa.estado !== "cancelada") return err("Ya enviaste esta solicitud.", 409);

  const visita = { fecha_visita: fecha, hora_visita: hora };
  let solicitudId: string;
  if (previa) {
    // Reagendar: vuelve a pendiente y se reinician los avisos de recordatorio.
    const { error } = await db.from("solicitudes")
      .update({ ...visita, estado: "pendiente", reagendada: true, recordatorio_enviado: false, aviso_dia_enviado: false, created_at: new Date().toISOString() })
      .eq("id", previa.id).eq("estado", "cancelada");
    if (error) return err(error.message, 500);
    solicitudId = previa.id;
  } else {
    const { data, error } = await db.from("solicitudes")
      .insert({ voluntario_id: voluntario.id, residente_id: residenteId, ...visita }).select("id").single();
    if (error) return err(error.code === "23505" ? "Ya enviaste esta solicitud." : error.message, error.code === "23505" ? 409 : 500);
    solicitudId = data.id;
  }

  // Se espera el resultado para que funciones serverless (Vercel) no corten el proceso antes de terminar.
  const ctx = await cargarContexto(solicitudId);
  if (ctx) await avisarSolicitud(ctx);
  return NextResponse.json({ ok: true });
}

// El voluntario cancela; la casa de apoyo la ve con estado "cancelada".
export async function PATCH(req: Request) {
  const cuentaId = await cuentaActual();
  const { residenteId } = await req.json();
  if (!cuentaId || !residenteId) return err("Inicia sesión para continuar.", 401);

  const { data: v } = await db.from("voluntarios").select("id").eq("cuenta_id", cuentaId).maybeSingle();
  if (!v) return err("Inicia sesión de nuevo.", 401);

  const { data, error } = await db.from("solicitudes").update({ estado: "cancelada" })
    .eq("voluntario_id", v.id).eq("residente_id", residenteId)
    .in("estado", ["pendiente", "aprobada"]).select("id");
  if (error) return err(error.message, 500);
  if (!data?.length) return err("No hay una solicitud activa para cancelar.", 404);

  const ctx = await cargarContexto(data[0].id);
  if (ctx) await avisarCancelacion(ctx);
  return NextResponse.json({ ok: true });
}