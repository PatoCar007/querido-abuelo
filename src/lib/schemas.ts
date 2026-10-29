import { z } from "zod";
import { DIDACTICAS, MAYORIA_DE_EDAD, TODAS } from "./actividades";

// "música, lectura" -> ["música", "lectura"]
const lista = z.preprocess(
  (v) => (typeof v === "string" ? v.split(",").map((s) => s.trim()).filter(Boolean) : v),
  z.array(z.string().min(1)).min(1, "Agrega al menos un interés")
);

// El formulario manda una lista; se guarda como texto: "Platicar, Juegos de mesa".
const actividades = z.preprocess(
  (v) => (Array.isArray(v) ? v.join(", ") : v),
  z.string().min(1, "Elige al menos una actividad")
);

export const VoluntarioSchema = z
  .object({
    nombre_completo: z.string().min(3, "Escribe tu nombre completo"),
    edad: z.number().int().min(12, "La edad mínima para participar es de 12 años").max(110, "Revisa tu edad"),
    ocupacion: z.string().min(2, "Cuéntanos a qué te dedicas"),
    intereses: lista,
    experiencia_previa: z.boolean(),
    actividad_deseada: actividades,
    motivo: z.string().min(10, "Cuéntanos con un poco más de detalle por qué quieres visitar"),
    descripcion: z.string().min(10, "Escribe una breve descripción de ti"),
    
  })
  .refine((v) => v.actividad_deseada.split(", ").every((a) => TODAS.includes(a)), {
    message: "Actividad no válida", path: ["actividad_deseada"],
  })
  // Regla de protección: los menores solo pueden elegir actividades didácticas.
  .refine((v) => v.edad >= MAYORIA_DE_EDAD || v.actividad_deseada.split(", ").every((a) => DIDACTICAS.includes(a)), {
    message: "Las personas menores de edad solo pueden elegir actividades didácticas.", path: ["actividad_deseada"],
  });

export const ContactoSchema = z.string().min(5, "Escribe un teléfono o WhatsApp de contacto");

export const RegistroSchema = z.object({
  email: z.string().trim().toLowerCase().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Escribe un correo válido"),
  clave: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(100),
  contacto: ContactoSchema,
  voluntario: VoluntarioSchema,
});

// Privacidad estricta: nada más que estos tres campos.
export const ResidenteSchema = z.object({
  apodo: z.string().min(2),
  edad: z.number().int().min(1),
  intereses: lista,
});

export type Voluntario = z.infer<typeof VoluntarioSchema> & { id: string };
export type Residente = z.infer<typeof ResidenteSchema> & { id: string };