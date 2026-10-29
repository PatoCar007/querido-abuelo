// Sesión de las organizaciones: cookie firmada "idOrganización.vence.firma".
// 🔑 Usa SESSION_SECRET de .env.local. Sin next/headers, para poder usarse también en proxy.ts.
export const COOKIE_ORG = "qa_org";
export const DURACION_ORG = 60 * 60 * 12; // 12 horas
export const OPCIONES_COOKIE_ORG = {
  httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: DURACION_ORG,
  secure: process.env.NODE_ENV === "production",
};

async function firmar(texto: string) {
  const enc = new TextEncoder();
  const llave = await crypto.subtle.importKey(
    "raw", enc.encode(process.env.SESSION_SECRET ?? ""), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const firma = await crypto.subtle.sign("HMAC", llave, enc.encode(texto));
  return Array.from(new Uint8Array(firma), (b) => b.toString(16).padStart(2, "0")).join("");
}

// Comparación que tarda lo mismo aunque las primeras letras difieran.
const iguales = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};

export async function crearTokenOrg(orgId: string) {
  const base = `${orgId}.${Date.now() + DURACION_ORG * 1000}`;
  return `${base}.${await firmar(base)}`;
}

/** Devuelve el id de la organización si la cookie es válida, o null. */
export async function leerTokenOrg(token?: string | null) {
  if (!token || !process.env.SESSION_SECRET) return null;
  const [id, exp, firma] = token.split(".");
  if (!id || !exp || !firma) return null;
  if (!iguales(firma, await firmar(`${id}.${exp}`))) return null;
  return Number(exp) > Date.now() ? id : null;
}