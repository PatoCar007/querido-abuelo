import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { avisarRecordatorio, avisarVisitasHoy, cargarContexto, type Ctx } from "@/lib/notifications";

// Fecha (AAAA-MM-DD) en Ciudad de México, hoy + n días.
const fechaMX = (n = 0) =>
  new Date(Date.now() + n * 86_400_000).toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

// Vercel lo ejecuta cada mañana. Solo responde a quien conozca CRON_SECRET.
export async function GET(req: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || req.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // 1) Recordatorio a voluntarios: visitas aprobadas de mañana.
  // Se marca antes de enviar: si el proceso se dispara dos veces, nadie recibe el aviso doble.
  const { data: manana } = await db.from("solicitudes").select("id")
    .eq("estado", "aprobada").eq("fecha_visita", fechaMX(1)).eq("recordatorio_enviado", false);
  for (const s of manana ?? []) {
    await db.from("solicitudes").update({ recordatorio_enviado: true }).eq("id", s.id);
    const c = await cargarContexto(s.id);
    if (c) await avisarRecordatorio(c);
  }

  // 2) Aviso a las casas de apoyo: visitas aprobadas de hoy, un solo correo por casa.
  const { data: hoy } = await db.from("solicitudes").select("id")
    .eq("estado", "aprobada").eq("fecha_visita", fechaMX()).eq("aviso_dia_enviado", false);
  const porCasa = new Map<string, Ctx[]>();
  for (const s of hoy ?? []) {
    await db.from("solicitudes").update({ aviso_dia_enviado: true }).eq("id", s.id);
    const c = await cargarContexto(s.id);
    if (c) porCasa.set(c.org.id, [...(porCasa.get(c.org.id) ?? []), c]);
  }
  for (const lista of porCasa.values()) await avisarVisitasHoy(lista);

  return NextResponse.json({ recordatorios: manana?.length ?? 0, visitasHoy: hoy?.length ?? 0 });
}