/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { cuentaActual } from "@/lib/sesion";
import { TODAS } from "@/lib/actividades";
import { PerfilForm } from "@/components/PerfilForm";

export default async function Perfil() {
  const cuentaId = await cuentaActual();
  if (!cuentaId) redirect("/ingresar");

  const [{ data: v }, { data: cuenta }] = await Promise.all([
    db.from("voluntarios")
      .select("*, contactos_voluntarios(contacto, tutor_nombre, tutor_edad, tutor_correo)")
      .eq("cuenta_id", cuentaId).maybeSingle(),
    db.from("cuentas").select("email").eq("id", cuentaId).maybeSingle(),
  ]);
  if (!v || !cuenta) redirect("/ingresar");
  const c: any = Array.isArray(v.contactos_voluntarios) ? v.contactos_voluntarios[0] : v.contactos_voluntarios;

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="mb-2 text-4xl font-bold text-[#2F6F6B]">Mi perfil</h1>
      <p className="mb-8">Aquí puedes ver y cambiar todo lo que llenaste. Los cambios se usan en tus próximas recomendaciones y solicitudes.</p>
      <PerfilForm
        key={`${v.nombre_completo}-${cuenta.email}`}
        inicial={{
          email: cuenta.email,
          nombre: v.nombre_completo,
          edad: v.edad,
          ocupacion: v.ocupacion,
          intereses: (v.intereses ?? []).join(", "),
          experiencia: !!v.experiencia_previa,
          actividades: (v.actividad_deseada ?? "").split(", ").filter((a: string) => TODAS.includes(a)),
          otras: v.otras_actividades ?? "",
          motivo: v.motivo,
          descripcion: v.descripcion,
          contacto: c?.contacto ?? "",
          tutor: c?.tutor_nombre ? { nombre: c.tutor_nombre, edad: c.tutor_edad ?? null, correo: c.tutor_correo ?? "" } : null,
        }}
      />
    </main>
  );
}