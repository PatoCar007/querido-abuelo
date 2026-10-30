import Link from "next/link";
import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { avisarRecuperacion } from "@/lib/notifications";

async function pedirEnlace(fd: FormData) {
  "use server";
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const { data } = await db.from("cuentas").select("id, reset_expira").eq("email", email).maybeSingle();
    // Máximo un correo cada 2 minutos por cuenta (el enlace dura 1 hora).
    const reciente = !!data?.reset_expira && new Date(data.reset_expira).getTime() > Date.now() + 58 * 60 * 1000;
    if (data && !reciente) {
      const token = randomBytes(32).toString("hex");
      await db.from("cuentas").update({
        reset_hash: createHash("sha256").update(token).digest("hex"), // solo se guarda el hash
        reset_expira: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }).eq("id", data.id);
      // 🔑 SITE_URL (variable de entorno): la dirección de tu página, por ejemplo https://tudominio.com
      const h = await headers();
      const host = h.get("host") ?? "localhost:3000";
      const base = process.env.SITE_URL ?? `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
      await avisarRecuperacion(email, `${base}/recuperar/nueva?token=${token}`);
    }
  }
  // Misma respuesta exista o no la cuenta, para no revelar qué correos están registrados.
  redirect("/recuperar?enviado=1");
}

export default async function Recuperar({ searchParams }: { searchParams: Promise<{ enviado?: string; vencido?: string }> }) {
  const { enviado, vencido } = await searchParams;
  const campo = "mt-1 w-full rounded-lg border-2 border-[#9DB8B5] bg-white px-4 py-3";
  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="mb-2 text-4xl font-bold text-[#2F6F6B]">Recupera tu contraseña</h1>
      {vencido && (
        <p role="alert" className="mb-6 rounded-xl bg-red-100 p-4 font-bold text-red-800">
          El enlace venció o ya se usó. Pide uno nuevo aquí abajo.
        </p>
      )}
      {enviado ? (
        <p role="status" className="rounded-xl bg-[#E3EEEC] p-4 font-bold">
          Si ese correo tiene una cuenta de voluntario, te enviamos un enlace para elegir una nueva contraseña. Funciona 1 hora.
          Revisa también tu carpeta de spam.
        </p>
      ) : (
        <>
          <p className="mb-8">Escribe el correo de tu cuenta y te enviaremos un enlace para elegir una contraseña nueva.</p>
          <form action={pedirEnlace} className="space-y-6">
            <label className="block"><span className="font-bold">Correo electrónico</span>
              <input name="email" type="email" required autoComplete="email" className={campo} /></label>
            <button className="rounded-xl bg-[#2F6F6B] px-6 py-4 font-bold text-white">Enviar enlace</button>
          </form>
        </>
      )}
      <p className="mt-8"><Link href="/ingresar" className="font-bold text-[#2F6F6B] underline">Volver a iniciar sesión</Link></p>
    </main>
  );
}