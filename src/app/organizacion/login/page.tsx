import Link from "next/link";
import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { COOKIE_ORG, OPCIONES_COOKIE_ORG, crearTokenOrg } from "@/lib/orgAuth";
import { verificarClave } from "@/lib/sesion";

const igual = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

async function iniciarSesion(fd: FormData) {
  "use server";
  const usuario = String(fd.get("usuario") ?? "").trim().toLowerCase();
  const clave = String(fd.get("clave") ?? "");
  let orgId: string | null = null;

  // 1) Cuenta original: usuario y contraseña de .env.local (ORG_USER y ORG_PASSWORD)
  const envUser = (process.env.ORG_USER ?? "").trim().toLowerCase();
  if (envUser && process.env.ORG_PASSWORD && igual(usuario, envUser) && igual(clave, process.env.ORG_PASSWORD)) {
    const { data } = await db.from("organizaciones").select("id").eq("principal", true).maybeSingle();
    orgId = data?.id ?? null;
  } else if (usuario) {
    // 2) Cuentas creadas desde /organizacion/registro
    const { data } = await db.from("organizaciones").select("id, clave_hash").eq("usuario", usuario).maybeSingle();
    if (data?.clave_hash && (await verificarClave(clave, data.clave_hash))) orgId = data.id;
  }

  if (!orgId) redirect("/organizacion/login?error=1");
  (await cookies()).set(COOKIE_ORG, await crearTokenOrg(orgId), OPCIONES_COOKIE_ORG);
  redirect("/organizacion");
}

export default async function LoginOrganizacion({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const campo = "mt-1 w-full rounded-lg border-2 border-[#9DB8B5] bg-white px-4 py-3";
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="mb-2 text-4xl font-bold text-[#2F6F6B]">Acceso de la organización</h1>
      <p className="mb-8">Ingresa con el usuario o correo y la contraseña de tu casa de apoyo.</p>
      <form action={iniciarSesion} className="space-y-6">
        <label className="block"><span className="font-bold">Usuario o correo</span>
          <input name="usuario" required autoComplete="username" className={campo} /></label>
        <label className="block"><span className="font-bold">Contraseña</span>
          <input name="clave" type="password" required autoComplete="current-password" className={campo} /></label>
        {error && <p role="alert" className="font-bold text-red-700">Usuario o contraseña incorrectos.</p>}
        <button className="rounded-xl bg-[#2F6F6B] px-6 py-4 font-bold text-white">Entrar</button>
      </form>
      <p className="mt-8">¿Tu casa de apoyo aún no tiene cuenta? <Link href="/organizacion/registro" className="font-bold text-[#2F6F6B] underline">Crea una</Link></p>
    </main>
  );
}