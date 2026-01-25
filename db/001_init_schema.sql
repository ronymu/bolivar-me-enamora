-- ===========================================
-- Bolívar Me Enamora — Base Backend (Supabase)
-- Tablas + Enums + Índices + RLS + Policies
-- ===========================================

-- 0) Extensiones útiles
create extension if not exists "pgcrypto";

-- 1) Enums (listas de valores válidos)
do $$ begin
  create type public.app_role as enum ('citizen', 'organizer', 'admin');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.event_status as enum (
    'draft',       -- el gestor lo está construyendo
    'submitted',   -- enviado a revisión
    'approved',    -- aprobado por admin (opcional)
    'rejected',    -- rechazado por admin
    'published',   -- visible en la app
    'archived'     -- oculto / histórico
  );
exception
  when duplicate_object then null;
end $$;

-- 2) Helper: updated_at automático
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 3) PROFILES (perfil + rol)
-- auth.users ya existe (Supabase Auth). profiles extiende esa info.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'citizen',
  display_name text,
  organization_name text,
  phone text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- 4) EVENTS (eventos)
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),

  organizer_id uuid not null references auth.users(id) on delete restrict,

  -- contenido
  title text not null,
  description text not null,          -- corto
  full_description text,              -- largo

  -- fecha/hora
  start_at timestamptz,
  end_at timestamptz,

  -- ubicación
  city text,
  address text,
  lat double precision,
  lng double precision,

  -- categoría / chips
  category text,

  -- media
  cover_image_url text,
  image_urls text[] not null default '{}'::text[],

  -- tickets (por ahora link externo)
  ticket_url text,

  -- workflow
  status public.event_status not null default 'draft',

  -- revisión (admin)
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_events_updated_at on public.events;
create trigger trg_events_updated_at
before update on public.events
for each row execute function public.set_updated_at();

-- 5) FAVORITES (para sincronizar luego si quieres)
create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

-- 6) Índices (performance)
create index if not exists idx_events_status_start on public.events (status, start_at);
create index if not exists idx_events_city on public.events (city);
create index if not exists idx_events_organizer on public.events (organizer_id);
create index if not exists idx_favorites_user on public.favorites (user_id);
create index if not exists idx_favorites_event on public.favorites (event_id);

-- ===========================================
-- 7) RLS (Row Level Security) + Policies
-- ===========================================

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.favorites enable row level security;

-- ---------
-- PROFILES
-- ---------
-- Leer tu propio perfil
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

-- Insertar tu propio perfil (cuando te registras)
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

-- Actualizar tu propio perfil
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Admin puede leer todo (útil para panel)
drop policy if exists "profiles_select_admin_all" on public.profiles;
create policy "profiles_select_admin_all"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

-- Admin puede actualizar roles (útil para promover organizer/admin)
drop policy if exists "profiles_update_admin_all" on public.profiles;
create policy "profiles_update_admin_all"
on public.profiles
for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

-- ------
-- EVENTS
-- ------
-- 1) Cualquiera puede ver eventos publicados (app pública)
drop policy if exists "events_select_published_public" on public.events;
create policy "events_select_published_public"
on public.events
for select
to anon, authenticated
using (status = 'published');

-- 2) Organizer puede ver SUS eventos (cualquier status)
drop policy if exists "events_select_own" on public.events;
create policy "events_select_own"
on public.events
for select
to authenticated
using (organizer_id = auth.uid());

-- 3) Organizer puede crear eventos (siempre con organizer_id = él)
drop policy if exists "events_insert_own" on public.events;
create policy "events_insert_own"
on public.events
for insert
to authenticated
with check (organizer_id = auth.uid());

-- 4) Organizer puede editar SUS eventos mientras NO estén publicados
-- (si quieres permitir editar published, lo cambiamos luego)
drop policy if exists "events_update_own_not_published" on public.events;
create policy "events_update_own_not_published"
on public.events
for update
to authenticated
using (organizer_id = auth.uid() and status <> 'published')
with check (organizer_id = auth.uid());

-- 5) Admin puede ver todo
drop policy if exists "events_select_admin_all" on public.events;
create policy "events_select_admin_all"
on public.events
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

-- 6) Admin puede actualizar eventos (aprobar/rechazar/publicar)
drop policy if exists "events_update_admin_all" on public.events;
create policy "events_update_admin_all"
on public.events
for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

-- ---------
-- FAVORITES
-- ---------
-- Usuario ve sus favoritos
drop policy if exists "favorites_select_own" on public.favorites;
create policy "favorites_select_own"
on public.favorites
for select
to authenticated
using (user_id = auth.uid());

-- Usuario crea favorito propio
drop policy if exists "favorites_insert_own" on public.favorites;
create policy "favorites_insert_own"
on public.favorites
for insert
to authenticated
with check (user_id = auth.uid());

-- Usuario elimina favorito propio
drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_delete_own"
on public.favorites
for delete
to authenticated
using (user_id = auth.uid());

-- ===========================================
-- FIN
-- ===========================================
