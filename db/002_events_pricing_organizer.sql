-- ===========================================
-- 002: Pricing + Organizer profile fields + Thumbnails
-- Safe ALTERs (no breaking changes)
-- ===========================================

-- 1) Events: pricing + thumbnail + place info (opcional)
alter table public.events
  add column if not exists is_free boolean not null default true;

alter table public.events
  add column if not exists price_amount numeric;

alter table public.events
  add column if not exists currency text not null default 'COP';

alter table public.events
  add column if not exists price_note text;

alter table public.events
  add column if not exists thumbnail_url text;

-- Opcional: mejoras de lugar (si quieres subir nivel sin dolor)
alter table public.events
  add column if not exists place_name text;

alter table public.events
  add column if not exists location_note text;

-- 2) Profiles: datos útiles para panel y EventDetail
alter table public.profiles
  add column if not exists full_name text;

alter table public.profiles
  add column if not exists avatar_url text;

alter table public.profiles
  add column if not exists is_verified boolean not null default false;

-- 3) Índices recomendados (búsqueda por precio / free)
create index if not exists idx_events_is_free on public.events (is_free);
create index if not exists idx_events_price_amount on public.events (price_amount);

-- ===========================================
-- END
-- ===========================================
