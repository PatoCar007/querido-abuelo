import { z } from "zod";
import { etiquetaHora } from "./visitas";

// Un bloque es [desde, hasta]: las horas de inicio posibles de una visita, cada 30 minutos (ambas incluidas).
export type Bloque = [string, string];
// dias: 0 domingo, 1 lunes ... 6 sábado. "semana" aplica de lunes a viernes y "finde" a sábado y domingo.
export type Horario = { dias: number[]; semana: Bloque[]; finde: Bloque[] };

// true: el calendario ofrece solo horas que coinciden con la casa Y con la disponibilidad del voluntario.
// false: solo cuenta el horario de la casa.
export const USAR_DISPONIBILIDAD_VOLUNTARIO = true;

export const NOMBRES_DIA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// Horario de las casas que aún no configuran el suyo (el que se usaba antes).
export const HORARIO_POR_DEFECTO: Horario = {
  dias: [0, 1, 2, 3, 4, 5, 6],
  semana: [["16:00", "18:30"]],
  finde: [["11:00", "14:00"], ["16:00", "18:30"]],
};

// Horas que se pueden elegir en los formularios: de 7:00 AM a 9:00 PM, cada 30 minutos.
export const OPCIONES_HORA: string[] = Array.from({ length: 29 }, (_, i) => {
  const m = 7 * 60 + i * 30;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
});

const minutos = (h: string) => { const [a, b] = h.split(":").map(Number); return a * 60 + b; };

function horasDeBloques(bloques: Bloque[]): string[] {
  const set = new Set<string>();
  for (const [desde, hasta] of bloques) {
    for (const h of OPCIONES_HORA) if (minutos(h) >= minutos(desde) && minutos(h) <= minutos(hasta)) set.add(h);
  }
  return [...set].sort();
}

/** Horas disponibles de un día de la semana (0 domingo ... 6 sábado) según un horario. */
export function horasDeDia(h: Horario, dia: number): string[] {
  if (!h.dias?.includes(dia)) return [];
  return horasDeBloques(dia === 0 || dia === 6 ? h.finde ?? [] : h.semana ?? []);
}

export const diaDeFecha = (fecha: string) => new Date(`${fecha}T12:00:00Z`).getUTCDay();

/** Horas que se pueden elegir en una fecha (AAAA-MM-DD): las de la casa y, si aplica, las del voluntario. */
export function horasDisponibles(fecha: string, casa?: Horario | null, voluntario?: Horario | null): string[] {
  if (!fecha) return [];
  const dia = diaDeFecha(fecha);
  const deCasa = horasDeDia(casa ?? HORARIO_POR_DEFECTO, dia);
  if (!voluntario || !USAR_DISPONIBILIDAD_VOLUNTARIO) return deCasa;
  const deVoluntario = horasDeDia(voluntario, dia);
  return deCasa.filter((h) => deVoluntario.includes(h));
}

/** Mensaje de error si el horario no es válido, o null si está bien. */
export function validarHorario(h: Horario): string | null {
  if ((h.semana?.length ?? 0) > 2 || (h.finde?.length ?? 0) > 2) return "Máximo dos horarios por grupo de días.";
  for (const [desde, hasta] of [...(h.semana ?? []), ...(h.finde ?? [])]) {
    if (!OPCIONES_HORA.includes(desde) || !OPCIONES_HORA.includes(hasta)) return "Elige horas válidas en cada horario.";
    if (minutos(desde) > minutos(hasta)) return "En cada horario, la hora de inicio no puede ser después de la hora final.";
  }
  if (![0, 1, 2, 3, 4, 5, 6].some((d) => horasDeDia(h, d).length > 0)) return "Indica al menos un día con su horario.";
  return null;
}

export const HorarioSchema = z
  .object({
    dias: z.array(z.number().int().min(0).max(6)).max(7),
    semana: z.array(z.tuple([z.string(), z.string()])).max(2),
    finde: z.array(z.tuple([z.string(), z.string()])).max(2),
  })
  .refine((h) => validarHorario(h) === null, {
    message: "Revisa los horarios: cada uno necesita inicio y fin, y debe quedar al menos un día disponible.",
  });

/** Lee los campos del formulario de horarios. Lanza un error si un horario quedó a medias. */
export function horarioDeFormData(f: FormData, conDias: boolean): Horario {
  const leer = (pre: string): Bloque[] => {
    const salida: Bloque[] = [];
    for (const n of [1, 2]) {
      const desde = String(f.get(`${pre}${n}_desde`) ?? ""), hasta = String(f.get(`${pre}${n}_hasta`) ?? "");
      if (desde && hasta) salida.push([desde, hasta]);
      else if (desde || hasta) throw new Error("En cada horario completa la hora de inicio y la hora final.");
    }
    return salida;
  };
  const semana = leer("semana"), finde = leer("finde");
  // Las casas eligen sus días; en los voluntarios se deducen de los grupos que llenaron.
  const dias = conDias
    ? f.getAll("dia").map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    : [...(semana.length ? [1, 2, 3, 4, 5] : []), ...(finde.length ? [6, 0] : [])];
  return { dias, semana, finde };
}

/* ---------- Texto legible: "Lunes a viernes: 4:00 PM a 6:30 PM; Sábados y domingos: ..." ---------- */
const rango = (b: Bloque[]) => b.map(([d, h]) => `${etiquetaHora(d)} a ${etiquetaHora(h)}`).join(" y ");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function nombresDias(lista: number[], total: number, completo: string) {
  if (lista.length === total) return completo;
  const n = lista.map((d) => NOMBRES_DIA[d].toLowerCase());
  return n.length > 1 ? `${n.slice(0, -1).join(", ")} y ${n[n.length - 1]}` : n[0];
}

export function resumenHorario(h?: Horario | null): string {
  const x = h ?? HORARIO_POR_DEFECTO;
  const partes: string[] = [];
  const lv = [1, 2, 3, 4, 5].filter((d) => x.dias?.includes(d));
  const sd = [6, 0].filter((d) => x.dias?.includes(d));
  if (lv.length && x.semana?.length) partes.push(`${cap(nombresDias(lv, 5, "lunes a viernes"))}: ${rango(x.semana)}`);
  if (sd.length && x.finde?.length) partes.push(`${cap(nombresDias(sd, 2, "sábados y domingos"))}: ${rango(x.finde)}`);
  return partes.join("; ") || "Sin horarios disponibles";
}