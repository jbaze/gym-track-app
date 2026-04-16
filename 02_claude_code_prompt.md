# GymTrack — Claude Code Implementation Prompt

You are building **GymTrack**, a gym workout tracking app with AI-powered progressive overload suggestions.
The UI has already been designed in Lovable (React + Tailwind export). 
Your job is to implement the full stack: Supabase backend, shared TypeScript types, and a React Native (Expo) mobile app that consumes it.

Work **step by step**. Complete each phase fully before moving to the next. After each phase, confirm what was built and what comes next.

---

## TECH STACK

- **Backend / DB / Auth**: Supabase (PostgreSQL + Row Level Security + Edge Functions)
- **AI suggestions**: Anthropic Claude API — called from a Supabase Edge Function
- **Mobile app**: React Native + Expo (iOS + Android from one codebase)
- **Web app**: React (from Lovable export, wired to same Supabase project)
- **Push notifications**: Expo Notifications (wraps APNs + FCM)
- **Background timer accuracy**: `expo-application` + `AppState` + `expo-notifications` scheduled notifications
- **Local persistence (mid-workout resume)**: `expo-secure-store` or `AsyncStorage`
- **Navigation**: Expo Router (file-based)
- **State management**: Zustand
- **API client**: Supabase JS client v2
- **Charts**: Victory Native (React Native charts)
- **Package manager**: npm

---

## PHASE 1 — Supabase Project Setup

### 1.1 Create the project
- Initialize a new Supabase project
- Enable Email auth, Google OAuth, Apple OAuth
- Save `SUPABASE_URL` and `SUPABASE_ANON_KEY` to `.env`

### 1.2 Database schema — run these migrations in order

```sql
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
  workout_type text not null,  -- 'push','pull','legs','full_body','upper','lower','custom'
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
  exercise_name text not null,  -- denormalized for history display
  position int not null,        -- order in the workout
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
  duration_seconds int,   -- how long the set took (from rep timer)
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
  one_rep_max numeric,   -- Epley formula: weight * (1 + reps/30)
  achieved_at timestamptz not null,
  unique(user_id, exercise_id)  -- one current PR per exercise per user
);
```

### 1.3 Row Level Security policies

```sql
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
```

### 1.4 PR trigger

```sql
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

  -- flag the set as a PR if the record was updated
  if found then NEW.is_pr := true; end if;
  return NEW;
end;
$$;

create trigger trg_update_pr
before insert on public.set_logs
for each row execute function update_personal_record();
```

### 1.5 Seed exercise library

Insert at least 60 exercises across all muscle groups and equipment types. Include at minimum:
- Chest: Bench Press, Incline DB Press, Cable Fly, Dips, Push-ups
- Back: Deadlift, Pull-ups, Barbell Row, Lat Pulldown, Seated Cable Row, Face Pulls
- Shoulders: Overhead Press, DB Lateral Raise, Rear Delt Fly, Arnold Press
- Biceps: Barbell Curl, DB Curl, Hammer Curl, Cable Curl
- Triceps: Skull Crushers, Tricep Pushdown, Close-Grip Bench, Overhead Extension
- Quads: Back Squat, Front Squat, Leg Press, Leg Extension, Walking Lunges
- Hamstrings: Romanian DL, Lying Leg Curl, Good Mornings
- Glutes: Hip Thrust, Glute Bridge, Bulgarian Split Squat
- Calves: Standing Calf Raise, Seated Calf Raise
- Core: Plank, Cable Crunch, Hanging Leg Raise, Ab Wheel

---

## PHASE 2 — Supabase Edge Functions

Create each as a separate Edge Function under `supabase/functions/`.

### 2.1 `get-ai-suggestion`

**Trigger**: called when user is about to start a set
**Input**: `{ user_id, exercise_id, current_session_id }`
**Logic**:
1. Fetch last 4 sessions where this exercise was performed (set_logs joined to session_exercises)
2. Build a structured prompt for Claude API with the performance data
3. Call `claude-sonnet-4-20250514` with `max_tokens: 300`
4. Return `{ suggested_weight_kg, suggested_reps, note, confidence: 'increase'|'maintain'|'decrease' }`

**Prompt template**:
```
You are a personal trainer AI. Analyze the athlete's recent performance for [exercise name] and suggest weight and reps for their next set.

Recent performance (newest first):
[session date]: [sets data as "Nkg × N reps, Nkg × N reps, ..."]
...

Athlete profile: [fitness_goal], [experience_level]

Respond ONLY in JSON: { "weight_kg": number, "reps": number, "note": string (max 60 chars), "confidence": "increase"|"maintain"|"decrease" }
```

### 2.2 `complete-workout`

**Trigger**: called when user taps "Save Workout"
**Input**: `{ session_id }`
**Logic**:
1. Compute `total_volume_kg` = sum of (weight_kg × reps) for all set_logs in session
2. Compute `duration_seconds` = ended_at - started_at
3. Update `workout_sessions` row with computed values and `ended_at = now()`
4. Return updated session

---

## PHASE 3 — Shared TypeScript Types

Create `packages/types/index.ts` (or `src/types/index.ts` if monorepo not needed):

```typescript
export type FitnessGoal = 'strength' | 'hypertrophy' | 'endurance' | 'weight_loss';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type WeightUnit = 'kg' | 'lbs';
export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'bodyweight' | 'cable' | 'other';
export type AIConfidence = 'increase' | 'maintain' | 'decrease';

export interface Profile {
  id: string;
  name: string;
  fitness_goal: FitnessGoal;
  experience_level: ExperienceLevel;
  weight_unit: WeightUnit;
  default_rest_seconds: number;
  created_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  primary_muscle: string;
  secondary_muscles: string[];
  equipment: Equipment;
  description?: string;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  workout_type: string;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  total_volume_kg?: number;
  notes?: string;
  mood?: number;
}

export interface SessionExercise {
  id: string;
  session_id: string;
  exercise_id: string;
  exercise_name: string;
  position: number;
}

export interface SetLog {
  id: string;
  session_exercise_id: string;
  user_id: string;
  set_number: number;
  weight_kg: number;
  reps: number;
  duration_seconds?: number;
  rpe?: number;
  is_pr: boolean;
  logged_at: string;
}

export interface PersonalRecord {
  id: string;
  user_id: string;
  exercise_id: string;
  weight_kg: number;
  reps: number;
  one_rep_max: number;
  achieved_at: string;
}

export interface AISuggestion {
  suggested_weight_kg: number;
  suggested_reps: number;
  note: string;
  confidence: AIConfidence;
}

// Active workout local state (not persisted to DB until complete)
export interface ActiveSet {
  weight: number;
  reps: number;
  duration_seconds: number;
  logged: boolean;
}

export interface ActiveExercise {
  exercise: Exercise;
  targetSets: number;
  targetReps: number;
  sets: ActiveSet[];
  suggestion?: AISuggestion;
}

export interface ActiveWorkout {
  sessionId: string;
  workoutType: string;
  startedAtMs: number;       // Date.now() — for elapsed workout time
  exercises: ActiveExercise[];
  currentExerciseIndex: number;
  currentSetIndex: number;
}

// Timer state — always timestamp-based
export interface RestTimerState {
  endAtMs: number;           // absolute timestamp — compute remaining = endAtMs - Date.now()
  totalSeconds: number;
  notificationId: string;
}

export interface RepTimerState {
  startedAtMs: number;       // absolute timestamp — compute elapsed = Date.now() - startedAtMs
}
```

---

## PHASE 4 — Expo React Native App

### 4.1 Project initialization

```bash
npx create-expo-app gymtrack --template blank-typescript
cd gymtrack
npx expo install expo-router expo-notifications expo-secure-store expo-application
npm install @supabase/supabase-js zustand @react-native-async-storage/async-storage
npm install victory-native react-native-svg
npm install react-native-safe-area-context react-native-screens
```

Configure `app.json`:
- Set `scheme: "gymtrack"` for deep links
- Add `plugins: ["expo-router", "expo-notifications"]`
- Add notification permissions for iOS: `NSUserNotificationUsageDescription`
- Set `bundleIdentifier` (iOS) and `package` (Android)

### 4.2 Supabase client — `src/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

### 4.3 Timer utilities — `src/lib/timers.ts`

Implement these functions. All timers are timestamp-based — no countdown state stored as integers.

```typescript
// Rest timer
export function scheduleRestNotification(endAtMs: number): Promise<string>
// Schedule an Expo local notification at new Date(endAtMs)
// Returns the notification identifier

export function cancelRestNotification(notificationId: string): Promise<void>

export function getRestRemaining(endAtMs: number): number
// Returns Math.max(0, Math.ceil((endAtMs - Date.now()) / 1000))

// Rep timer  
export function getRepElapsed(startedAtMs: number): number
// Returns Math.floor((Date.now() - startedAtMs) / 1000)

// Active workout elapsed
export function getWorkoutElapsed(startedAtMs: number): number
// Returns Math.floor((Date.now() - startedAtMs) / 1000)
```

### 4.4 Active workout persistence — `src/lib/workoutPersistence.ts`

```typescript
import * as SecureStore from 'expo-secure-store';
import { ActiveWorkout, RestTimerState, RepTimerState } from '../types';

const WORKOUT_KEY = 'active_workout';
const REST_KEY = 'rest_timer';
const REP_KEY = 'rep_timer';

export async function saveActiveWorkout(workout: ActiveWorkout): Promise<void>
export async function loadActiveWorkout(): Promise<ActiveWorkout | null>
export async function clearActiveWorkout(): Promise<void>

export async function saveRestTimer(state: RestTimerState): Promise<void>
export async function loadRestTimer(): Promise<RestTimerState | null>
export async function clearRestTimer(): Promise<void>

export async function saveRepTimer(state: RepTimerState): Promise<void>
export async function loadRepTimer(): Promise<RepTimerState | null>
export async function clearRepTimer(): Promise<void>
```

### 4.5 AppState listener — `src/lib/appStateHandler.ts`

```typescript
import { AppState } from 'react-native';
import { loadRestTimer, loadRepTimer } from './workoutPersistence';
import { useWorkoutStore } from '../store/workoutStore';

// Call this once in the root layout
export function registerAppStateHandler() {
  AppState.addEventListener('change', async (nextState) => {
    if (nextState === 'active') {
      // App came to foreground — recalculate all timers from stored timestamps
      const restState = await loadRestTimer();
      const repState = await loadRepTimer();
      const store = useWorkoutStore.getState();

      if (restState) {
        const remaining = Math.max(0, Math.ceil((restState.endAtMs - Date.now()) / 1000));
        if (remaining <= 0) {
          store.onRestComplete();
        } else {
          store.syncRestTimer(restState.endAtMs);
        }
      }

      if (repState) {
        store.syncRepTimer(repState.startedAtMs);
      }
    }
  });
}
```

### 4.6 Zustand store — `src/store/workoutStore.ts`

State shape and actions to implement:

```typescript
interface WorkoutStore {
  // Active workout
  activeWorkout: ActiveWorkout | null;
  
  // Timer state (timestamp-based)
  restEndAtMs: number | null;
  repStartedAtMs: number | null;
  restNotificationId: string | null;

  // Actions
  startWorkout(workoutType: string, exercises: ActiveExercise[]): Promise<void>;
  logSet(weight: number, reps: number, durationSeconds: number): Promise<void>;
  startRestTimer(seconds: number): Promise<void>;
  skipRest(): Promise<void>;
  onRestComplete(): void;
  startRepTimer(): Promise<void>;
  syncRestTimer(endAtMs: number): void;   // called on app resume
  syncRepTimer(startedAtMs: number): void; // called on app resume
  completeWorkout(notes?: string, mood?: number): Promise<void>;
  abandonWorkout(): Promise<void>;
  
  // AI suggestions
  fetchSuggestion(exerciseId: string): Promise<void>;
}
```

All `logSet` calls must:
1. Insert to `set_logs` via Supabase
2. Insert to `session_exercises` if not yet created for this exercise
3. Persist updated `activeWorkout` to SecureStore
4. Start rest timer

### 4.7 File-based routes (Expo Router)

```
app/
  _layout.tsx          — root layout, auth guard, registerAppStateHandler
  index.tsx            — redirect to (tabs)/home or (auth)/login
  (auth)/
    login.tsx
    signup.tsx
    onboarding.tsx
  (tabs)/
    _layout.tsx        — bottom tab navigator
    home.tsx           — dashboard
    history.tsx        — workout history list
    history/[id].tsx   — workout detail
    progress.tsx       — charts + PRs
    profile.tsx
  workout/
    select.tsx         — workout type selector
    exercises.tsx      — exercise list before starting
    active.tsx         — active workout screen (MAIN screen)
    rest.tsx           — rest timer screen
    complete.tsx       — post-workout summary
  exercises/
    index.tsx          — exercise library
    [id].tsx           — exercise detail
```

### 4.8 Implement screens in this order

1. **`(auth)/login.tsx` and `signup.tsx`** — Supabase email auth, Google OAuth, Apple Sign-In
2. **`(auth)/onboarding.tsx`** — 3-slide intro + profile setup, writes to `profiles` table
3. **`(tabs)/home.tsx`** — fetch last 3 sessions, weekly streak, profile name
4. **`workout/select.tsx`** — static workout type cards, navigate to exercises
5. **`workout/exercises.tsx`** — fetch exercise suggestions by workout type, allow add/remove/reorder
6. **`workout/active.tsx`** — full workout screen with timestamp timers, set logging, AI suggestions
7. **`workout/rest.tsx`** — circular countdown, syncs from `restEndAtMs` timestamp
8. **`workout/complete.tsx`** — calls `complete-workout` edge function, shows summary
9. **`(tabs)/history.tsx`** — list past sessions from Supabase
10. **`(tabs)/progress.tsx`** — Victory Native charts, PR table
11. **`exercises/index.tsx`** — searchable exercise library
12. **`(tabs)/profile.tsx`** — stats, settings, sign out

---

## PHASE 5 — Web App (React from Lovable export)

### 5.1 Wire Lovable export to Supabase

- Copy Supabase client setup from Phase 4.2 (browser version, no AsyncStorage)
- Replace all `fetchWorkoutHistory()`, `fetchExercises()`, `logSet()`, `getAISuggestion()` placeholder functions with real Supabase calls
- For timers on web: use `document.visibilitychange` event instead of `AppState`
- For notifications on web: use `Notification` browser API instead of Expo Notifications

### 5.2 Shared logic

Extract timer utilities (`src/lib/timers.ts`) as platform-agnostic pure functions — they only use `Date.now()` and arithmetic, no native APIs. Import them in both the Expo app and the web app.

---

## PHASE 6 — Testing & Deployment

### 6.1 Test checklist
- [ ] Sign up + onboarding flow completes and writes profile
- [ ] Start a Push workout, log 3 sets on Bench Press
- [ ] Switch to another app mid-rest — come back, rest timer shows correct remaining time
- [ ] Rest notification fires while app is backgrounded
- [ ] Complete workout — volume and duration calculated correctly
- [ ] PR trigger fires when a new max is set
- [ ] AI suggestion returns in < 3 seconds
- [ ] History shows completed session
- [ ] Progress chart shows Bench Press strength trend

### 6.2 Deploy
- **Supabase**: project is already hosted — just run `supabase db push` for migrations
- **Edge Functions**: `supabase functions deploy get-ai-suggestion` and `complete-workout`
- **Mobile**: `eas build --platform all` for TestFlight + Play Store internal track
- **Web**: `npm run build` → deploy to Vercel or Netlify, set env vars

---

## IMPORTANT IMPLEMENTATION NOTES

1. **Never use `setInterval` for timers.** All timers compute their value from `Date.now()` minus/plus a stored timestamp. The interval (or `requestAnimationFrame` on web) only triggers a re-render — the value comes from the timestamp math.

2. **Always save timer state before leaving the workout screen.** Before navigating to rest screen or backgrounding, persist `restEndAtMs` and `repStartedAtMs` to SecureStore.

3. **On app launch**, check SecureStore for an in-progress workout. If found, restore it and navigate directly to the active workout screen.

4. **AI suggestion calls** should be fire-and-forget on set log — don't block the UI. Show a loading state on the suggestion chip, fill it in when the Edge Function responds.

5. **Weight unit conversion**: store everything in kg in the database. Apply `lbs = kg * 2.2046` only at display time based on user preference.

6. **Offline resilience**: queue `set_logs` inserts in AsyncStorage if no connection, flush on reconnect.
