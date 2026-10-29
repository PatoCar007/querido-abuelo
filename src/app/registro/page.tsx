import Link from "next/link";
import { VolunteerForm } from "@/components/forms";

export default function Registro() {
  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="mb-2 text-4xl font-bold text-[#2F6F6B]">Crea tu cuenta de voluntario</h1>
      <p className="mb-2">Llenas este formulario una sola vez. Después solo inicias sesión para ver a los abuelos con quienes compartes gustos.</p>
      <p className="mb-8">¿Ya tienes cuenta? <Link href="/ingresar" className="font-bold text-[#2F6F6B] underline">Inicia sesión</Link></p>
      <VolunteerForm />
    </main>
  );
}