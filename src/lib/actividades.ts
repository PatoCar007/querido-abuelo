// Actividades que puede elegir cualquier voluntario
export const DIDACTICAS: string[] = [
  "Juegos de mesa", "Platicar", "Leer en voz alta", "Escribir cartas",
  "Pintar o manualidades", "Cantar o escuchar música",
];
// Requieren cuidado físico: solo personas mayores de 18 años
export const DE_CUIDADO: string[] = ["Ayudar a comer o beber", "Caminatas controladas"];
export const TODAS: string[] = [...DIDACTICAS, ...DE_CUIDADO];
export const MAYORIA_DE_EDAD = 18;