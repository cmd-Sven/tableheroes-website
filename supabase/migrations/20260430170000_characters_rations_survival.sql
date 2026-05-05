-- Survival: Rationen und Hunger-Tage (Charakter)
alter table public.characters
  add column if not exists rations_count integer not null default 0;

alter table public.characters
  add column if not exists starvation_days integer not null default 0;

comment on column public.characters.rations_count is 'Vorrat an Rationen (0–10).';
comment on column public.characters.starvation_days is 'Aufeinanderfolgende Tage ohne Ration.';
