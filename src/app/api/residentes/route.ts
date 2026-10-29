import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orgActual } from "@/lib/orgSesion";
import { avisarAltaResidente } from "@/lib/notifications";
import { ResidenteSchema } from "@/lib/schemas";

// Cada abuelito queda ligado a la organización que tiene la sesión iniciada.
export async function POST(req: Request) {
  const org = await orgActual();
  if (!org) return NextResponse.json({ error: "Inicia sesión como organización." }, { status: 401 });
  const datos = ResidenteSchema.safeParse(await req.json());
  if (!datos.success) return NextResponse.json({ error: "Revisa apodo, edad e intereses." }, { status: 400 });
  const { error } = await db.from("residentes").insert({ ...datos.data, organizacion_id: org.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await avisarAltaResidente(org, datos.data);
  return NextResponse.json({ ok: true });
}