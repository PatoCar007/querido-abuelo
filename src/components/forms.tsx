"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { DE_CUIDADO, DIDACTICAS } from "@/lib/actividades";
import { horasDeFecha, TEXTO_HORARIO, etiquetaHora, etiquetaVisita } from "@/lib/visitas";
const input = "mt-1 w-full rounded-lg border-2 border-[#9DB8B5] bg-white px-4 py-3";
const btn = "rounded-xl bg-[#2F6F6B] px-6 py-4 font-bold text-white disabled:opacity-50";
const btnLineal = "rounded-xl border-2 border-[#2F6F6B] px-5 py-3 font-bold text-[#2F6F6B]";

async function post(url: string, body: unknown) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "No se pudo enviar. Intenta de nuevo.");
}

function Campo({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-bold">{label}</span>
      {hint && <span className="block text-base text-[#4A5E5C]">{hint}</span>}
      {children}
    </label>
  );
}

// Estado de envío y errores compartido por los formularios.
function useEnvio(url: string, armar: (f: FormData) => unknown, alExito: (form: HTMLFormElement) => void) {
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setCargando(true); setError("");
    try { await post(url, armar(new FormData(form))); alExito(form); }
    catch (err) { setError((err as Error).message); }
    finally { setCargando(false); }
  }
  return { onSubmit, error, cargando };
}

export function VolunteerForm() {
  const router = useRouter();
  const [edad, setEdad] = useState(0);
  const [elegidas, setElegidas] = useState<string[]>([]);
  const menor = edad > 0 && edad < 18;

  const cambiarEdad = (n: number) => {
    setEdad(n);
    // Si es menor, se quitan las actividades de cuidado que ya hubiera marcado.
    if (n > 0 && n < 18) setElegidas((prev) => prev.filter((a) => !DE_CUIDADO.includes(a)));
  };
  const alternar = (a: string) =>
    setElegidas((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  const { onSubmit, error, cargando } = useEnvio(
    "/api/voluntarios",
    (f) => {
      const otras = String(f.get("otras") ?? "").trim();
      if (elegidas.length === 0 && otras.length < 3) throw new Error("Elige al menos una actividad o escribe otra.");
      return {
        email: f.get("email"), clave: f.get("clave"), contacto: f.get("contacto"),
        tutor: menor ? { nombre: f.get("tutor_nombre"), edad: Number(f.get("tutor_edad")), correo: f.get("tutor_correo") } : undefined,
        voluntario: {
          nombre_completo: f.get("nombre"), edad, ocupacion: f.get("ocupacion"), intereses: f.get("intereses"),
          experiencia_previa: f.get("experiencia") === "si", actividad_deseada: elegidas, otras_actividades: otras,
          motivo: f.get("motivo"), descripcion: f.get("descripcion"),
        },
      };
    },
    () => { router.push("/voluntario"); router.refresh(); }
  );

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <h2 className="text-2xl font-bold">Tu cuenta</h2>
      <Campo label="Correo electrónico"><input name="email" type="email" required autoComplete="email" className={input} /></Campo>
      <Campo label="Contraseña" hint="Mínimo 8 caracteres.">
        <input name="clave" type="password" minLength={8} required autoComplete="new-password" className={input} />
      </Campo>

      <h2 className="pt-4 text-2xl font-bold">Sobre ti</h2>
      <Campo label="Nombre completo"><input name="nombre" required className={input} /></Campo>
      <Campo label="Edad">
        <input name="edad" type="number" min={12} max={110} required onChange={(e) => cambiarEdad(Number(e.target.value))} className={input} />
      </Campo>
      {menor && (
        <>
          <div role="alert" className="rounded-xl border-2 border-[#E4A93C] bg-[#FBEFD3] p-4 font-bold">
            Eres menor de edad. Para visitar a un adulto mayor debes ir acompañado/a de una persona adulta y contar con su
            consentimiento. Además, solo podrás elegir actividades didácticas.
          </div>
          <fieldset className="space-y-4 rounded-xl border-2 border-[#E4A93C] p-4">
            <legend className="px-2 font-bold">Adulto responsable</legend>
            <Campo label="Nombre completo del adulto responsable"><input name="tutor_nombre" required className={input} /></Campo>
            <Campo label="Edad del adulto responsable"><input name="tutor_edad" type="number" min={18} max={110} required className={input} /></Campo>
            <Campo label="Correo del adulto responsable" hint="También recibirá los avisos de tus visitas.">
              <input name="tutor_correo" type="email" required className={input} />
            </Campo>
          </fieldset>
        </>
      )}
      <Campo label="¿A qué te dedicas?"><input name="ocupacion" required className={input} /></Campo>
      <Campo label="Tus intereses" hint="Sepáralos con comas: música, lectura, arte">
        <input name="intereses" required className={input} />
      </Campo>
      <Campo label="Cuéntanos un poco sobre ti" hint="Cómo eres, qué te gusta, qué te hace reír.">
        <textarea name="descripcion" required rows={3} className={input} />
      </Campo>
      <fieldset>
        <legend className="font-bold">¿Has convivido antes con adultos mayores?</legend>
        <label className="mr-6"><input type="radio" name="experiencia" value="si" required /> Sí</label>
        <label><input type="radio" name="experiencia" value="no" /> No</label>
      </fieldset>

      <h2 className="pt-4 text-2xl font-bold">Tus visitas</h2>
      <Campo label="¿Por qué quieres visitar a un adulto mayor?" hint="Por ejemplo: horas de servicio social, por gusto, para mejorar la vida de alguien…">
        <textarea name="motivo" required rows={3} className={input} />
      </Campo>
      <fieldset className="space-y-2">
        <legend className="font-bold">¿Qué te gustaría hacer con ellos?</legend>
        {DIDACTICAS.map((a) => (
          <label key={a} className="flex items-center gap-3">
            <input type="checkbox" className="size-5" checked={elegidas.includes(a)} onChange={() => alternar(a)} /> {a}
          </label>
        ))}
        <p className="pt-2 font-bold">Actividades de cuidado <span className="font-normal">(solo mayores de 18 años)</span></p>
        {DE_CUIDADO.map((a) => (
          <label key={a} className={`flex items-center gap-3 ${menor ? "opacity-50" : ""}`}>
            <input type="checkbox" className="size-5" disabled={menor} checked={elegidas.includes(a)} onChange={() => alternar(a)} /> {a}
          </label>
        ))}
        <Campo label="Otras actividades:" hint={menor ? "Escribe actividades didácticas. La casa de apoyo revisará tu propuesta." : "Escribe lo que te gustaría hacer."}>
          <textarea name="otras" rows={2} maxLength={300} className={input} />
        </Campo>
      </fieldset>
      <p className="rounded-xl bg-[#E3EEEC] p-4">
        <span className="font-bold">{TEXTO_HORARIO}.</span> El día y la hora exactos los eliges al solicitar la visita a cada abuelito.
      </p>
      <Campo
        label={menor ? "Teléfono del adulto responsable" : "Teléfono o WhatsApp de contacto"}
        hint="Solo lo verá la organización."
      >
        <input name="contacto" required className={input} />
      </Campo>

      {error && <p role="alert" className="font-bold text-red-700">{error}</p>}
      <button disabled={cargando} className={btn}>{cargando ? "Creando tu cuenta…" : "Crear mi cuenta"}</button>
    </form>
  );
}

export function LoginForm() {
  const router = useRouter();
  const { onSubmit, error, cargando } = useEnvio(
    "/api/sesion",
    (f) => ({ email: f.get("email"), clave: f.get("clave") }),
    () => { router.push("/voluntario"); router.refresh(); }
  );
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Campo label="Correo electrónico"><input name="email" type="email" required autoComplete="email" className={input} /></Campo>
      <Campo label="Contraseña"><input name="clave" type="password" required autoComplete="current-password" className={input} /></Campo>
      {error && <p role="alert" className="font-bold text-red-700">{error}</p>}
      <button disabled={cargando} className={btn}>{cargando ? "Entrando…" : "Entrar"}</button>
    </form>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <button className={btnLineal} onClick={async () => {
      await fetch("/api/sesion", { method: "DELETE" });
      router.push("/"); router.refresh();
    }}>Cerrar sesión</button>
  );
}

export function ResidentForm() {
  const router = useRouter();
  const { onSubmit, error, cargando } = useEnvio(
    "/api/residentes",
    (f) => ({ apodo: f.get("apodo"), edad: Number(f.get("edad")), intereses: f.get("intereses") }),
    (form) => { form.reset(); router.refresh(); }
  );
  return (
    <form onSubmit={onSubmit} className="mt-4 max-w-md space-y-4">
      <Campo label="Apodo"><input name="apodo" required className={input} /></Campo>
      <Campo label="Edad"><input name="edad" type="number" min={1} required className={input} /></Campo>
      <Campo label="Intereses" hint="Sepáralos con comas"><input name="intereses" required className={input} /></Campo>
      {error && <p role="alert" className="font-bold text-red-700">{error}</p>}
      <button disabled={cargando} className={btn}>{cargando ? "Guardando…" : "Registrar residente"}</button>
    </form>
  );
}

   const MENSAJES: Record<string, { texto: string; clase: string }> = {
     pendiente: { texto: "Solicitud enviada. La organización la está revisando.", clase: "bg-[#FBEFD3] text-[#1E2B2A]" },
     aprobada: { texto: "¡Solicitud aprobada! La organización te contactará para coordinar la visita.", clase: "bg-[#2F6F6B] text-white" },
     rechazada: { texto: "Por ahora no fue posible esta conexión. Te invitamos a conocer a otros residentes.", clase: "bg-[#E3EEEC] text-[#1E2B2A]" },
     cancelada: { texto: "Cancelaste esta cita. La organización ya fue avisada. Si quieres, puedes reagendarla.", clase: "bg-[#E3EEEC] text-[#1E2B2A]" },
   };

   // Fecha de hoy + n días, en formato AAAA-MM-DD (hora local del navegador).
   function fechaLocal(sumarDias: number) {
     const d = new Date();
     d.setDate(d.getDate() + sumarDias);
     return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
   }

   // Calendario y hora para agendar o reagendar una visita.
   function SelectorCita({ titulo, cargando, error, onEnviar, onVolver }: {
  titulo: string; cargando: boolean; error: string;
  onEnviar: (fecha: string, hora: string) => void; onVolver: () => void;
}) {
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [aviso, setAviso] = useState("");
  const manana = fechaLocal(1);
  const horas = horasDeFecha(fecha); // las horas cambian según el día: entre semana, o fin de semana

  function cambiarFecha(v: string) {
    setHora("");
    // El calendario del navegador no puede bloquear fechas pasadas al escribir, así que se valida aquí.
    if (v && v < manana) { setAviso("Elige una fecha a partir de mañana."); setFecha(""); return; }
    setAviso(""); setFecha(v);
  }

  return (
    <div className="space-y-4 rounded-xl border-2 border-[#9DB8B5] bg-[#F5F8F7] p-4">
      <p className="font-bold">{titulo}</p>
      <p>{TEXTO_HORARIO}</p>
      <Campo label="Día de la visita">
        <input type="date" min={manana} value={fecha} onChange={(e) => cambiarFecha(e.target.value)} className={input} />
      </Campo>
      <Campo label="Hora de la visita">
        <select value={hora} disabled={!fecha} onChange={(e) => setHora(e.target.value)} className={input}>
          <option value="">{fecha ? "Elige una hora" : "Elige primero el día"}</option>
          {horas.map((h) => <option key={h} value={h}>{etiquetaHora(h)}</option>)}
        </select>
      </Campo>
      {(aviso || error) && <p role="alert" className="font-bold text-red-700">{aviso || error}</p>}
      <div className="flex flex-wrap gap-3">
        <button disabled={cargando || !fecha || !hora} className={btn} onClick={() => onEnviar(fecha, hora)}>
          {cargando ? "Enviando…" : "Enviar"}
        </button>
        <button disabled={cargando} className={btnLineal} onClick={onVolver}>Volver</button>
      </div>
    </div>
  );
}

   export function SolicitudButton({ residenteId, estado, visita, porOrg }: { residenteId: string; estado?: string; visita?: string; porOrg?: boolean }) {
  const [local, setLocal] = useState<{ estado: string; visita?: string }>();
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const actual = local?.estado ?? estado;
  const cita = local ? local.visita : visita;
  const mensaje = actual ? MENSAJES[actual] : undefined;
  // La casa de apoyo cambió la fecha: se avisa mientras el voluntario no haya hecho cambios propios.
  const cambioOrg = !!porOrg && !local && (actual === "pendiente" || actual === "aprobada");

  async function enviar(fecha: string, hora: string) {
    setCargando(true); setError("");
    try {
      await post("/api/solicitudes", { residenteId, fecha, hora });
      setLocal({ estado: "pendiente", visita: etiquetaVisita(fecha, hora) });
      setAbierto(false);
    } catch (e) { setError((e as Error).message); }
    finally { setCargando(false); }
  }

  async function cancelar() {
    setCargando(true); setError("");
    try {
      const r = await fetch("/api/solicitudes", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ residenteId }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "No se pudo cancelar. Intenta de nuevo.");
      setLocal({ estado: "cancelada", visita: cita });
    } catch (e) { setError((e as Error).message); }
    finally { setCargando(false); }
  }

  if (abierto) {
    return (
      <SelectorCita
        titulo={actual === "cancelada" ? "Elige la nueva fecha y hora de tu visita" : "¿Cuándo quieres visitar?"}
        cargando={cargando} error={error} onEnviar={enviar}
        onVolver={() => { setAbierto(false); setError(""); }}
      />
    );
  }

  if (mensaje) {
    return (
      <div className="space-y-3">
        {cambioOrg && (
          <p role="status" className="rounded-xl border-2 border-[#E4A93C] bg-[#FBEFD3] px-4 py-3 font-bold">
            La casa de apoyo cambió la fecha de tu visita. Si no puedes asistir, puedes cancelar la cita.
          </p>
        )}
        <p role="status" className={`rounded-xl px-4 py-3 font-bold ${mensaje.clase}`}>{mensaje.texto}</p>
        {cita && actual !== "cancelada" && <p className="font-bold">Visita: {cita}</p>}
        {(actual === "pendiente" || actual === "aprobada") && (
          <button disabled={cargando} className="rounded-xl border-2 border-red-700 px-5 py-3 font-bold text-red-700 disabled:opacity-50"
            onClick={() => confirm("¿Seguro que quieres cancelar? La organización recibirá el aviso.") && cancelar()}>
            {cargando ? "Cancelando…" : "Cancelar cita"}
          </button>
        )}
        {actual === "cancelada" && <button className={btn} onClick={() => setAbierto(true)}>Reagendar cita</button>}
        {error && <p role="alert" className="text-red-700">{error}</p>}
      </div>
    );
  }

  return <button className={btn} onClick={() => setAbierto(true)}>Quiero conocerle</button>;
}

   export function EliminarCuentaButton() {
     const router = useRouter();
     const [error, setError] = useState("");
     const [cargando, setCargando] = useState(false);

     async function eliminar() {
       if (!confirm("¿Eliminar tu cuenta? Se borrarán tus datos, tu historial y todas tus solicitudes. No se puede deshacer.")) return;
       setCargando(true); setError("");
       try {
         const r = await fetch("/api/cuenta", { method: "DELETE" });
         if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "No se pudo eliminar la cuenta.");
         router.push("/"); router.refresh();
       } catch (e) { setError((e as Error).message); setCargando(false); }
     }

     return (
       <div>
         <button disabled={cargando} onClick={eliminar} className="rounded-xl border-2 border-red-700 px-5 py-3 font-bold text-red-700 disabled:opacity-50">
           {cargando ? "Eliminando…" : "Eliminar cuenta"}
         </button>
         {error && <p role="alert" className="mt-2 text-red-700">{error}</p>}
       </div>
     );
   }

   export function BorrarResidenteButton({ apodo }: { apodo: string }) {
     return (
       <button
         className="rounded-lg border-2 border-red-700 px-4 py-2 font-bold text-red-700"
         onClick={(e) => {
           if (!confirm(`¿Borrar el perfil de ${apodo}? Se eliminarán todos sus datos y sus solicitudes. No se puede deshacer.`)) e.preventDefault();
         }}
       >Borrar perfil</button>
     );
   }
export function EliminarOrgButton() {
  return (
    <button
      className="rounded-xl border-2 border-red-700 px-5 py-3 font-bold text-red-700"
      onClick={(e) => {
        if (!confirm("¿Eliminar la cuenta de tu casa de apoyo? Se borrarán tus residentes, tus solicitudes y todos tus datos. No se puede deshacer.")) e.preventDefault();
      }}
    >Eliminar cuenta de la casa de apoyo</button>
  );
  
} 
// La casa de apoyo cambia la fecha de una visita vigente (se avisa al voluntario por correo).
export function ReagendarOrgButton({ solicitudId }: { solicitudId: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function enviar(fecha: string, hora: string) {
    setCargando(true); setError("");
    try {
      await post("/api/organizacion/reagendar", { solicitudId, fecha, hora });
      setAbierto(false);
      router.refresh();
    } catch (e) { setError((e as Error).message); }
    finally { setCargando(false); }
  }

  if (!abierto) return <button className={btnLineal} onClick={() => setAbierto(true)}>Reagendar visita</button>;
  return (
    <SelectorCita
      titulo="Elige la nueva fecha y hora. El voluntario recibirá un correo con el cambio."
      cargando={cargando} error={error} onEnviar={enviar}
      onVolver={() => { setAbierto(false); setError(""); }}
    />
  );
}