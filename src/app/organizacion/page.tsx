/* eslint-disable @typescript-eslint/no-explicit-any */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { COOKIE_ORG } from "@/lib/orgAuth";
import { exigirOrg } from "@/lib/orgSesion";
import { etiquetaVisita } from "@/lib/visitas";
import { avisarBajaResidente, avisarDecision, avisarPerfilEliminado, cargarContexto, type Ctx } from "@/lib/notifications";
import { ResidentForm, BorrarResidenteButton, EliminarOrgButton, ReagendarOrgButton } from "@/components/forms";

export const dynamic = "force-dynamic";

// Solicitudes vigentes (pendientes o aprobadas) de esta organización, con los datos para avisar a cada voluntario.
async function vigentes(orgId: string, residenteId?: string): Promise<Ctx[]> {
  let q = db.from("solicitudes").select("id, residentes!inner(organizacion_id)")
    .eq("residentes.organizacion_id", orgId).in("estado", ["pendiente", "aprobada"]);
  if (residenteId) q = q.eq("residente_id", residenteId);
  const { data } = await q;
  const ctxs = await Promise.all((data ?? []).map((s: any) => cargarContexto(s.id)));
  return ctxs.filter((c): c is Ctx => !!c);
}

// Cada acción verifica la sesión y que lo que se toca pertenezca a ESTA organización.
async function cambiarEstado(fd: FormData) {
  "use server";
  const org = await exigirOrg();
  const id = String(fd.get("id"));
  const estado = String(fd.get("estado"));
  if (!["aprobada", "rechazada"].includes(estado)) return;
  const { data: propia } = await db.from("solicitudes")
    .select("id, residentes!inner(organizacion_id)")
    .eq("id", id).eq("residentes.organizacion_id", org.id).maybeSingle();
  if (!propia) return;
  // No se decide una solicitud cancelada, y si ya tenía ese estado no se repite el aviso.
  const { data: cambiada } = await db.from("solicitudes").update({ estado }).eq("id", id)
    .neq("estado", "cancelada").neq("estado", estado).select("id");
  if (cambiada?.length) {
    const ctx = await cargarContexto(id);
    if (ctx) await avisarDecision(ctx, estado as "aprobada" | "rechazada");
  }
  revalidatePath("/organizacion");
}

async function borrarResidente(fd: FormData) {
  "use server";
  const org = await exigirOrg();
  const id = String(fd.get("id"));
  const afectadas = await vigentes(org.id, id); // se leen ANTES de borrar
  // Sus solicitudes se borran solas (on delete cascade en la base de datos).
  const { data: borrados } = await db.from("residentes").delete().eq("id", id).eq("organizacion_id", org.id).select("apodo");
  if (borrados?.length) {
    await avisarBajaResidente(org, borrados[0].apodo);
    await Promise.all(afectadas.map(avisarPerfilEliminado));
  }
  revalidatePath("/organizacion");
  revalidatePath("/voluntario");
}

async function guardarConfiguracion(fd: FormData) {
  "use server";
  const org = await exigirOrg();
  const nombre = String(fd.get("nombre") ?? "").trim();
  const correo = String(fd.get("correo_avisos") ?? "").trim().toLowerCase();
  await db.from("organizaciones").update({
    nombre: nombre.length >= 3 ? nombre : org.nombre,
    direccion: String(fd.get("direccion") ?? "").trim().slice(0, 250) || null,
    telefono: String(fd.get("telefono") ?? "").trim().slice(0, 30) || null,
    edad_minima: Math.min(99, Math.max(12, Number(fd.get("edad_minima")) || 12)),
    criterios: String(fd.get("criterios") ?? "").trim().slice(0, 600) || null,
    correo_avisos: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) ? correo : null,
  }).eq("id", org.id);
  revalidatePath("/organizacion");
  revalidatePath("/voluntario");
}

// Elimina la cuenta de la casa de apoyo con todo lo suyo. La cuenta original está protegida.
async function eliminarCuenta() {
  "use server";
  const org = await exigirOrg();
  if (org.principal) return;
  const afectadas = await vigentes(org.id); // se leen ANTES de borrar
  await db.from("organizaciones").delete().eq("id", org.id).eq("principal", false);
  await Promise.all(afectadas.map(avisarPerfilEliminado));
  (await cookies()).delete(COOKIE_ORG);
  revalidatePath("/voluntario");
  redirect("/organizacion/registro");
}

async function cerrarSesion() {
  "use server";
  (await cookies()).delete(COOKIE_ORG);
  redirect("/organizacion/login");
}

const ESTILO: Record<string, { texto: string; clase: string }> = {
  pendiente: { texto: "Pendiente", clase: "bg-[#E4A93C]" },
  aprobada: { texto: "Aprobada", clase: "bg-[#2F6F6B] text-white" },
  rechazada: { texto: "Rechazada", clase: "bg-red-100 text-red-800" },
  cancelada: { texto: "Cancelada por el voluntario", clase: "bg-red-700 text-white" },
};

const campo = "mt-1 w-full rounded-lg border-2 border-[#9DB8B5] bg-white px-4 py-3";

export default async function Organizacion() {
  const org = await exigirOrg();

  const [{ data: solicitudes, error: errorSolicitudes }, { data: residentes }] = await Promise.all([
    // Solo las solicitudes de los abuelitos de ESTA organización
    db.from("solicitudes")
      .select("id, estado, created_at, fecha_visita, hora_visita, reagendada, reagendada_por_org, residentes!inner(apodo, edad, organizacion_id), voluntarios(*, cuentas(email), contactos_voluntarios(contacto, tutor_nombre, tutor_edad, tutor_correo))")
      .eq("residentes.organizacion_id", org.id)
      .order("created_at", { ascending: false }),
    db.from("residentes").select("*").eq("organizacion_id", org.id).order("created_at", { ascending: false }),
  ]);
  if (errorSolicitudes) console.error("Error al cargar solicitudes:", errorSolicitudes);

  return (
    <main className="mx-auto max-w-4xl space-y-12 px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl font-bold text-[#2F6F6B]">Panel de {org.nombre}</h1>
        <form action={cerrarSesion}>
          <button className="rounded-xl border-2 border-[#2F6F6B] px-5 py-3 font-bold text-[#2F6F6B]">Cerrar sesión</button>
        </form>
      </div>

      {!org.verificada && (
        <p role="note" className="rounded-xl border-2 border-[#E4A93C] bg-[#FBEFD3] p-4 font-bold">
          Tu cuenta está pendiente de verificación. Puedes registrar a tus residentes, pero los voluntarios no los verán
          hasta que el equipo de Querido Abuelo verifique tu casa de apoyo.
        </p>
      )}

      <section aria-labelledby="sol">
        <h2 id="sol" className="text-2xl font-bold">Solicitudes de voluntarios</h2>
        {errorSolicitudes && (
          <p role="alert" className="mt-4 rounded-xl bg-red-100 p-4 font-bold text-red-800">
            No se pudieron cargar las solicitudes: {errorSolicitudes.message}
          </p>
        )}
        {!errorSolicitudes && !solicitudes?.length && (
          <p className="mt-4">Aún no hay solicitudes. Cuando un voluntario pida conocer a uno de tus residentes, aparecerá aquí.</p>
        )}
        <div className="mt-4 space-y-4">
          {solicitudes?.map((s: any) => {
            const v = s.voluntarios;
            const cancelada = s.estado === "cancelada";
            const puedeReagendar = s.estado === "pendiente" || s.estado === "aprobada";
            const est = ESTILO[s.estado] ?? ESTILO.pendiente;
            return (
              <article key={s.id} className={`rounded-2xl border bg-white p-6 ${cancelada ? "border-red-700" : "border-[#C9DAD7]"}`}>
                <p className="font-bold">{v.nombre_completo}, {v.edad} años, quiere conocer a {s.residentes?.apodo}</p>
                {v.edad < 18 && <p className="my-1 inline-block rounded-lg bg-[#FBEFD3] px-3 py-1 font-bold">Menor de edad: debe asistir con un adulto que dé su consentimiento</p>}
                <p>Ocupación: {v.ocupacion}. Intereses: {v.intereses.join(", ")}.</p>
                <p>Experiencia previa: {v.experiencia_previa ? "sí" : "no"}.</p>
                <p>Actividades que quiere hacer: {v.actividad_deseada}</p>
                {v.otras_actividades && <p>Otras actividades: {v.otras_actividades}</p>}
                <p>Motivo de las visitas: {v.motivo}</p>
                <p>Sobre el voluntario: {v.descripcion}</p>
                <p className="mt-1 font-bold">Visita propuesta: {etiquetaVisita(s.fecha_visita, s.hora_visita)}</p>
                {s.reagendada_por_org && puedeReagendar && <p className="font-bold text-[#2F6F6B]">Reagendada por la casa de apoyo.</p>}
                {s.reagendada && !s.reagendada_por_org && s.estado === "pendiente" && <p className="font-bold text-[#2F6F6B]">Cita reagendada: el voluntario propone una nueva fecha.</p>}
                {v.contactos_voluntarios?.tutor_nombre && (
                  <p className="font-bold">Adulto responsable: {v.contactos_voluntarios.tutor_nombre}, {v.contactos_voluntarios.tutor_edad} años. Correo: {v.contactos_voluntarios.tutor_correo}</p>
                )}
                <p>{v.edad < 18 ? "Teléfono del adulto responsable" : "Contacto"}: {v.contactos_voluntarios?.contacto}. Correo de la cuenta: {v.cuentas?.email}</p>
                {cancelada && <p className="mt-2 font-bold text-red-700">El voluntario canceló esta solicitud.</p>}
                <form action={cambiarEstado} className="mt-3 flex flex-wrap items-center gap-3">
                  <input type="hidden" name="id" value={s.id} />
                  <span className={`rounded-full px-3 py-1 font-bold ${est.clase}`}>{est.texto}</span>
                  {!cancelada && (
                    <>
                      <button name="estado" value="aprobada" disabled={s.estado === "aprobada"} className="rounded-lg bg-[#2F6F6B] px-4 py-2 font-bold text-white disabled:opacity-40">Aprobar</button>
                      <button name="estado" value="rechazada" disabled={s.estado === "rechazada"} className="rounded-lg border-2 border-[#2F6F6B] px-4 py-2 font-bold text-[#2F6F6B] disabled:opacity-40">Rechazar</button>
                    </>
                  )}
                </form>
                {puedeReagendar && <div className="mt-3"><ReagendarOrgButton solicitudId={s.id} /></div>}
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="res">
        <h2 id="res" className="text-2xl font-bold">Residentes registrados ({residentes?.length ?? 0})</h2>
        {!residentes?.length && <p className="mt-4">Todavía no hay residentes registrados.</p>}
        <ul className="mt-4 space-y-3">
          {residentes?.map((r: any) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#C9DAD7] bg-white p-4">
              <div>
                <p className="font-bold">{r.apodo}, {r.edad} años</p>
                <p>{r.intereses.join(", ")}</p>
              </div>
              <form action={borrarResidente}>
                <input type="hidden" name="id" value={r.id} />
                <BorrarResidenteButton apodo={r.apodo} />
              </form>
            </li>
          ))}
        </ul>

        <h2 className="mt-10 text-2xl font-bold">Registrar residente</h2>
        <p>Para proteger su privacidad solo pedimos apodo, edad e intereses.</p>
        <ResidentForm />
      </section>

      <section aria-labelledby="cfg" className="border-t border-[#C9DAD7] pt-10">
        <h2 id="cfg" className="text-2xl font-bold">Tu casa de apoyo y tus criterios</h2>
        <p>Los voluntarios ven tus requisitos en la tarjeta de cada uno de tus residentes.</p>
        <form action={guardarConfiguracion} className="mt-4 max-w-xl space-y-4">
          <label className="block"><span className="font-bold">Nombre de la casa de apoyo</span>
            <input name="nombre" defaultValue={org.nombre} required className={campo} /></label>
          <label className="block"><span className="font-bold">Dirección de la casa de apoyo</span>
            <span className="block text-base text-[#4A5E5C]">Se envía al voluntario por correo en cada aviso de su cita.</span>
            <input name="direccion" defaultValue={org.direccion ?? ""} placeholder="Calle, número, colonia, ciudad" className={campo} /></label>
          <label className="block"><span className="font-bold">Teléfono de la casa de apoyo</span>
            <span className="block text-base text-[#4A5E5C]">Se envía al voluntario para que pueda llamar si tiene dudas.</span>
            <input name="telefono" defaultValue={org.telefono ?? ""} className={campo} /></label>
          <label className="block"><span className="font-bold">Edad mínima de los voluntarios</span>
            <span className="block text-base text-[#4A5E5C]">Quien tenga menos años no podrá solicitar visitas a tus residentes. Mínimo 12.</span>
            <input name="edad_minima" type="number" min={12} max={99} defaultValue={org.edad_minima} className={campo} /></label>
          <label className="block"><span className="font-bold">Tus criterios para aceptar voluntarios</span>
            <span className="block text-base text-[#4A5E5C]">Por ejemplo: disponibilidad mínima, cartas de recomendación, no se permiten visitas sin cita.</span>
            <textarea name="criterios" rows={3} maxLength={600} defaultValue={org.criterios ?? ""} className={campo} /></label>
          <label className="block"><span className="font-bold">Correo para recibir avisos y para contacto de voluntarios</span>
            <span className="block text-base text-[#4A5E5C]">Es el correo que recibe tus avisos y que los voluntarios ven para escribirte. Si lo dejas vacío usamos el correo de tu cuenta (en la cuenta original, el de ORG_EMAIL).</span>
            <input name="correo_avisos" type="email" defaultValue={org.correo_avisos ?? ""} className={campo} /></label>
          <button className="rounded-xl bg-[#2F6F6B] px-6 py-4 font-bold text-white">Guardar cambios</button>
        </form>
      </section>

      <section aria-labelledby="cuenta" className="border-t border-[#C9DAD7] pt-8">
        <h2 id="cuenta" className="mb-2 text-xl font-bold">Tu cuenta</h2>
        {org.principal ? (
          <p>Esta es la cuenta original de Querido Abuelo y está protegida: no se puede eliminar desde aquí.</p>
        ) : (
          <>
            <p className="mb-4">Si eliminas la cuenta se borran tus residentes, tus solicitudes y todos tus datos, y podrás volver a registrar este correo. Los voluntarios con citas vigentes recibirán un aviso.</p>
            <form action={eliminarCuenta}><EliminarOrgButton /></form>
          </>
        )}
      </section>
    </main>
  );
}