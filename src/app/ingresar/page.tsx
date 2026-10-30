import Link from "next/link";
import { LoginForm } from "@/components/forms";

export default async function Ingresar({ searchParams }: { searchParams: Promise<{ listo?: string }> }) {
  const { listo } = await searchParams;
  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="mb-2 text-4xl font-bold text-[#2F6F6B]">Inicia sesión</h1>
      <p className="mb-8">Entra para ver tus solicitudes y a los abuelos con quienes compartes gustos.</p>
      {listo && (
        <p role="status" className="mb-6 rounded-xl bg-[#2F6F6B] px-4 py-3 font-bold text-white">
          Contraseña actualizada. Ya puedes iniciar sesión.
        </p>
      )}
      <LoginForm />
      <p className="mt-6"><Link href="/recuperar" className="font-bold text-[#2F6F6B] underline">¿Olvidaste tu contraseña?</Link></p>
      <p className="mt-4">¿Aún no tienes cuenta? <Link href="/registro" className="font-bold text-[#2F6F6B] underline">Regístrate</Link></p>
    </main>
  );
}