/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { cuentaActual } from "@/lib/sesion";
import { recomendarResidentes, type Recomendacion } from "@/lib/matching";
import { etiquetaVisita } from "@/lib/visitas";
import { SolicitudButton, LogoutButton, EliminarCuentaButton } from "@/components/forms";

export default async function DashboardVoluntario() {
  const cuentaId = await cuentaActual();
  if (!cuentaId) redirect("/ingresar");

  const { data: v } = await db.from("voluntarios").select("*").eq("cuenta_id", cuentaId).maybeSingle();
  if (!v) redirect("/ingresar");

  const [{ data: residentes }, { data: enviadas }] = await Promise.all([
    // Solo se muestran abuelitos de casas de apoyo verificadas
    db.from("residentes")
      .select("*, organizaciones!inner(nombre, edad_minima, criterios, verificada)")
      .eq("organizaciones.verificada", true),
    db.from("solicitudes").select("residente_id, estado, fecha_visita, hora_visita").eq("voluntario_id", v.id),
  ]);

  const casas: Record<string, any> = Object.fromEntries((residentes ?? []).map((r: any) => [r.id, r.organizaciones]));
  const estados: Record<string, string> = Object.fromEntries((enviadas ?? []).map((s) => [s.residente_id, s.estado]));
  const visitas: Record<string, string> = Object.fromEntries(
    (enviadas ?? []).map((s) => [s.residente_id, s.fecha_visita ? etiquetaVisita(s.fecha_visita, s.hora_visita) : ""])
  );
  const lista = recomendarResidentes(v, residentes ?? []);
  const historial = lista.filter((r) => estados[r.residente.id]); // con quienes ya hay solicitud
  const nuevos = lista.filter((r) => !estados[r.residente.id]);
  const afines = nuevos.filter((r) => r.recomendado);
  const otros = nuevos.filter((r) => !r.recomendado);

  const Tarjeta = ({ r }: { r: Recomendacion }) => {
    const casa = casas[r.residente.id];
    const estado = estados[r.residente.id];
    const muyJoven = !estado && v.edad < casa.edad_minima; // criterio de edad de la casa
    return (
      <article className="rounded-2xl border border-[#C9DAD7] bg-white p-6">
        <h3 className="text-2xl font-bold">{r.residente.apodo}</h3>
        <p>{r.residente.edad} años</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {r.residente.intereses.map((i) => (
            <li key={i} className={`rounded-full px-3 py-1 ${r.compartidos.includes(i) ? "bg-[#E4A93C] font-bold" : "bg-[#E3EEEC]"}`}>{i}</li>
          ))}
        </ul>
        {r.recomendado && <p className="mt-3 font-bold text-[#2F6F6B]">Comparten: {r.compartidos.join(", ")}</p>}
        <p className="mt-3 text-base text-[#4A5E5C]">Casa de apoyo: <span className="font-bold">{casa.nombre}</span></p>
        {casa.criterios && <p className="mt-1 text-base">Requisitos de la casa: {casa.criterios}</p>}
        <div className="mt-4">
          {muyJoven ? (
            <p role="note" className="rounded-xl bg-[#E3EEEC] px-4 py-3 font-bold">
              Esta casa de apoyo pide tener al menos {casa.edad_minima} años para visitar.
            </p>
          ) : (
            <SolicitudButton residenteId={r.residente.id} estado={estado} visita={visitas[r.residente.id]} />
          )}
        </div>
      </article>
    );
  };

  return (
    <main className="mx-auto max-w-4xl space-y-10 px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl font-bold text-[#2F6F6B]">Hola, {v.nombre_completo.split(" ")[0]}</h1>
        <LogoutButton />
      </div>

      {v.edad < 18 && (
        <p role="note" className="rounded-xl border-2 border-[#E4A93C] bg-[#FBEFD3] p-4 font-bold">
          Recuerda: por ser menor de edad, debes ir siempre acompañado/a de una persona adulta que dé su consentimiento.
          Tus actividades son didácticas, como juegos de mesa, platicar, escribir o pintar.
        </p>
      )}

      {historial.length > 0 && (
        <section>
          <h2 className="mb-4 text-2xl font-bold">Mis solicitudes</h2>
          <div className="grid gap-4 sm:grid-cols-2">{historial.map((r) => <Tarjeta key={r.residente.id} r={r} />)}</div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-2xl font-bold">Podrían interesarte</h2>
        {afines.length === 0 && <p>Por ahora no hay coincidencias nuevas. Revisa la lista de abajo.</p>}
        <div className="grid gap-4 sm:grid-cols-2">{afines.map((r) => <Tarjeta key={r.residente.id} r={r} />)}</div>
      </section>

      {otros.length > 0 && (
        <section>
          <h2 className="mb-4 text-2xl font-bold">Otros residentes</h2>
          <div className="grid gap-4 sm:grid-cols-2">{otros.map((r) => <Tarjeta key={r.residente.id} r={r} />)}</div>
        </section>
      )}

      <section className="border-t border-[#C9DAD7] pt-8">
        <h2 className="mb-2 text-xl font-bold">Tu cuenta</h2>
        <p className="mb-4">
          Si eliminas tu cuenta se borran tus datos, tu historial y tus solicitudes, y podrás volver a registrar tu correo.
        </p>
        <EliminarCuentaButton />
      </section>
    </main>
  );
}