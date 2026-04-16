create or replace function update_personal_record()
returns trigger language plpgsql as $$
declare
  v_exercise_id uuid;
  v_one_rep_max numeric;
begin
  select e.exercise_id into v_exercise_id
  from public.session_exercises e where e.id = NEW.session_exercise_id;

  v_one_rep_max := NEW.weight_kg * (1 + NEW.reps::numeric / 30);

  insert into public.personal_records (user_id, exercise_id, weight_kg, reps, one_rep_max, achieved_at)
  values (NEW.user_id, v_exercise_id, NEW.weight_kg, NEW.reps, v_one_rep_max, NEW.logged_at)
  on conflict (user_id, exercise_id) do update
    set weight_kg = excluded.weight_kg,
        reps = excluded.reps,
        one_rep_max = excluded.one_rep_max,
        achieved_at = excluded.achieved_at
  where excluded.one_rep_max > personal_records.one_rep_max;

  if found then NEW.is_pr := true; end if;
  return NEW;
end;
$$;

create trigger trg_update_pr
before insert on public.set_logs
for each row execute function update_personal_record();
