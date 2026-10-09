-- Revisión del banco de palabras por docentes (plan, etapa 9): cada adulto marca las palabras
-- que hay que revisar, con una nota. Una marca por adulto y palabra.
create table private.word_reviews (
  account_id uuid not null references private.accounts (id) on delete cascade,
  word_id text not null,
  words_version text not null,
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  primary key (account_id, word_id)
);

create index word_reviews_word on private.word_reviews (word_id);

alter table private.word_reviews enable row level security;
revoke all on private.word_reviews from public, anon, authenticated;
grant select, insert, update, delete on private.word_reviews to gatita_worker;
create policy worker_all on private.word_reviews for all to gatita_worker using (true) with check (true);
