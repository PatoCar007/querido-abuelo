import type { Residente, Voluntario } from "./schemas";

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

// Sinónimos: "cantar" y "música" cuentan como gusto compartido. Amplía la lista.
const SINONIMOS: Record<string, string> = {
  cantar: "musica", canciones: "musica", leer: "lectura", libros: "lectura",
  pintar: "arte", dibujo: "arte", jardin: "jardineria", plantas: "jardineria",
  cocinar: "cocina", domino: "juegos de mesa", cartas: "juegos de mesa",
};
const canon = (s: string) => SINONIMOS[norm(s)] ?? norm(s);
const palabras = (s: string) => canon(s).split(/\s+/).filter((t) => t.length > 3);
const coincide = (a: string, b: string) =>
  canon(a) === canon(b) || palabras(a).some((p) => palabras(b).includes(p));

export type Recomendacion = {
  residente: Residente;
  compartidos: string[]; // intereses en común (para destacarlos en la UI)
  puntaje: number;
  recomendado: boolean;
};

/** Cruza los intereses del voluntario con los del residente y ordena de mayor a menor afinidad. */
export function recomendarResidentes(
  v: Pick<Voluntario, "intereses" | "actividad_deseada">,
  residentes: Residente[]
): Recomendacion[] {
  const actividad = norm(v.actividad_deseada);
  return residentes
    .map((residente) => {
      const compartidos = residente.intereses.filter((ri) =>
        v.intereses.some((vi) => coincide(vi, ri))
      );
      // Bonus: un interés del residente aparece en la actividad que el voluntario quiere hacer.
      const bonus = residente.intereses.filter((ri) => actividad.includes(canon(ri))).length;
      return { residente, compartidos, puntaje: compartidos.length * 2 + bonus, recomendado: compartidos.length > 0 };
    })
    .sort((a, b) => b.puntaje - a.puntaje);
}
