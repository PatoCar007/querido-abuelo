import Link from "next/link";

export default function Landing() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
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
    </main>
  );
}
