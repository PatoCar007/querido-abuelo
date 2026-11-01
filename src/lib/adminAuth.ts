import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { leerTokenOrg } from "./orgAuth";

export const COOKIE_ADMIN = "qa_admin";

/** Para páginas y acciones de /admin: sin sesión de administrador, manda al login. */
export async function exigirAdmin() {
  const id = await leerTokenOrg((await cookies()).get(COOKIE_ADMIN)?.value);
  if (id !== "admin") redirect("/admin/login");
}