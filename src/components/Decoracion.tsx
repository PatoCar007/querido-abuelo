"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { EXTENSIONES, type Ranura } from "@/lib/diseno";

// Muestra el diseño de una ranura. Si no hay ningún archivo con ese nombre, no muestra nada.
export function Decoracion({ ranura, className = "" }: { ranura: Ranura; className?: string }) {
  const [montado, setMontado] = useState(false);
  const [intento, setIntento] = useState(0);

  // Se dibuja solo en el navegador, para detectar bien cuando un archivo no existe.
  useEffect(() => {
    const id = requestAnimationFrame(() => setMontado(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!montado || intento >= EXTENSIONES.length) return null;
  return (
    <img
      src={`/diseno/${ranura}.${EXTENSIONES[intento]}`}
      alt="" aria-hidden="true" decoding="async"
      onError={() => setIntento((i) => i + 1)}
      className={`aparece ${className}`}
    />
  );
}