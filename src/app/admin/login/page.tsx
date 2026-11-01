import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_ADMIN } from "@/lib/adminAuth";
import { limpiarFallos, minutosBloqueado, registrarFallo } from "@/lib/limite";
import { OPCIONES_COOKIE_ORG, crearTokenOrg } from "@/lib/orgAuth";

const igual = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

async function entrar(fd: FormData) {
  "use server";
  const clave = String(fd.get("clave") ?? "");
  const espera = await minutosBloqueado("admin", "admin");
  if (espera) redirect(`/admin/login?error=bloqueo&min=${espera}`);
  const esperada = process.env.ADMIN_PASSWORD;
  if (!esperada || !igual(clave, esperada)) {
    await registrarFallo("admin", "admin");
    redirect("/admin/login?error=1");
  }
  await limpiarFallos("admin", "admin");
  (await cookies()).set(COOKIE_ADMIN, await crearTokenOrg("admin"), OPCIONES_COOKIE_ORG);
  redirect("/admin");
}

export default async function LoginAdmin({ searchParams }: { searchParams: Promise<{ error?: string; min?: string }> }) {
  const { error, min } = await searchParams;
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="mb-2 text-4xl font-bold text-[#2F6F6B]">Administración</h1>
      <p className="mb-8">Acceso solo para el equipo de Querido Abuelo.</p>
      <form action={entrar} className="space-y-6">
        <label className="block"><span className="font-bold">Contraseña</span>
          <input name="clave" type="password" required autoComplete="current-password"
            className="mt-1 w-full rounded-lg border-2 border-[#9DB8B5] bg-white px-4 py-3" /></label>
        {error && (
          <p role="alert" className="font-bold text-red-700">
            {error === "bloqueo" ? `Demasiados intentos fallidos. Intenta de nuevo en ${Number(min) || 15} minutos.` : "Contraseña incorrecta."}
          </p>
        )}
        <button className="rounded-xl bg-[#2F6F6B] px-6 py-4 font-bold text-white">Entrar</button>
      </form>
    </main>
  );
}