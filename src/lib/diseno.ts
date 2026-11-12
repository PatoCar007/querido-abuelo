// Nombres de las ranuras de diseño. Cada una corresponde a un archivo en public/diseno/<nombre>.<extensión>.
export type Ranura =
  | "portada-principal" | "portada-fondo"
  | "registro-cabecera" | "registro-lateral"
  | "panel-cabecera" | "panel-vacio"
  | "cita-selector" | "cita-enviada" | "cita-aprobada";

// Extensiones que se prueban, en este orden.
export const EXTENSIONES = ["png", "jpg", "webp", "svg", "gif"];