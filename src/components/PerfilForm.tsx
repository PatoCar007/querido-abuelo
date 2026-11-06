"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DE_CUIDADO, DIDACTICAS } from "@/lib/actividades";

const input = "mt-1 w-full rounded-lg border-2 border-[#9DB8B5] bg-white px-4 py-3";
const btn = "rounded-xl bg-[#2F6F6B] px-6 py-4 font-bold text-white disabled:opacity-50";

function Campo({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-bold">{label}</span>
      {hint && <span className="block text-base text-[#4A5E5C]">{hint}</span>}
      {children}
    </label>
  );
}

export type PerfilInicial = {
  email: string; nombre: string; edad: number; ocupacion: string; intereses: string; experiencia: boolean;
  actividades: string[]; otras: string; motivo: string; descripcion: string; contacto: string;
  tutor: { nombre: string; edad: number | null; correo: string } | null;
};

export function PerfilForm({ inicial }: { inicial: PerfilInicial }) {
  const router = useRouter();
  const [email, setEmail] = useState(inicial.email);
  const [edad, setEdad] = useState(inicial.edad);
  const [elegidas, setElegidas] = useState<string[]>(inicial.actividades);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const menor = edad > 0 && edad < 18;
  const cambiaCorreo = email.trim().toLowerCase() !== inicial.email.toLowerCase();

  // «Información Guardada!» se quita sola a los 4 segundos.
  useEffect(() => {
    if (!guardado) return;
    const t = setTimeout(() => setGuardado(false), 4000);
    return () => clearTimeout(t);
  }, [guardado]);

  const cambiarEdad = (n: number) => {
    setEdad(n);
    // Si pasa a ser menor, se quitan las actividades de cuidado que tuviera marcadas.
    if (n > 0 && n < 18) setElegidas((prev) => prev.filter((a) => !DE_CUIDADO.includes(a)));
  };
  const alternar = (a: string) =>
    setElegidas((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError(""); setGuardado(false);
    const otras = String(f.get("otras") ?? "").trim();
    if (elegidas.length === 0 && otras.length < 3) { setError("Elige al menos una actividad o escribe otra."); return; }
    setCargando(true);
    try {
      const r = await fetch("/api/perfil", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: f.get("email"), claveActual: f.get("clave_actual") || undefined, contacto: f.get("contacto"),
          tutor: menor ? { nombre: f.get("tutor_nombre"), edad: Number(f.get("tutor_edad")), correo: f.get("tutor_correo") } : undefined,
          voluntario: {
            nombre_completo: f.get("nombre"), edad, ocupacion: f.get("ocupacion"), intereses: f.get("intereses"),
            experiencia_previa: f.get("experiencia") === "si", actividad_deseada: elegidas, otras_actividades: otras,
            motivo: f.get("motivo"), descripcion: f.get("descripcion"),
          },
        }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "No se pudo guardar. Intenta de nuevo.");
      setGuardado(true);
      router.refresh();
    } catch (err) { setError((err as Error).message); }
    finally { setCargando(false); }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <h2 className="text-2xl font-bold">Tu cuenta</h2>
      <Campo label="Correo electrónico" hint="Es el correo con el que inicias sesión.">
        <input name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
      </Campo>
      {cambiaCorreo && (
        <Campo label="Contraseña actual" hint="La necesitamos para confirmar que eres tú antes de cambiar tu correo.">
          <input name="clave_actual" type="password" required autoComplete="current-password" className={input} />
        </Campo>
      )}

      <h2 className="pt-4 text-2xl font-bold">Sobre ti</h2>
      <Campo label="Nombre completo"><input name="nombre" required defaultValue={inicial.nombre} className={input} /></Campo>
      <Campo label="Edad">
        <input name="edad" type="number" min={12} max={110} required defaultValue={inicial.edad}
          onChange={(e) => cambiarEdad(Number(e.target.value))} className={input} />
      </Campo>
      {menor && (
        <>
          <div role="alert" className="rounded-xl border-2 border-[#E4A93C] bg-[#FBEFD3] p-4 font-bold">
            Eres menor de edad. Para visitar a un adulto mayor debes ir acompañado/a de una persona adulta y contar con su
            consentimiento. Además, solo puedes elegir actividades didácticas.
          </div>
          <fieldset className="space-y-4 rounded-xl border-2 border-[#E4A93C] p-4">
            <legend className="px-2 font-bold">Adulto responsable</legend>
            <Campo label="Nombre completo del adulto responsable">
              <input name="tutor_nombre" required defaultValue={inicial.tutor?.nombre ?? ""} className={input} />
            </Campo>
            <Campo label="Edad del adulto responsable">
              <input name="tutor_edad" type="number" min={18} max={110} required defaultValue={inicial.tutor?.edad ?? ""} className={input} />
            </Campo>
            <Campo label="Correo del adulto responsable" hint="También recibe los avisos de tus visitas.">
              <input name="tutor_correo" type="email" required defaultValue={inicial.tutor?.correo ?? ""} className={input} />
            </Campo>
          </fieldset>
        </>
      )}
      <Campo label="¿A qué te dedicas?"><input name="ocupacion" required defaultValue={inicial.ocupacion} className={input} /></Campo>
      <Campo label="Tus intereses" hint="Sepáralos con comas: música, lectura, arte">
        <input name="intereses" required defaultValue={inicial.intereses} className={input} />
      </Campo>
      <Campo label="Cuéntanos un poco sobre ti">
        <textarea name="descripcion" required rows={3} defaultValue={inicial.descripcion} className={input} />
      </Campo>
      <fieldset>
        <legend className="font-bold">¿Has convivido antes con adultos mayores?</legend>
        <label className="mr-6"><input type="radio" name="experiencia" value="si" defaultChecked={inicial.experiencia} /> Sí</label>
        <label><input type="radio" name="experiencia" value="no" defaultChecked={!inicial.experiencia} /> No</label>
      </fieldset>

      <h2 className="pt-4 text-2xl font-bold">Tus visitas</h2>
      <Campo label="¿Por qué quieres visitar a un adulto mayor?">
        <textarea name="motivo" required rows={3} defaultValue={inicial.motivo} className={input} />
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
        <Campo label="Otras actividades:">
          <textarea name="otras" rows={2} maxLength={300} defaultValue={inicial.otras} className={input} />
        </Campo>
      </fieldset>

      <Campo label={menor ? "Teléfono del adulto responsable" : "Teléfono o WhatsApp de contacto"} hint="Solo lo ve la organización.">
        <input name="contacto" required defaultValue={inicial.contacto} className={input} />
      </Campo>

      {error && <p role="alert" className="font-bold text-red-700">{error}</p>}
      <div className="flex flex-wrap items-center gap-4">
        <button disabled={cargando} className={btn}>{cargando ? "Guardando…" : "Guardar cambios"}</button>
        {guardado && <p role="status" className="font-bold text-[#2F6F6B]">Información Guardada!</p>}
        <Link href="/voluntario" className="font-bold text-[#2F6F6B] underline">Volver a mi panel</Link>
      </div>
    </form>
  );
}