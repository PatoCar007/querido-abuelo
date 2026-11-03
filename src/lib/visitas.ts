// Formato y reglas básicas de las visitas. Los días y horas permitidos de cada casa están en horarios.ts.

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

/** Devuelve un mensaje de error si la fecha u hora no tienen formato válido o ya pasaron, o null si todo está bien. */
export function validarVisita(fecha: unknown, hora: unknown): string | null {
  if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(Date.parse(fecha))) {
    return "Elige el día de la visita.";
  }
  if (typeof hora !== "string" || !/^\d{2}:\d{2}$/.test(hora)) return "Elige la hora de la visita.";
  // Solo desde mañana, con la fecha de hoy en Ciudad de México.
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  if (fecha <= hoy) return "Elige una fecha a partir de mañana.";
  return null;
}