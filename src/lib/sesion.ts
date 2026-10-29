import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const COOKIE_SESION = "qa_sesion";
export const OPCIONES_COOKIE = {
  httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 30, // 30 días
  secure: process.env.NODE_ENV === "production",
};

const derivar = (clave: string, sal: Buffer) =>
  new Promise<Buffer>((ok, mal) => scrypt(clave, sal, 64, (e, k) => (e ? mal(e) : ok(k))));

export async function hashClave(clave: string) {
  const sal = randomBytes(16);
  return `${sal.toString("hex")}:${(await derivar(clave, sal)).toString("hex")}`;
}

export async function verificarClave(clave: string, guardado: string) {
  const [sal, hash] = guardado.split(":");
  if (!sal || !hash) return false;
  const calculado = await derivar(clave, Buffer.from(sal, "hex"));
  const esperado = Buffer.from(hash, "hex");
  return calculado.length === esperado.length && timingSafeEqual(calculado, esperado);
}

// 🔑 SESSION_SECRET (.env.local): texto largo y aleatorio. Firma la cookie para que nadie la falsifique.
const firmar = (texto: string) =>
  createHmac("sha256", process.env.SESSION_SECRET ?? "").update(texto).digest("hex");

export function crearToken(cuentaId: string) {
  const base = `${cuentaId}.${Date.now() + OPCIONES_COOKIE.maxAge * 1000}`;
  return `${base}.${firmar(base)}`;
}

/** Devuelve el id de la cuenta con sesión iniciada, o null. */
export async function cuentaActual(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE_SESION)?.value;
  if (!token || !process.env.SESSION_SECRET) return null;
  const [id, exp, firma] = token.split(".");
  if (!id || !exp || !firma) return null;
  const esperada = Buffer.from(firmar(`${id}.${exp}`));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null;
  return Number(exp) > Date.now() ? id : null;
}