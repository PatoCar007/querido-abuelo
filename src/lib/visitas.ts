// Reglas y formato de las visitas. Se usa tanto en pantalla como en el servidor.
const TARDE = ["16:00", "16:30", "17:00", "17:30", "18:00", "18:30"];
const MANANA_FIN_DE_SEMANA = ["11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00"];

export const HORAS_ENTRE_SEMANA: readonly string[] = TARDE;
export const HORAS_FIN_DE_SEMANA: readonly string[] = [...MANANA_FIN_DE_SEMANA, ...TARDE];
export const TEXTO_HORARIO =
  "Horarios disponibles: de lunes a viernes de 4:00 PM a 6:30 PM; sábados y domingos de 11:00 AM a 2:00 PM y de 4:00 PM a 6:30 PM";

/** Horas disponibles para un día (AAAA-MM-DD). Sin día elegido, no hay horas. */
export function horasDeFecha(fecha: string): readonly string[] {
  if (!fecha) return [];
  const dia = new Date(`${fecha}T12:00:00Z`).getUTCDay(); // 0 domingo, 6 sábado
  return dia === 0 || dia === 6 ? HORAS_FIN_DE_SEMANA : HORAS_ENTRE_SEMANA;
}

// "16:30" -> "4:30 PM"
export function etiquetaHora(h: string) {
  const [hh, mm] = h.split(":").map(Number);
  return `${hh > 12 ? hh - 12 : hh}:${String(mm).padStart(2, "0")} ${hh >= 12 ? "PM" : "AM"}`;
}

// "2026-11-03" -> "martes, 3 de noviembre de 2026"
export function etiquetaFecha(f: string) {
  return new Date(`${f}T12:00:00`).toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

export const etiquetaVisita = (f?: string | null, h?: string | null) =>
  f && h ? `${etiquetaFecha(f)}, ${etiquetaHora(h)}` : "Sin fecha indicada";

/** Devuelve un mensaje de error si la fecha u hora no son válidas, o null si todo está bien. */
export function validarVisita(fecha: unknown, hora: unknown): string | null {
  if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(Date.parse(fecha))) {
    return "Elige el día de la visita.";
  }
  if (typeof hora !== "string" || !horasDeFecha(fecha).includes(hora)) {
    return "Elige una hora dentro del horario disponible para ese día.";
  }
  // Solo desde mañana, con la fecha de hoy en Ciudad de México.
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  if (fecha <= hoy) return "Elige una fecha a partir de mañana.";
  return null;
}