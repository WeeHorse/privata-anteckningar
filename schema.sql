create table public.notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

alter table public.notes enable row level security;

-- Börja med uttryckliga tabellrättigheter.
revoke all on public.notes from anon, authenticated;
grant select, insert, delete on public.notes to authenticated;

create policy "read own notes"
on public.notes for select to authenticated
using ((select auth.uid()) = owner_id);

create policy "create own notes"
on public.notes for insert to authenticated
with check ((select auth.uid()) = owner_id);

create policy "delete own notes with MFA"
on public.notes for delete to authenticated
using (
  (select auth.uid()) = owner_id
  and (select auth.jwt()->>'aal') = 'aal2'
);
