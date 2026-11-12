import Link from "next/link";
import { Decoracion } from "@/components/Decoracion";
import { VolunteerForm } from "@/components/forms";

export default function Registro() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Decoracion ranura="registro-cabecera" className="mb-8 h-40 w-full rounded-2xl object-cover sm:h-52" />
      <div className="lg:flex lg:justify-center">
        <div className="mx-auto w-full max-w-xl lg:mx-0 lg:shrink-0">
          <h1 className="mb-2 text-4xl font-bold text-[#2F6F6B]">Crea tu cuenta de voluntario</h1>
          <p className="mb-2">Llenas este formulario una sola vez. Después solo inicias sesión para ver a los abuelos con quienes compartes gustos.</p>
          <p className="mb-8">¿Ya tienes cuenta? <Link href="/ingresar" className="font-bold text-[#2F6F6B] underline">Inicia sesión</Link></p>
          <VolunteerForm />
        </div>
        <Decoracion ranura="registro-lateral" className="hidden rounded-2xl lg:sticky lg:top-8 lg:ml-10 lg:block lg:w-80 lg:self-start" />
      </div>
    </main>
  );
}