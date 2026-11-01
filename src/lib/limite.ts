import { headers } from "next/headers";
import { db } from "./db";

const VENTANA_MIN = 15; // los fallos se cuentan dentro de esta ventana
const BLOQUEO_MIN = 15;

async function reglas(tipo: string, id: string) {
  const ip = ((await headers()).get("x-forwarded-for") ?? "desconocida").split(",")[0].trim();
  return [
    { clave: `${tipo}:${id.trim().toLowerCase().slice(0, 120)}`, max: 5 }, // por cuenta
    { clave: `ip:${ip}`, max: 20 }, // por conexión
  ];
}

/** Minutos que faltan para poder intentar de nuevo; 0 si no hay bloqueo. */
export async function minutosBloqueado(tipo: string, id: string) {
  const claves = (await reglas(tipo, id)).map((r) => r.clave);
  const { data } = await db.from("intentos_login").select("bloqueado_hasta").in("clave", claves);
  const hasta = Math.max(0, ...(data ?? []).map((r) => (r.bloqueado_hasta ? new Date(r.bloqueado_hasta).getTime() : 0)));
  return hasta > Date.now() ? Math.ceil((hasta - Date.now()) / 60_000) : 0;
}

export async function registrarFallo(tipo: string, id: string) {
  const ahora = Date.now();
  for (const { clave, max } of await reglas(tipo, id)) {
    const { data } = await db.from("intentos_login").select("fallos, primer_fallo").eq("clave", clave).maybeSingle();
    const previo = data && ahora - new Date(data.primer_fallo).getTime() < VENTANA_MIN * 60_000 ? data : null;
    const fallos = (previo?.fallos ?? 0) + 1;
    await db.from("intentos_login").upsert({
      clave, fallos,
      primer_fallo: previo?.primer_fallo ?? new Date(ahora).toISOString(),
      bloqueado_hasta: fallos >= max ? new Date(ahora + BLOQUEO_MIN * 60_000).toISOString() : null,
    });
  }
}

/** Un acierto borra el conteo de la cuenta (el de la conexión sigue su curso). */
export async function limpiarFallos(tipo: string, id: string) {
  const [cuenta] = await reglas(tipo, id);
  await db.from("intentos_login").delete().eq("clave", cuenta.clave);
}