-- Profiles: users can only read/write their own
alter table public.profiles enable row level security;
create policy "own profile" on public.profiles using (auth.uid() = id);

-- Sessions: own data only
alter table public.workout_sessions enable row level security;
create policy "own sessions" on public.workout_sessions using (auth.uid() = user_id);

-- Session exercises: via session ownership
alter table public.session_exercises enable row level security;
create policy "own session_exercises" on public.session_exercises
  using (session_id in (select id from public.workout_sessions where user_id = auth.uid()));

-- Set logs: own data only
alter table public.set_logs enable row level security;
create policy "own set_logs" on public.set_logs using (auth.uid() = user_id);

-- Personal records: own data only
alter table public.personal_records enable row level security;
create policy "own prs" on public.personal_records using (auth.uid() = user_id);

-- Exercises: public read, no user writes
alter table public.exercises enable row level security;
create policy "public read exercises" on public.exercises for select using (true);
