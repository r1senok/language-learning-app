begin;

create table public.lesson_results (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id text not null check (lesson_id ~ '^[a-z0-9-]{1,80}$'),
  exercise_id text not null check (exercise_id = '@completed' or exercise_id ~ '^[a-z0-9-]{1,80}$'),
  score smallint not null check (score between 0 and 100 and (exercise_id = '@completed' or score <= 1)),
  primary key (user_id, lesson_id, exercise_id)
);

alter table public.lesson_results enable row level security;
revoke all on public.lesson_results from public, anon, authenticated;
grant select on public.lesson_results to authenticated;
create policy own_lesson_results on public.lesson_results for select to authenticated
  using ((select auth.uid()) = user_id);

-- The account parameter also guards queued requests against an account switch.
create function public.save_lesson_result(account uuid, lesson text, exercise text, result smallint)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or auth.uid() is distinct from account then
    raise exception 'Lesson result belongs to a different account' using errcode = '42501';
  end if;
  insert into public.lesson_results (user_id, lesson_id, exercise_id, score)
  values (account, lesson, exercise, result)
  on conflict (user_id, lesson_id, exercise_id) do update
    set score = greatest(lesson_results.score, excluded.score);
end;
$$;

revoke all on function public.save_lesson_result(uuid, text, text, smallint) from public, anon, authenticated;
grant execute on function public.save_lesson_result(uuid, text, text, smallint) to authenticated;

commit;
