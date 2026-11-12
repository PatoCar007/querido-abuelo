import Link from "next/link";
import { Decoracion } from "@/components/Decoracion";

export default function Landing() {
  return (
    <div className="relative isolate overflow-hidden">
      <Decoracion ranura="portada-fondo" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-60" />
      <main className="mx-auto flex max-w-5xl flex-col items-center gap-10 px-6 py-16 md:flex-row md:justify-center">
        <div className="aparece max-w-3xl flex-1">
          <h1 className="text-5xl font-bold leading-tight text-[#2F6F6B]">
            Una visita a la semana puede cambiarle el ánimo a alguien.
          </h1>
          <p className="mt-6 max-w-xl">
            Querido Abuelo une a voluntarios con adultos mayores de casas de apoyo para crear un vínculo que dure:
            conversar, cantar, leer o pintar juntos.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/registro" className="rounded-xl bg-[#2F6F6B] px-6 py-4 font-bold text-white">Quiero acompañar a un abuelo</Link>
            <Link href="/organizacion" className="rounded-xl border-2 border-[#2F6F6B] px-6 py-4 font-bold text-[#2F6F6B]">Soy una casa de apoyo</Link>
            <Link href="/ingresar" className="rounded-xl px-6 py-4 font-bold text-[#2F6F6B] underline">Ya tengo cuenta</Link>
          </div>
        </div>
        <Decoracion ranura="portada-principal" className="w-full max-w-md md:w-5/12" />
      </main>
    </div>
  );
}