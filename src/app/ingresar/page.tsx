import Link from "next/link";
import { LoginForm } from "@/components/forms";

export default function Ingresar() {
  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="mb-2 text-4xl font-bold text-[#2F6F6B]">Inicia sesión</h1>
      <p className="mb-8">Entra para ver tus solicitudes y a los abuelos con quienes compartes gustos.</p>
      <LoginForm />
      <p className="mt-8">¿Aún no tienes cuenta? <Link href="/registro" className="font-bold text-[#2F6F6B] underline">Regístrate</Link></p>
    </main>
  );
}