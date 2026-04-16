-- Users profile (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text,
  fitness_goal text check (fitness_goal in ('strength','hypertrophy','endurance','weight_loss')),
  experience_level text check (experience_level in ('beginner','intermediate','advanced')),
  weight_unit text default 'kg' check (weight_unit in ('kg','lbs')),
  default_rest_seconds int default 90,
  created_at timestamptz default now()
);

-- Exercise library (seeded, not user-editable)
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  primary_muscle text not null,
  secondary_muscles text[],
  equipment text check (equipment in ('barbell','dumbbell','machine','bodyweight','cable','other')),
  description text,
  created_at timestamptz default now()
);

-- Workout sessions
create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  workout_type text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds int,
  total_volume_kg numeric,
  notes text,
  mood int check (mood between 1 and 5),
  created_at timestamptz default now()
);

-- Exercises within a session
create table public.session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.workout_sessions(id) on delete cascade not null,
  exercise_id uuid references public.exercises(id) not null,
  exercise_name text not null,
  position int not null,
  created_at timestamptz default now()
);

-- Individual sets logged
create table public.set_logs (
  id uuid primary key default gen_random_uuid(),
  session_exercise_id uuid references public.session_exercises(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  set_number int not null,
  weight_kg numeric not null default 0,
  reps int not null,
  duration_seconds int,
  rpe int check (rpe between 1 and 10),
  is_pr boolean default false,
  logged_at timestamptz default now()
);

-- Personal records (maintained via trigger)
create table public.personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  exercise_id uuid references public.exercises(id) not null,
  weight_kg numeric not null,
  reps int not null,
  one_rep_max numeric,
  achieved_at timestamptz not null,
  unique(user_id, exercise_id)
);
