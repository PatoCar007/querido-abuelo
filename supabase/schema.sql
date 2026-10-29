-- Ejecuta en Supabase > SQL Editor
create extension if not exists "pgcrypto";

-- Modelo del Voluntario: exactamente los 6 campos pedidos (+ id/fecha técnicos)
create table voluntarios (
  id uuid primary key default gen_random_uuid(),
  nombre_completo text not null,
  edad int not null check (edad >= 18),
  ocupacion text not null,
  intereses text[] not null,
  experiencia_previa boolean not null,
  actividad_deseada text not null,
  created_at timestamptz default now()
);

-- Modelo del Adulto Mayor: PRIVACIDAD ESTRICTA. Solo apodo, edad e intereses.
create table residentes (
  id uuid primary key default gen_random_uuid(),
  apodo text not null,
  edad int not null check (edad > 0),
  intereses text[] not null,
  created_at timestamptz default now()
);

-- Contacto del voluntario, separado del modelo para que la organización pueda responderle.
create table contactos_voluntarios (
  voluntario_id uuid primary key references voluntarios(id) on delete cascade,
  contacto text not null
);

-- Solicitud de un voluntario para conocer a un residente (gestionada por la organización)
create table solicitudes (
  id uuid primary key default gen_random_uuid(),
  voluntario_id uuid not null references voluntarios(id) on delete cascade,
  residente_id uuid not null references residentes(id) on delete cascade,
  estado text not null default 'pendiente' check (estado in ('pendiente','aprobada','rechazada')),
  created_at timestamptz default now(),
  unique (voluntario_id, residente_id)
);

-- RLS activo SIN políticas públicas: solo el backend (service role) lee y escribe.
alter table voluntarios enable row level security;
alter table residentes enable row level security;
alter table contactos_voluntarios enable row level security;
alter table solicitudes enable row level security;
