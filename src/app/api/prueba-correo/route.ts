import { NextResponse } from "next/server";
import { orgActual } from "@/lib/orgSesion";
import { correo } from "@/lib/notifications";

// Con la sesión de la cuenta original iniciada, abre: /api/prueba-correo?para=tu@correo.com
export async function GET(req: Request) {
  const org = await orgActual();
  if (!org?.principal) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const para = new URL(req.url).searchParams.get("para") ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(para)) {
    return NextResponse.json({ error: "Agrega ?para=correo@ejemplo.com a la dirección" }, { status: 400 });
  }
  const config = { RESEND_API_KEY: !!process.env.RESEND_API_KEY, EMAIL_FROM: process.env.EMAIL_FROM ?? null, ORG_EMAIL: process.env.ORG_EMAIL ?? null };
  if (!config.RESEND_API_KEY) {
    return NextResponse.json({ ok: false, config, problema: "Falta RESEND_API_KEY en las variables de entorno." });
  }
  try {
    await correo(para, { asunto: "Prueba de correo de Querido Abuelo", titulo: "¡Funciona!", intro: "Si lees esto, el envío de correos está bien configurado." });
    return NextResponse.json({ ok: true, config });
  } catch (e) {
    return NextResponse.json({ ok: false, config, problema: String(e) });
  }
}