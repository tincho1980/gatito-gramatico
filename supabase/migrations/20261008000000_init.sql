-- Esquema inicial (arquitectura §5). Todo vive en `private`: los roles `anon` y
-- `authenticated` de Supabase no tienen ningún permiso, así que la clave pública no lee nada.
-- Solo el rol `gatita_worker` (el que usa el Worker vía Hyperdrive) lee y escribe.

create schema private;

create table private.accounts (          -- adulto: familia o docente
  id uuid primary key,                   -- = auth.users.id
  role text not null check (role in ('family', 'teacher')),
  display_name text,
  created_at timestamptz not null default now()
);

create table private.classrooms (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references private.accounts (id),
  name text not null,
  code text not null unique,             -- 6 letras, sin ambiguas (sin 0/O, 1/I)
  created_at timestamptz not null default now()
);

create table private.profiles (           -- un chico
  id uuid primary key,                   -- generado en el cliente
  owner_id uuid references private.accounts (id),
  classroom_id uuid references private.classrooms (id),
  alias text not null check (char_length(alias) between 2 and 20),
  avatar text not null,
  pin_hash text,                         -- solo si entra por aula
  created_at timestamptz not null default now(),
  check (owner_id is not null or classroom_id is not null)
);

create table private.rounds (
  id uuid primary key,                   -- generado en el cliente: idempotencia
  profile_id uuid not null references private.profiles (id) on delete cascade,
  world smallint not null,
  stop smallint not null,
  kind text not null check (kind in ('practice', 'boss', 'lesson')),
  started_at timestamptz not null,
  finished_at timestamptz not null,
  words_version text not null,
  tz_offset_min smallint not null,       -- para la racha en la hora del dispositivo
  received_at timestamptz not null default now()
);

create table private.turns (
  round_id uuid not null references private.rounds (id) on delete cascade,
  idx smallint not null,
  word_id text not null,
  steps jsonb not null,                  -- [{step, correct}]
  full_correct boolean not null,
  hinted boolean not null,
  challenge boolean not null,
  ms integer not null,
  primary key (round_id, idx)
);

create table private.purchases (         -- compras de la tienda (especificación §8.3)
  id uuid primary key,                   -- generado en el cliente: idempotencia
  profile_id uuid not null references private.profiles (id) on delete cascade,
  item_id text not null,
  at timestamptz not null,
  received_at timestamptz not null default now(),
  unique (profile_id, item_id)
);

create table private.profile_state (      -- derivado, recalculable con replay
  profile_id uuid primary key references private.profiles (id) on delete cascade,
  state jsonb not null,                  -- mismo shape que el estado local
  rounds_played integer not null,
  updated_at timestamptz not null default now()
);

create table private.teacher_unlocks (
  classroom_id uuid references private.classrooms (id) on delete cascade,
  world smallint not null,
  primary key (classroom_id, world)
);

create table private.join_attempts (      -- respaldo del rate limit
  ip_hash text not null,
  at timestamptz not null default now()
);

create index rounds_profile_finished on private.rounds (profile_id, finished_at);
create index turns_word on private.turns (word_id);
create index profiles_classroom on private.profiles (classroom_id);
create index profiles_owner on private.profiles (owner_id);
create index join_attempts_ip_at on private.join_attempts (ip_hash, at);

-- RLS en todas, sin políticas: segunda línea por si alguien da permisos por error.
alter table private.accounts enable row level security;
alter table private.classrooms enable row level security;
alter table private.profiles enable row level security;
alter table private.rounds enable row level security;
alter table private.turns enable row level security;
alter table private.purchases enable row level security;
alter table private.profile_state enable row level security;
alter table private.teacher_unlocks enable row level security;
alter table private.join_attempts enable row level security;

revoke all on schema private from public, anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;
alter default privileges in schema private revoke all on tables from public, anon, authenticated;

-- Rol del Worker. Se crea sin contraseña: `npm run setup:db -w api` le genera una y la carga
-- solo en Hyperdrive (ver docs/puesta-en-marcha.md). Nunca va al repo.
do $$
begin
  if not exists (select from pg_roles where rolname = 'gatita_worker') then
    create role gatita_worker nologin;
  end if;
end
$$;
grant usage on schema private to gatita_worker;
grant select, insert, update, delete on all tables in schema private to gatita_worker;
alter default privileges in schema private
  grant select, insert, update, delete on tables to gatita_worker;
-- Con RLS activo, el Worker necesita una política propia en cada tabla (anon y authenticated
-- siguen sin ninguna).
do $$
declare t text;
begin
  foreach t in array array['accounts', 'classrooms', 'profiles', 'rounds', 'turns', 'purchases',
                           'profile_state', 'teacher_unlocks', 'join_attempts']
  loop
    execute format(
      'create policy worker_all on private.%I for all to gatita_worker using (true) with check (true)',
      t
    );
  end loop;
end
$$;
