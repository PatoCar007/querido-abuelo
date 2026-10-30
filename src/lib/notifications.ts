/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "./db";
import type { Voluntario } from "./schemas";
import { etiquetaHora, etiquetaVisita } from "./visitas";

export type DestinoOrg = {
  id: string; nombre: string; usuario: string; principal: boolean;
  correo_avisos: string | null; direccion?: string | null;
};

export type Tutor = { nombre: string; edad: number; correo: string };

// Todo lo necesario para redactar un aviso sobre una solicitud.
export type Ctx = {
  estado: string;
  reagendada: boolean;
  voluntario: Voluntario;
  email: string; // correo de la cuenta del voluntario
  contacto: string; // teléfono de contacto (si es menor de edad, el del adulto responsable)
  tutor: Tutor | null; // adulto responsable, solo para menores de edad
  residente: { apodo: string; edad: number };
  org: DestinoOrg;
  visita: { fecha: string; hora: string };
};

type Mensaje = {
  asunto: string; titulo: string; intro: string;
  datos?: [string, string][]; cierre?: string; boton?: { texto: string; url: string };
};
type Correo = string | null | undefined;
type Destino = { email?: Correo | Correo[] };

/* ---------- Formato del mensaje ---------- */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const comoTexto = (m: Mensaje) =>
  [
    m.titulo, "", m.intro,
    ...(m.boton ? ["", `${m.boton.texto}: ${m.boton.url}`] : []),
    ...(m.datos?.length ? ["", ...m.datos.map(([k, v]) => `${k}: ${v}`)] : []),
    ...(m.cierre ? ["", m.cierre] : []),
  ].join("\n");

const comoHtml = (m: Mensaje) => `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1E2B2A;line-height:1.6">
  <h2 style="color:#2F6F6B">${esc(m.titulo)}</h2>
  <p>${esc(m.intro)}</p>
  ${m.boton ? `<p><a href="${esc(m.boton.url)}" style="display:inline-block;background:#2F6F6B;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">${esc(m.boton.texto)}</a></p><p style="font-size:14px;color:#4A5E5C">Si el botón no funciona, copia este enlace en tu navegador: ${esc(m.boton.url)}</p>` : ""}
  ${m.datos?.length ? `<table style="border-collapse:collapse;width:100%">${m.datos.map(([k, v]) =>
    `<tr><td style="padding:6px 12px 6px 0;font-weight:bold;vertical-align:top">${esc(k)}</td><td style="padding:6px 0">${esc(v)}</td></tr>`).join("")}</table>` : ""}
  ${m.cierre ? `<p>${esc(m.cierre)}</p>` : ""}
  <p style="color:#4A5E5C;font-size:14px">Querido Abuelo</p>
</div>`;

/* ---------- Envío por correo (Resend) ---------- */
// Exportada para la ruta de prueba. Lanza un error con el motivo si Resend rechaza el envío.
export async function correo(para: Correo | Correo[], m: Mensaje) {
  const lista = [...new Set((Array.isArray(para) ? para : [para]).filter((x): x is string => !!x))];
  if (!lista.length) return;
  // 🔑 RESEND_API_KEY y EMAIL_FROM en las variables de entorno
  if (!process.env.RESEND_API_KEY) { console.warn("RESEND_API_KEY no está configurada: se omite el correo."); return; }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: lista, subject: m.asunto, text: comoTexto(m), html: comoHtml(m) }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

// Si el correo falla, queda registrado en los logs y la acción del usuario sigue su curso.
async function enviar(dest: Destino, m: Mensaje) {
  try { await correo(dest.email, m); }
  catch (e) { console.error(`Aviso "${m.asunto}" (correo) falló:`, e); }
}

/* ---------- Destinatarios ---------- */
// El voluntario y, si es menor de edad, también su adulto responsable.
const aVol = (c: Ctx): Destino => ({ email: [c.email, c.tutor?.correo] });
// Cada casa recibe los avisos en el correo que configuró; si no, en el de su cuenta. La cuenta original usa ORG_EMAIL.
const aOrg = (o: DestinoOrg): Destino => ({
  email: o.correo_avisos ?? (o.principal ? process.env.ORG_EMAIL : o.usuario) ?? null,
});

/* ---------- Carga de datos de una solicitud ---------- */
const uno = (x: any) => (Array.isArray(x) ? x[0] : x);

export async function cargarContexto(solicitudId: string): Promise<Ctx | null> {
  const { data } = await db.from("solicitudes")
    .select("estado, reagendada, fecha_visita, hora_visita, voluntarios(*, cuentas(email), contactos_voluntarios(contacto, tutor_nombre, tutor_edad, tutor_correo)), residentes(apodo, edad, organizaciones(id, nombre, usuario, principal, direccion, correo_avisos))")
    .eq("id", solicitudId).maybeSingle();
  const s: any = data;
  const v = uno(s?.voluntarios), r = uno(s?.residentes), org = uno(r?.organizaciones);
  if (!s || !v || !r || !org) return null;
  const c = uno(v.contactos_voluntarios);
  return {
    estado: s.estado, reagendada: !!s.reagendada, voluntario: v as Voluntario,
    email: uno(v.cuentas)?.email ?? "", contacto: c?.contacto ?? "",
    tutor: c?.tutor_nombre ? { nombre: c.tutor_nombre, edad: c.tutor_edad, correo: c.tutor_correo } : null,
    residente: { apodo: r.apodo, edad: r.edad }, org, visita: { fecha: s.fecha_visita, hora: s.hora_visita },
  };
}

const cuando = (c: Ctx) => etiquetaVisita(c.visita.fecha, c.visita.hora);
const nombre = (c: Ctx) => c.voluntario.nombre_completo.split(" ")[0];
const avisoMenor = (c: Ctx) =>
  c.voluntario.edad < 18
    ? `Recuerda: por ser menor de edad debes ir acompañado/a de una persona adulta que dé su consentimiento.${c.tutor ? ` Adulto responsable registrado: ${c.tutor.nombre}.` : ""}`
    : undefined;

/* ---------- Avisos: solicitudes ---------- */
// Al agendar o reagendar: aviso a la casa (con los datos del voluntario) y confirmación al voluntario.
export async function avisarSolicitud(c: Ctx) {
  const v = c.voluntario, re = c.reagendada, menor = v.edad < 18;
  const datos: [string, string][] = [["Fecha y hora propuestas", cuando(c)], ["Voluntario", `${v.nombre_completo}, ${v.edad} años`]];
  if (menor) {
    datos.push(["Atención", "Menor de edad: debe asistir con su adulto responsable, que da su consentimiento"]);
    if (c.tutor) datos.push(["Adulto responsable", `${c.tutor.nombre}, ${c.tutor.edad} años`], ["Correo del adulto responsable", c.tutor.correo]);
  }
  datos.push(
    ["Ocupación", v.ocupacion], ["Intereses", v.intereses.join(", ")],
    ["Experiencia con adultos mayores", v.experiencia_previa ? "Sí" : "No"],
    ["Actividades que quiere hacer", v.actividad_deseada || "Solo escribió otras actividades"],
  );
  if (v.otras_actividades) datos.push(["Otras actividades", v.otras_actividades]);
  datos.push(
    ["Motivo de las visitas", v.motivo], ["Sobre el voluntario", v.descripcion],
    [menor ? "Teléfono del adulto responsable" : "Contacto", c.contacto], ["Correo de la cuenta", c.email],
  );
  await Promise.all([
    enviar(aOrg(c.org), {
      asunto: `${re ? "Cita reagendada" : "Nueva solicitud"}: ${v.nombre_completo} quiere conocer a ${c.residente.apodo}`,
      titulo: re ? "Cita reagendada" : "Nueva solicitud de visita",
      intro: `${v.nombre_completo} ${re ? "propone una nueva fecha para visitar a" : "quiere conocer a"} ${c.residente.apodo}. Revísala en tu panel para aprobarla o rechazarla.`,
      datos,
    }),
    enviar(aVol(c), {
      asunto: re ? `Reagendaste tu cita con ${c.residente.apodo}` : `Agendaste una cita con ${c.residente.apodo}`,
      titulo: re ? "Reagendaste tu cita" : "¡Cita agendada!",
      intro: `Hola ${nombre(c)}, ${re ? "reagendaste" : "agendaste"} una cita con el residente ${c.residente.apodo} en la casa de apoyo ${c.org.nombre}, con fecha ${cuando(c)}. La casa revisará tu solicitud y te avisaremos en cuanto responda.`,
      datos: [["Residente", c.residente.apodo], ["Casa de apoyo", c.org.nombre], ["Fecha y hora", cuando(c)]],
      cierre: avisoMenor(c),
    }),
  ]);
}

// La casa aceptó o rechazó: aviso al voluntario.
export async function avisarDecision(c: Ctx, estado: "aprobada" | "rechazada") {
  if (estado === "aprobada") {
    const dir = c.org.direccion?.trim();
    await enviar(aVol(c), {
      asunto: `¡${c.org.nombre} aceptó tu solicitud!`,
      titulo: "¡Tu solicitud fue aceptada!",
      intro: `¡Hola ${nombre(c)}! La casa de apoyo ${c.org.nombre} aceptó tu solicitud. ¡Prepárate para visitar a ${c.residente.apodo}${dir ? ` en ${dir}` : ""}, el ${cuando(c)}!`,
      datos: [
        ["Residente", c.residente.apodo], ["Casa de apoyo", c.org.nombre],
        ["Dirección", dir || "La casa de apoyo te la compartirá pronto"], ["Fecha y hora", cuando(c)],
      ],
      cierre: avisoMenor(c) ?? "Si algo se complica, puedes cancelar o reagendar desde tu panel de Querido Abuelo.",
    });
  } else {
    await enviar(aVol(c), {
      asunto: `Actualización de tu solicitud con ${c.residente.apodo}`,
      titulo: "Tu solicitud no pudo ser aceptada",
      intro: `Hola ${nombre(c)}, la casa de apoyo ${c.org.nombre} no pudo aceptar tu solicitud para visitar a ${c.residente.apodo} el ${cuando(c)}. Gracias por tu interés: puedes conocer a otros residentes desde tu panel de Querido Abuelo.`,
    });
  }
}

// El voluntario canceló: confirmación al voluntario.
export async function avisarCancelacion(c: Ctx) {
  await enviar(aVol(c), {
    asunto: `Cancelaste tu cita con ${c.residente.apodo}`,
    titulo: "Cita cancelada",
    intro: `Hola ${nombre(c)}, cancelaste tu cita con el residente ${c.residente.apodo} en la casa de apoyo ${c.org.nombre}, que era el ${cuando(c)}. Cuando quieras, puedes reagendarla desde tu panel de Querido Abuelo.`,
  });
}

/* ---------- Avisos: recordatorios diarios ---------- */
// El día antes de una cita aceptada: recordatorio al voluntario.
export async function avisarRecordatorio(c: Ctx) {
  await enviar(aVol(c), {
    asunto: `Mañana visitas a ${c.residente.apodo}`,
    titulo: "Mañana es tu visita",
    intro: `Hola ${nombre(c)}, te recordamos que mañana visitas a ${c.residente.apodo} en la casa de apoyo ${c.org.nombre}.`,
    datos: [["Fecha y hora", cuando(c)], ["Dirección", c.org.direccion?.trim() || "Consúltala con la casa de apoyo"], ["Residente", c.residente.apodo]],
    cierre: avisoMenor(c) ?? "Si no puedes asistir, cancela o reagenda desde tu panel para avisar a la casa de apoyo.",
  });
}

// El mismo día: un solo correo a la casa con todas sus visitas de hoy.
export async function avisarVisitasHoy(lista: Ctx[]) {
  if (!lista.length) return;
  const org = lista[0].org;
  const orden = [...lista].sort((a, b) => a.visita.hora.localeCompare(b.visita.hora));
  await enviar(aOrg(org), {
    asunto: `Hoy tienes ${orden.length === 1 ? "1 visita" : `${orden.length} visitas`} en ${org.nombre}`,
    titulo: "Visitas de hoy",
    intro: `Estas son las visitas aprobadas para hoy en ${org.nombre}:`,
    datos: orden.map((c): [string, string] => {
      const menor = c.voluntario.edad < 18;
      return [
        etiquetaHora(c.visita.hora),
        `${c.voluntario.nombre_completo} visita a ${c.residente.apodo}${menor ? ` (menor de edad: viene con ${c.tutor?.nombre ?? "su adulto responsable"})` : ""}. ${menor ? "Teléfono del adulto" : "Contacto"}: ${c.contacto}`,
      ];
    }),
  });
}

/* ---------- Avisos: residentes ---------- */
export async function avisarAltaResidente(org: DestinoOrg, r: { apodo: string; edad: number; intereses: string[] }) {
  await enviar(aOrg(org), {
    asunto: `Nuevo residente registrado: ${r.apodo}`,
    titulo: "Se dio de alta un residente",
    intro: `Se registró un nuevo perfil en el panel de ${org.nombre}. Los voluntarios ya pueden verlo si tu casa está verificada.`,
    datos: [["Apodo", r.apodo], ["Edad", String(r.edad)], ["Intereses", r.intereses.join(", ")]],
  });
}

export async function avisarBajaResidente(org: DestinoOrg, apodo: string) {
  await enviar(aOrg(org), {
    asunto: `Perfil eliminado: ${apodo}`,
    titulo: "Se eliminó un perfil",
    intro: `Se eliminó el perfil de ${apodo} del panel de ${org.nombre}, junto con todos sus datos y solicitudes. Si no fuiste tú, cambia tu contraseña.`,
  });
}

/* ---------- Aviso: recuperar contraseña (solo voluntarios) ---------- */
export async function avisarRecuperacion(email: string, enlace: string) {
  await enviar({ email }, {
    asunto: "Recupera tu contraseña de Querido Abuelo",
    titulo: "Elige una nueva contraseña",
    intro: "Recibimos una solicitud para cambiar la contraseña de tu cuenta de voluntario. El enlace funciona durante 1 hora y solo una vez. Si no fuiste tú, ignora este correo: tu contraseña no cambiará.",
    boton: { texto: "Elegir nueva contraseña", url: enlace },
  });
}