import type { Residente } from "./schemas";

/* ============================================================================================
   Recomendaciones inteligentes. Entiende que «basquetbol», «basketball» y «basket» son lo mismo,
   y que «canto» y «cantar», o «bailar» y «danza», también. Funciona en tres pasos:
   1) limpia el texto (mayúsculas, acentos, palabras de relleno);
   2) lo convierte en «conceptos» con una lista de sinónimos y reglas para variantes de una palabra;
   3) perdona errores de escritura pequeños.
   ============================================================================================ */

const limpiar = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ");

// Palabras que no dicen nada del gusto («jugar basquetbol» -> «basquetbol»)
const VACIAS = new Set(
  ("de del la las el los un una unos unas y e o u a al en con sin por para que lo le se su sus mi mis me " +
    "gusta gustan gusto encanta encantan jugar ver hacer escuchar practicar tocar ir salir ser estar hay " +
    "mucho muy todo todos cosas tiempo libre como").split(" ")
);

// Quita plurales y terminaciones comunes: cantar, canto, canta, cantante -> «cant».
const SUFIJOS = ["ando", "iendo", "adora", "ador", "acion", "ante", "ismo", "ista", "ar", "er", "ir", "ado", "ido", "o", "a", "e"];
function raiz(p: string): string {
  let r = p.length > 3 && p.endsWith("s") ? p.slice(0, -1) : p;
  for (const s of SUFIJOS) {
    if (r.length - s.length >= 3 && r.endsWith(s)) { r = r.slice(0, -s.length); break; }
  }
  return r;
}

/* ---------- La lista de sinónimos ---------- */
// tema -> concepto -> palabras que lo expresan (con o sin acentos).
// Dos gustos del MISMO concepto son «lo mismo». Del mismo tema pero de distinto concepto, «parecidos».
// PARA AGREGAR una palabra, escríbela dentro del texto del concepto que corresponda.
const GRUPOS: Record<string, Record<string, string>> = {
  musica: {
    musica: "música musical melodía melodías canciones canción boleros bolero rancheras ranchera danzón mariachi trova cumbia music",
    canto: "cantar canto cantos cantante cantantes coro coros karaoke entonar",
    instrumentos: "guitarra piano violín teclado acordeón armónica flauta trompeta tambor tambores ukulele instrumento instrumentos",
  },
  baile: { baile: "bailar baile bailes danza danzas danzar bailable bailables zumba cumbia vals tango folclor folklor folclore folklore dance dancing" },
  deporte: {
    futbol: "futbol fútbol soccer football balompié",
    beisbol: "beisbol béisbol baseball",
    baloncesto: "baloncesto basquetbol básquetbol basketbol basket basketball básquet basquet",
    voleibol: "voleibol volibol volleyball vóleibol voley vóley",
    natacion: "natación nadar alberca",
    boxeo: "box boxeo",
    tenis: "tenis",
    ciclismo: "ciclismo bicicleta bici",
  },
  ejercicio: {
    caminar: "caminar caminata caminatas pasear paseo paseos",
    gimnasia: "gimnasia ejercicio ejercicios yoga estiramientos taichi pilates",
  },
  juegos: {
    domino: "dominó",
    cartas: "cartas naipes baraja póker poker",
    loteria: "lotería bingo",
    ajedrez: "ajedrez damas chess",
    juegos_mesa: "juegos rompecabezas puzzle parchís ludo",
  },
  lectura: {
    lectura: "leer lectura libros libro novelas novela cuentos cuento periódico periódicos revistas revista noticias",
    poesia: "poesía poemas poema versos verso",
    escritura: "escribir escritura redactar diario",
  },
  arte: {
    pintura: "pintar pintura pinturas acuarela óleo dibujar dibujo dibujos colorear",
    manualidades: "manualidades manualidad artesanías artesanía origami reciclaje",
    tejido: "tejer tejido tejidos crochet ganchillo bordar bordado costura coser",
    fotografia: "fotografía fotos foto cámara",
  },
  cocina: {
    cocina: "cocinar cocina recetas receta guisar guisos",
    reposteria: "repostería pan panadería pasteles pastel postres galletas hornear",
  },
  naturaleza: {
    jardineria: "jardín jardinería plantas planta flores flor huerto huertos macetas cultivar",
    animales: "mascotas mascota perros perro gatos gato animales aves pájaros",
    pesca: "pesca pescar",
  },
  pantalla: {
    cine: "cine películas pelicula series serie televisión tele telenovelas",
    teatro: "teatro obras actuar",
  },
  convivencia: {
    platicar: "platicar platica conversar conversación charlar charla convivir compañía",
    historias: "historias historia anécdotas recuerdos memorias",
  },
  fe: { religion: "rezar rezo oración rosario misa religión biblia iglesia" },
  tecnologia: { tecnologia: "computadora computadoras computación compu celular celulares tablet internet tecnología videojuegos" },
  viajes: { viajes: "viajar viajes viaje turismo" },
};

// Se arma una sola vez: cada palabra (y su raíz) apunta a sus conceptos.
const TEMA_DE: Map<string, string> = new Map(); // concepto -> tema
const DICCIONARIO: Map<string, Set<string>> = new Map();
const PALABRAS: string[] = [];

function agregar(clave: string, concepto: string) {
  const actuales = DICCIONARIO.get(clave);
  if (actuales) actuales.add(concepto);
  else DICCIONARIO.set(clave, new Set([concepto]));
}

for (const [tema, conceptos] of Object.entries(GRUPOS)) {
  for (const [concepto, palabras] of Object.entries(conceptos)) {
    TEMA_DE.set(concepto, tema);
    for (const palabra of limpiar(palabras).split(/\s+/).filter(Boolean)) {
      PALABRAS.push(palabra);
      agregar(palabra, concepto);
      const r = raiz(palabra);
      if (r.length >= 4) agregar(r, concepto);
    }
  }
}

/* ---------- Errores de escritura ---------- */
// Distancia de edición, con salida anticipada: cuántas letras hay que cambiar para pasar de una palabra a otra.
function distancia(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let previa = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const actual = [i];
    let minimo = i;
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      actual[j] = Math.min(previa[j] + 1, actual[j - 1] + 1, previa[j - 1] + costo);
      if (actual[j] < minimo) minimo = actual[j];
    }
    if (minimo > max) return max + 1;
    previa = actual;
  }
  return previa[b.length];
}

// Dos palabras desconocidas se consideran iguales si tienen la misma raíz o casi (1 letra de diferencia en palabras largas).
function parecidas(a: string, b: string) {
  if (a === b) return true;
  if (a.length < 5 || b.length < 5) return false;
  const max = a.length >= 8 && b.length >= 8 ? 2 : 1;
  return distancia(a, b, max) <= max;
}

/* ---------- De texto a conceptos ---------- */
function resolver(p: string): Set<string> | null {
  const exacta = DICCIONARIO.get(p);
  if (exacta) return exacta;
  const r = raiz(p);
  if (r.length >= 4) {
    const porRaiz = DICCIONARIO.get(r);
    if (porRaiz) return porRaiz;
  }
  if (p.length >= 5) {
    const max = p.length >= 8 ? 2 : 1;
    let mejor: { d: number; palabra: string } | null = null;
    for (const palabra of PALABRAS) {
      if (palabra.length < 5) continue;
      const d = distancia(p, palabra, max);
      if (d <= max && (!mejor || d < mejor.d)) mejor = { d, palabra };
    }
    if (mejor) return DICCIONARIO.get(mejor.palabra) ?? null;
  }
  return null;
}

type Analisis = { conceptos: Set<string>; temas: Set<string>; raras: string[] };

function analizar(texto: string): Analisis {
  const a: Analisis = { conceptos: new Set(), temas: new Set(), raras: [] };
  for (const p of limpiar(texto).split(/\s+/)) {
    if (p.length < 3 || VACIAS.has(p)) continue;
    const conceptos = resolver(p);
    if (conceptos) {
      for (const c of conceptos) {
        a.conceptos.add(c);
        const tema = TEMA_DE.get(c);
        if (tema) a.temas.add(tema);
      }
    } else a.raras.push(raiz(p)); // palabra que no está en la lista: solo coincide con una igual o casi igual
  }
  return a;
}

/* ---------- Recomendación ---------- */
export type Recomendacion = {
  residente: Residente;
  compartidos: string[]; // gustos del residente que significan lo mismo que algún gusto del voluntario
  parecidos: string[]; // gustos del mismo tema pero distinto (por ejemplo, otro deporte)
  puntaje: number;
  recomendado: boolean;
};

/** Cruza los gustos del voluntario con los del residente y ordena de mayor a menor afinidad. */
export function recomendarResidentes(
  v: { intereses: string[]; actividad_deseada: string; otras_actividades?: string | null },
  residentes: Residente[]
): Recomendacion[] {
  const mios = v.intereses.map(analizar);
  const conceptos = new Set(mios.flatMap((m) => [...m.conceptos]));
  const temas = new Set(mios.flatMap((m) => [...m.temas]));
  const raras = mios.flatMap((m) => m.raras);
  // «Escribir cartas» es una actividad, no un juego de cartas.
  const actividad = analizar(`${v.actividad_deseada ?? ""} ${v.otras_actividades ?? ""}`.replace(/escribir cartas/gi, "escribir"));

  return residentes
    .map((residente) => {
      const compartidos: string[] = [];
      const parecidos: string[] = [];
      let bonus = 0; // un gusto del residente coincide con la actividad que el voluntario quiere hacer
      for (const interes of residente.intereses) {
        const a = analizar(interes);
        const igual = [...a.conceptos].some((c) => conceptos.has(c)) || a.raras.some((r) => raras.some((m) => parecidas(r, m)));
        if (igual) compartidos.push(interes);
        else if ([...a.temas].some((t) => temas.has(t))) parecidos.push(interes);
        if ([...a.conceptos].some((c) => actividad.conceptos.has(c))) bonus++;
      }
      return {
        residente, compartidos, parecidos,
        puntaje: compartidos.length * 3 + parecidos.length + bonus,
        recomendado: compartidos.length + parecidos.length > 0,
      };
    })
    .sort((a, b) => b.puntaje - a.puntaje);
}