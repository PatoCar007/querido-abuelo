import { etiquetaHora } from "./visitas";

// Las visitas son todos los días (lunes a domingo) entre estas dos horas. Si algún día cambia, se cambia aquí.
export const HORA_INICIO = "10:00";
export const HORA_FIN = "20:00";
const PASO = 30; // minutos entre una hora de visita y la siguiente
export const MAX_BLOQUEOS = 3; // periodos de «no recibimos visitas» que puede indicar cada casa

// Un bloqueo es [desde, hasta): se bloquean las horas desde «desde» hasta justo antes de «hasta».
export type Bloqueo = [string, string];

const aMin = (h: string) => { const [a, b] = h.split(":").map(Number); return a * 60 + b; };
const aHora = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

// Opciones de los menús «desde» y «hasta»: de 10:00 AM a 8:00 PM, cada 30 minutos.
export const OPCIONES_BLOQUEO: string[] = Array.from(
  { length: (aMin(HORA_FIN) - aMin(HORA_INICIO)) / PASO + 1 },
  (_, i) => aHora(aMin(HORA_INICIO) + i * PASO)
);

// Horas en que puede EMPEZAR una visita: de 10:00 AM a 7:30 PM (la última termina a las 8:00 PM).
// Para que 8:00 PM también sea hora de inicio, cambia esta línea a: = OPCIONES_BLOQUEO;
export const HORAS_DEL_DIA: string[] = OPCIONES_BLOQUEO.slice(0, -1);

export const TEXTO_HORARIO = `Las visitas son todos los días, de ${etiquetaHora(HORA_INICIO)} a ${etiquetaHora(HORA_FIN)}`;

/** Todas las horas del día MENOS las que la casa marcó como «no recibimos visitas». */
export function horasDisponibles(bloqueos?: Bloqueo[] | null): string[] {
  const lista = Array.isArray(bloqueos) ? bloqueos : [];
  return HORAS_DEL_DIA.filter((h) => !lista.some(([desde, hasta]) => aMin(h) >= aMin(desde) && aMin(h) < aMin(hasta)));
}

/** Mensaje de error si los bloqueos no son válidos, o null si están bien. */
export function validarBloqueos(b: Bloqueo[]): string | null {
  if (b.length > MAX_BLOQUEOS) return `Máximo ${MAX_BLOQUEOS} periodos.`;
  for (const [desde, hasta] of b) {
    if (!OPCIONES_BLOQUEO.includes(desde) || !OPCIONES_BLOQUEO.includes(hasta)) return "Elige horas válidas.";
    if (aMin(desde) >= aMin(hasta)) return "En cada periodo, «desde» debe ser antes que «hasta».";
  }
  if (horasDisponibles(b).length === 0) return "Debe quedar al menos una hora disponible para recibir visitas.";
  return null;
}

/** Lee los periodos del formulario. Lanza un error si uno quedó a medias. */
export function bloqueosDeFormData(f: FormData): Bloqueo[] {
  const salida: Bloqueo[] = [];
  for (let n = 1; n <= MAX_BLOQUEOS; n++) {
    const desde = String(f.get(`bloq${n}_desde`) ?? ""), hasta = String(f.get(`bloq${n}_hasta`) ?? "");
    if (desde && hasta) salida.push([desde, hasta]);
    else if (desde || hasta) throw new Error("En cada periodo elige «desde» y «hasta».");
  }
  return salida;
}

/* ---------- Texto legible del horario ---------- */

// Los periodos que quedan libres: el horario completo menos los bloqueos (que pueden traslaparse).
function periodosLibres(bloqueos: Bloqueo[]): [number, number][] {
  const inicio = aMin(HORA_INICIO), fin = aMin(HORA_FIN);
  const ordenados = bloqueos
    .map(([d, h]) => [aMin(d), aMin(h)] as [number, number])
    .filter(([d, h]) => h > d)
    .sort((a, b) => a[0] - b[0]);
  const libres: [number, number][] = [];
  let cursor = inicio;
  for (const [d, h] of ordenados) {
    if (d > cursor) libres.push([cursor, Math.min(d, fin)]);
    cursor = Math.max(cursor, h);
  }
  if (cursor < fin) libres.push([cursor, fin]);
  return libres;
}

// ["a", "b", "c"] -> "a, b y c"
const unir = (partes: string[]) =>
  partes.length <= 1 ? partes.join("") : `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;

/** «Todos los días de 11:00 AM a 7:00 PM» o «…de 10:00 AM a 1:00 PM y de 3:00 PM a 8:00 PM». */
export function resumenHorario(bloqueos?: Bloqueo[] | null): string {
  const libres = periodosLibres(Array.isArray(bloqueos) ? bloqueos : []);
  if (!libres.length) return "Sin horarios disponibles";
  return `Todos los días ${unir(libres.map(([a, b]) => `de ${etiquetaHora(aHora(a))} a ${etiquetaHora(aHora(b))}`))}`;
}