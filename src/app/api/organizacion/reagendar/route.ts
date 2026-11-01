import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orgActual } from "@/lib/orgSesion";
import { avisarReagendoOrg, cargarContexto } from "@/lib/notifications";
import { validarVisita } from "@/lib/visitas";

const err = (error: string, status: number) => NextResponse.json({ error }, { status });

// La casa de apoyo cambia la fecha de una visita vigente y se avisa al voluntario.
export async function POST(req: Request) {
  const org = await orgActual();
  if (!org) return err("Inicia sesión como organización.", 401);
  const { solicitudId, fecha, hora } = await req.json();
  const problema = validarVisita(fecha, hora);
  if (problema || typeof solicitudId !== "string") return err(problema ?? "Solicitud no válida.", 400);

  // Solo solicitudes de residentes de ESTA organización, todavía vigentes
  const { data: s } = await db.from("solicitudes")
    .select("id, fecha_visita, hora_visita, residentes!inner(organizacion_id)")
    .eq("id", solicitudId).eq("residentes.organizacion_id", org.id)
    .in("estado", ["pendiente", "aprobada"]).maybeSingle();
  if (!s) return err("No se puede reagendar esta solicitud.", 404);
  if (s.fecha_visita === fecha && s.hora_visita === hora) return err("Elige una fecha u hora distinta a la actual.", 400);

  // El estado se conserva; se reinician los recordatorios para la fecha nueva.
  const { error } = await db.from("solicitudes").update({
    fecha_visita: fecha, hora_visita: hora, reagendada_por_org: true,
    recordatorio_enviado: false, aviso_dia_enviado: false,
  }).eq("id", s.id);
  if (error) return err(error.message, 500);

  const ctx = await cargarContexto(s.id);
  if (ctx) await avisarReagendoOrg(ctx, { fecha: s.fecha_visita, hora: s.hora_visita });
  return NextResponse.json({ ok: true });
}