import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { COOKIE_ORG, OPCIONES_COOKIE_ORG, crearTokenOrg } from "@/lib/orgAuth";
import { hashClave } from "@/lib/sesion";

async function crearCuenta(fd: FormData) {
  "use server";
  const nombre = String(fd.get("nombre") ?? "").trim();
  const correo = String(fd.get("correo") ?? "").trim().toLowerCase();
  const clave = String(fd.get("clave") ?? "");

  if (nombre.length < 3) redirect("/organizacion/registro?error=nombre");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) redirect("/organizacion/registro?error=correo");
  if (clave.length < 8) redirect("/organizacion/registro?error=clave");

  const { data, error } = await db.from("organizaciones")
    .insert({ nombre, usuario: correo, clave_hash: await hashClave(clave) })
    .select("id").single();
  if (error || !data) redirect(`/organizacion/registro?error=${error?.code === "23505" ? "existe" : "otro"}`);

  (await cookies()).set(COOKIE_ORG, await crearTokenOrg(data.id), OPCIONES_COOKIE_ORG);
  redirect("/organizacion");
}

const ERRORES: Record<string, string> = {
  nombre: "Escribe el nombre de la casa de apoyo.",
  correo: "Escribe un correo válido.",
  clave: "La contraseña debe tener al menos 8 caracteres.",
  existe: "Ese correo ya tiene una cuenta. Inicia sesión.",
  otro: "No se pudo crear la cuenta. Intenta de nuevo.",
};

export default async function RegistroOrganizacion({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const campo = "mt-1 w-full rounded-lg border-2 border-[#9DB8B5] bg-white px-4 py-3";
  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="mb-2 text-4xl font-bold text-[#2F6F6B]">Registra tu casa de apoyo</h1>
      <p className="mb-8">Tendrás tu propio panel, tus propios abuelitos y tus propias solicitudes.</p>
      <form action={crearCuenta} className="space-y-6">
        <label className="block"><span className="font-bold">Nombre de la casa de apoyo</span>
          <input name="nombre" required className={campo} /></label>
        <label className="block"><span className="font-bold">Correo electrónico</span>
          <span className="block text-base text-[#4A5E5C]">Con él iniciarás sesión y recibirás los avisos de nuevas solicitudes.</span>
          <input name="correo" type="email" required autoComplete="email" className={campo} /></label>
        <label className="block"><span className="font-bold">Contraseña</span>
          <span className="block text-base text-[#4A5E5C]">Mínimo 8 caracteres.</span>
          <input name="clave" type="password" minLength={8} required autoComplete="new-password" className={campo} /></label>
        {error && <p role="alert" className="font-bold text-red-700">{ERRORES[error] ?? ERRORES.otro}</p>}
        <button className="rounded-xl bg-[#2F6F6B] px-6 py-4 font-bold text-white">Crear cuenta</button>
      </form>
      <p className="mt-8">¿Ya tienes cuenta? <Link href="/organizacion/login" className="font-bold text-[#2F6F6B] underline">Inicia sesión</Link></p>
    </main>
  );
}