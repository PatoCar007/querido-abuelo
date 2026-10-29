import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { COOKIE_ORG, leerTokenOrg } from "./orgAuth";

export type Organizacion = {
  id: string; nombre: string; usuario: string; principal: boolean; verificada: boolean;
  correo_avisos: string | null; edad_minima: number; criterios: string | null; direccion: string | null;
};

/** Organización con sesión iniciada, o null. */
export async function orgActual(): Promise<Organizacion | null> {
  const id = await leerTokenOrg((await cookies()).get(COOKIE_ORG)?.value);
  if (!id) return null;
  const { data } = await db.from("organizaciones")
    .select("id, nombre, usuario, principal, verificada, correo_avisos, edad_minima, criterios, direccion")
    .eq("id", id).maybeSingle();
  return data;
}

/** Para páginas y acciones del panel: si no hay sesión, manda al login. */
export async function exigirOrg() {
  const org = await orgActual();
  if (!org) redirect("/organizacion/login");
  return org;
}