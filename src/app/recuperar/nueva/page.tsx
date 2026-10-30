import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashClave } from "@/lib/sesion";

async function cambiarClave(fd: FormData) {
  "use server";
  const token = String(fd.get("token") ?? "");
  const clave = String(fd.get("clave") ?? "");
  const volver = (error: string) => redirect(`/recuperar/nueva?token=${encodeURIComponent(token)}&error=${error}`);
  if (clave.length < 8 || clave.length > 100) volver("corta");
  if (clave !== String(fd.get("repetir") ?? "")) volver("distinta");

  const hash = createHash("sha256").update(token).digest("hex");
  const { data } = await db.from("cuentas").select("id").eq("reset_hash", hash)
    .gt("reset_expira", new Date().toISOString()).maybeSingle();
  if (!data) redirect("/recuperar?vencido=1");

  // El enlace sirve una sola vez: se borra el token al cambiar la contraseña.
  await db.from("cuentas").update({ clave_hash: await hashClave(clave), reset_hash: null, reset_expira: null }).eq("id", data.id);
  redirect("/ingresar?listo=1");
}

const ERRORES: Record<string, string> = {
  corta: "La contraseña debe tener al menos 8 caracteres.",
  distinta: "Las dos contraseñas no coinciden.",
};

export default async function NuevaClave({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  if (!token) redirect("/recuperar");
  const campo = "mt-1 w-full rounded-lg border-2 border-[#9DB8B5] bg-white px-4 py-3";
  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="mb-2 text-4xl font-bold text-[#2F6F6B]">Elige tu nueva contraseña</h1>
      <p className="mb-8">Escríbela dos veces. Mínimo 8 caracteres.</p>
      <form action={cambiarClave} className="space-y-6">
        <input type="hidden" name="token" value={token} />
        <label className="block"><span className="font-bold">Nueva contraseña</span>
          <input name="clave" type="password" minLength={8} required autoComplete="new-password" className={campo} /></label>
        <label className="block"><span className="font-bold">Repite la contraseña</span>
          <input name="repetir" type="password" minLength={8} required autoComplete="new-password" className={campo} /></label>
        {error && <p role="alert" className="font-bold text-red-700">{ERRORES[error] ?? "No se pudo cambiar la contraseña."}</p>}
        <button className="rounded-xl bg-[#2F6F6B] px-6 py-4 font-bold text-white">Guardar contraseña</button>
      </form>
    </main>
  );
}