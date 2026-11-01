/* eslint-disable @typescript-eslint/no-explicit-any */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { COOKIE_ADMIN, exigirAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

async function cambiarVerificacion(fd: FormData) {
  "use server";
  await exigirAdmin();
  // La cuenta original (principal) no se toca: siempre queda verificada.
  await db.from("organizaciones").update({ verificada: fd.get("verificada") === "true" })
    .eq("id", String(fd.get("id"))).eq("principal", false);
  revalidatePath("/admin");
  revalidatePath("/voluntario");
}

async function cerrarSesion() {
  "use server";
  (await cookies()).delete(COOKIE_ADMIN);
  redirect("/admin/login");
}

function Tarjeta({ c }: { c: any }) {
  return (
    <article className="rounded-2xl border border-[#C9DAD7] bg-white p-6">
      <p className="text-xl font-bold">{c.nombre}</p>
      <p>Correo de la cuenta: {c.usuario}</p>
      <p>Dirección: {c.direccion || "sin llenar"}. Teléfono: {c.telefono || "sin llenar"}.</p>
      <p>Residentes registrados: {c.residentes?.[0]?.count ?? 0}. Se registró el {new Date(c.created_at).toLocaleDateString("es-MX")}.</p>
      {c.principal ? (
        <p className="mt-3 font-bold text-[#2F6F6B]">Cuenta original: siempre verificada.</p>
      ) : (
        <form action={cambiarVerificacion} className="mt-3">
          <input type="hidden" name="id" value={c.id} />
          <button
            name="verificada" value={c.verificada ? "false" : "true"}
            className={c.verificada
              ? "rounded-lg border-2 border-[#2F6F6B] px-4 py-2 font-bold text-[#2F6F6B]"
              : "rounded-lg bg-[#2F6F6B] px-4 py-2 font-bold text-white"}
          >{c.verificada ? "Quitar verificación" : "Verificar casa de apoyo"}</button>
        </form>
      )}
    </article>
  );
}

export default async function Admin() {
  await exigirAdmin();
  const { data, error } = await db.from("organizaciones")
    .select("id, nombre, usuario, direccion, telefono, verificada, principal, created_at, residentes(count)")
    .order("created_at", { ascending: false });
  const casas: any[] = data ?? [];
  const pendientes = casas.filter((c) => !c.verificada);
  const verificadas = casas.filter((c) => c.verificada);

  return (
    <main className="mx-auto max-w-4xl space-y-10 px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl font-bold text-[#2F6F6B]">Administración</h1>
        <form action={cerrarSesion}>
          <button className="rounded-xl border-2 border-[#2F6F6B] px-5 py-3 font-bold text-[#2F6F6B]">Cerrar sesión</button>
        </form>
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-100 p-4 font-bold text-red-800">No se pudieron cargar las casas: {error.message}</p>}
      <p>Verifica una casa solo después de comprobar que existe. Al verificarla, sus residentes quedan visibles para los voluntarios.</p>
      <section>
        <h2 className="mb-4 text-2xl font-bold">Pendientes de verificar ({pendientes.length})</h2>
        {!pendientes.length && <p>No hay casas pendientes.</p>}
        <div className="space-y-4">{pendientes.map((c) => <Tarjeta key={c.id} c={c} />)}</div>
      </section>
      <section>
        <h2 className="mb-4 text-2xl font-bold">Verificadas ({verificadas.length})</h2>
        <div className="space-y-4">{verificadas.map((c) => <Tarjeta key={c.id} c={c} />)}</div>
      </section>
    </main>
  );
}