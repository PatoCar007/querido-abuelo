import { z } from "zod";
import { DIDACTICAS, MAYORIA_DE_EDAD, TODAS } from "./actividades";

// "música, lectura" -> ["música", "lectura"]
const lista = z.preprocess(
  (v) => (typeof v === "string" ? v.split(",").map((s) => s.trim()).filter(Boolean) : v),
  z.array(z.string().min(1)).min(1, "Agrega al menos un interés")
);

// El formulario manda una lista; se guarda como texto: "Platicar, Juegos de mesa".
const actividades = z.preprocess((v) => (Array.isArray(v) ? v.join(", ") : v), z.string());

const correo = z.string().trim().toLowerCase().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Escribe un correo válido");

// Adulto responsable de una persona menor de edad
export const TutorSchema = z.object({
  nombre: z.string().trim().min(3, "Escribe el nombre completo del adulto responsable"),
  edad: z.number().int().min(18, "El adulto responsable debe tener al menos 18 años").max(110, "Revisa la edad del adulto responsable"),
  correo,
});

export const VoluntarioSchema = z
  .object({
    nombre_completo: z.string().min(3, "Escribe tu nombre completo"),
    edad: z.number().int().min(12, "La edad mínima para participar es de 12 años").max(110, "Revisa tu edad"),
    ocupacion: z.string().min(2, "Cuéntanos a qué te dedicas"),
    intereses: lista,
    experiencia_previa: z.boolean(),
    actividad_deseada: actividades,
    otras_actividades: z.string().trim().max(300, "Resume tus otras actividades en 300 caracteres").optional(),
    motivo: z.string().min(10, "Cuéntanos con un poco más de detalle por qué quieres visitar"),
    descripcion: z.string().min(10, "Escribe una breve descripción de ti"),
  })
  .refine((v) => v.actividad_deseada !== "" || (v.otras_actividades ?? "").length >= 3, {
    message: "Elige al menos una actividad o escribe otra", path: ["actividad_deseada"],
  })
  .refine((v) => v.actividad_deseada === "" || v.actividad_deseada.split(", ").every((a) => TODAS.includes(a)), {
    message: "Actividad no válida", path: ["actividad_deseada"],
  })
  // Regla de protección: los menores solo pueden elegir actividades didácticas de la lista.
  .refine((v) => v.edad >= MAYORIA_DE_EDAD || v.actividad_deseada === "" || v.actividad_deseada.split(", ").every((a) => DIDACTICAS.includes(a)), {
    message: "Las personas menores de edad solo pueden elegir actividades didácticas.", path: ["actividad_deseada"],
  });

export const ContactoSchema = z.string().min(5, "Escribe un teléfono de contacto");

export const RegistroSchema = z
  .object({
    email: correo,
    clave: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(100),
    contacto: ContactoSchema, // si es menor de edad, es el teléfono del adulto responsable
    voluntario: VoluntarioSchema,
    tutor: TutorSchema.optional(),
  })
  .refine((d) => d.voluntario.edad >= MAYORIA_DE_EDAD || !!d.tutor, {
    message: "Las personas menores de edad deben indicar los datos de un adulto responsable.", path: ["tutor"],
  });

// Privacidad estricta: nada más que estos tres campos.
export const ResidenteSchema = z.object({
  apodo: z.string().min(2),
  edad: z.number().int().min(1),
  intereses: lista,
});

export type Voluntario = z.infer<typeof VoluntarioSchema> & { id: string };
export type Residente = z.infer<typeof ResidenteSchema> & { id: string };