import { supabase } from './supabase';
import type { WorkoutSession, SessionExercise, SetLog, PersonalRecord, Profile, AISuggestion } from '../types';

// ============================================================
// GymTrack — Data Layer
// Types, exercise database, localStorage helpers, placeholder functions
// ============================================================

// ---------- TYPES ----------

export interface UserProfile {
  name: string;
  fitnessGoal: "Strength" | "Hypertrophy" | "Endurance" | "Weight Loss";
  experienceLevel: "Beginner" | "Intermediate" | "Advanced";
  createdAt: number;
  weightUnit: "kg" | "lbs";
  restTimerDuration: number; // seconds
}

export interface Exercise {
  id: string;
  name: string;
  primaryMuscle: string;
  secondaryMuscles: string[];
  equipment: "Barbell" | "Dumbbell" | "Machine" | "Bodyweight" | "Cable" | "Other";
  description: string;
  isBodyweight: boolean;
}

export interface LoggedSet {
  id: string;
  weight: number;
  reps: number;
  timestamp: number;
  isPersonalRecord?: boolean;
}

export interface WorkoutExercise {
  exerciseId: string;
  exercise: Exercise;
  defaultSets: number;
  defaultReps: number;
  loggedSets: LoggedSet[];
  restSeconds?: number;              // rest between sets for this exercise
  interExerciseRestSeconds?: number; // rest after finishing all sets before next exercise
  setDurationSeconds?: number;       // 0 = rep-based, >0 = timed set countdown
}

export interface ActiveWorkout {
  id: string;
  type: WorkoutType;
  startedAt: number;
  totalPausedMs: number;             // accumulated paused milliseconds
  exercises: WorkoutExercise[];
  currentExerciseIndex: number;
  currentSetNumber: number;
  restTimerStartedAt: number | null;
  restTimerDuration: number;
  isResting: boolean;
}

export interface WorkoutPlan {
  id: string;
  name: string;
  icon: string;
  color: string;
  exercises: Pick<WorkoutExercise, "exerciseId" | "defaultSets" | "defaultReps" | "restSeconds" | "interExerciseRestSeconds" | "setDurationSeconds">[];
  createdAt: number;
}

export interface CompletedWorkout {
  id: string;
  type: WorkoutType;
  date: number;
  duration: number; // ms
  exercises: {
    exerciseId: string;
    exerciseName: string;
    primaryMuscle: string;
    sets: { weight: number; reps: number }[];
  }[];
  totalSets: number;
  totalVolume: number;
  note?: string;
  moodRating?: number;
  personalRecords: { exerciseName: string; weight: number; reps: number }[];
}

export interface BodyWeightEntry {
  date: number;
  weight: number;
}

export type WorkoutType = "Push" | "Pull" | "Legs" | "Full Body" | "Upper" | "Lower" | "Custom";

export interface WorkoutTypeInfo {
  type: WorkoutType;
  icon: string;
  estimatedDuration: string;
  muscleGroups: string[];
  color: string;
}

// ---------- WORKOUT TYPE DEFINITIONS ----------

export const WORKOUT_TYPES: WorkoutTypeInfo[] = [
  { type: "Push", icon: "💪", estimatedDuration: "45-60 min", muscleGroups: ["Chest", "Shoulders", "Triceps"], color: "#6C5CE7" },
  { type: "Pull", icon: "🏋️", estimatedDuration: "45-60 min", muscleGroups: ["Back", "Biceps", "Rear Delts"], color: "#00E676" },
  { type: "Legs", icon: "🦵", estimatedDuration: "50-65 min", muscleGroups: ["Quads", "Hamstrings", "Glutes", "Calves"], color: "#FFD93D" },
  { type: "Full Body", icon: "⚡", estimatedDuration: "60-75 min", muscleGroups: ["All Major Groups"], color: "#FF6B6B" },
  { type: "Upper", icon: "🔥", estimatedDuration: "50-60 min", muscleGroups: ["Chest", "Back", "Shoulders", "Arms"], color: "#A29BFE" },
  { type: "Lower", icon: "🏃", estimatedDuration: "45-55 min", muscleGroups: ["Quads", "Hamstrings", "Glutes", "Calves"], color: "#00B894" },
  { type: "Custom", icon: "✏️", estimatedDuration: "Variable", muscleGroups: ["Your Choice"], color: "#8B8BA3" },
];

// ---------- EXERCISE DATABASE (100+ exercises) ----------

export const EXERCISE_DATABASE: Exercise[] = [
  // CHEST
  { id: "bb-bench", name: "Barbell Bench Press", primaryMuscle: "Chest", secondaryMuscles: ["Triceps", "Shoulders"], equipment: "Barbell", description: "Lie on a flat bench, grip the barbell slightly wider than shoulder width, lower to chest and press up.", isBodyweight: false },
  { id: "inc-bb-bench", name: "Incline Barbell Bench Press", primaryMuscle: "Chest", secondaryMuscles: ["Shoulders", "Triceps"], equipment: "Barbell", description: "Bench press on an incline bench set to 30-45 degrees.", isBodyweight: false },
  { id: "dec-bb-bench", name: "Decline Barbell Bench Press", primaryMuscle: "Chest", secondaryMuscles: ["Triceps"], equipment: "Barbell", description: "Bench press on a decline bench.", isBodyweight: false },
  { id: "db-bench", name: "Dumbbell Bench Press", primaryMuscle: "Chest", secondaryMuscles: ["Triceps", "Shoulders"], equipment: "Dumbbell", description: "Press dumbbells from chest level on a flat bench.", isBodyweight: false },
  { id: "inc-db-bench", name: "Incline Dumbbell Bench Press", primaryMuscle: "Chest", secondaryMuscles: ["Shoulders", "Triceps"], equipment: "Dumbbell", description: "Dumbbell press on an incline bench.", isBodyweight: false },
  { id: "db-fly", name: "Dumbbell Fly", primaryMuscle: "Chest", secondaryMuscles: ["Shoulders"], equipment: "Dumbbell", description: "Lie flat, extend arms with slight bend, lower dumbbells in arc motion.", isBodyweight: false },
  { id: "cable-fly", name: "Cable Fly", primaryMuscle: "Chest", secondaryMuscles: ["Shoulders"], equipment: "Cable", description: "Stand between cable stations, bring handles together in front of chest.", isBodyweight: false },
  { id: "cable-fly-low", name: "Low Cable Fly", primaryMuscle: "Chest", secondaryMuscles: ["Shoulders"], equipment: "Cable", description: "Cable fly with pulleys set low, bringing handles up and together.", isBodyweight: false },
  { id: "chest-press-machine", name: "Machine Chest Press", primaryMuscle: "Chest", secondaryMuscles: ["Triceps", "Shoulders"], equipment: "Machine", description: "Seated chest press on a machine.", isBodyweight: false },
  { id: "pec-deck", name: "Pec Deck Machine", primaryMuscle: "Chest", secondaryMuscles: [], equipment: "Machine", description: "Seated fly motion on pec deck machine.", isBodyweight: false },
  { id: "pushup", name: "Push-Up", primaryMuscle: "Chest", secondaryMuscles: ["Triceps", "Shoulders", "Core"], equipment: "Bodyweight", description: "Classic push-up from plank position.", isBodyweight: true },
  { id: "dip-chest", name: "Chest Dip", primaryMuscle: "Chest", secondaryMuscles: ["Triceps", "Shoulders"], equipment: "Bodyweight", description: "Dip with forward lean to target chest.", isBodyweight: true },

  // SHOULDERS
  { id: "ohp", name: "Overhead Press", primaryMuscle: "Shoulders", secondaryMuscles: ["Triceps", "Core"], equipment: "Barbell", description: "Press barbell overhead from shoulder height.", isBodyweight: false },
  { id: "db-shoulder-press", name: "Dumbbell Shoulder Press", primaryMuscle: "Shoulders", secondaryMuscles: ["Triceps"], equipment: "Dumbbell", description: "Press dumbbells overhead while seated or standing.", isBodyweight: false },
  { id: "arnold-press", name: "Arnold Press", primaryMuscle: "Shoulders", secondaryMuscles: ["Triceps"], equipment: "Dumbbell", description: "Rotating dumbbell press starting with palms facing you.", isBodyweight: false },
  { id: "lat-raise", name: "Lateral Raise", primaryMuscle: "Shoulders", secondaryMuscles: [], equipment: "Dumbbell", description: "Raise dumbbells to sides until arms are parallel to floor.", isBodyweight: false },
  { id: "front-raise", name: "Front Raise", primaryMuscle: "Shoulders", secondaryMuscles: [], equipment: "Dumbbell", description: "Raise dumbbells in front to shoulder height.", isBodyweight: false },
  { id: "cable-lat-raise", name: "Cable Lateral Raise", primaryMuscle: "Shoulders", secondaryMuscles: [], equipment: "Cable", description: "Lateral raise using cable machine for constant tension.", isBodyweight: false },
  { id: "rear-delt-fly", name: "Rear Delt Fly", primaryMuscle: "Shoulders", secondaryMuscles: ["Back"], equipment: "Dumbbell", description: "Bent over reverse fly targeting rear delts.", isBodyweight: false },
  { id: "face-pull", name: "Face Pull", primaryMuscle: "Shoulders", secondaryMuscles: ["Back"], equipment: "Cable", description: "Pull rope attachment to face level, externally rotating.", isBodyweight: false },
  { id: "machine-shoulder-press", name: "Machine Shoulder Press", primaryMuscle: "Shoulders", secondaryMuscles: ["Triceps"], equipment: "Machine", description: "Seated overhead press on machine.", isBodyweight: false },
  { id: "upright-row", name: "Upright Row", primaryMuscle: "Shoulders", secondaryMuscles: ["Traps"], equipment: "Barbell", description: "Pull barbell up along body to chin height.", isBodyweight: false },

  // TRICEPS
  { id: "tricep-pushdown", name: "Tricep Pushdown", primaryMuscle: "Triceps", secondaryMuscles: [], equipment: "Cable", description: "Push cable bar down, keeping elbows at sides.", isBodyweight: false },
  { id: "rope-pushdown", name: "Rope Pushdown", primaryMuscle: "Triceps", secondaryMuscles: [], equipment: "Cable", description: "Tricep pushdown using rope attachment.", isBodyweight: false },
  { id: "overhead-tricep-ext", name: "Overhead Tricep Extension", primaryMuscle: "Triceps", secondaryMuscles: [], equipment: "Dumbbell", description: "Extend dumbbell overhead behind head.", isBodyweight: false },
  { id: "skull-crusher", name: "Skull Crusher", primaryMuscle: "Triceps", secondaryMuscles: [], equipment: "Barbell", description: "Lying tricep extension with EZ bar.", isBodyweight: false },
  { id: "close-grip-bench", name: "Close Grip Bench Press", primaryMuscle: "Triceps", secondaryMuscles: ["Chest"], equipment: "Barbell", description: "Bench press with narrow grip targeting triceps.", isBodyweight: false },
  { id: "tricep-dip", name: "Tricep Dip", primaryMuscle: "Triceps", secondaryMuscles: ["Chest", "Shoulders"], equipment: "Bodyweight", description: "Dip with upright torso to target triceps.", isBodyweight: true },
  { id: "diamond-pushup", name: "Diamond Push-Up", primaryMuscle: "Triceps", secondaryMuscles: ["Chest"], equipment: "Bodyweight", description: "Push-up with hands close together forming diamond shape.", isBodyweight: true },

  // BACK
  { id: "deadlift", name: "Deadlift", primaryMuscle: "Back", secondaryMuscles: ["Hamstrings", "Glutes", "Core"], equipment: "Barbell", description: "Lift barbell from floor to standing position.", isBodyweight: false },
  { id: "bb-row", name: "Barbell Row", primaryMuscle: "Back", secondaryMuscles: ["Biceps", "Rear Delts"], equipment: "Barbell", description: "Bent over row pulling barbell to lower chest.", isBodyweight: false },
  { id: "db-row", name: "Dumbbell Row", primaryMuscle: "Back", secondaryMuscles: ["Biceps"], equipment: "Dumbbell", description: "Single arm row with knee on bench.", isBodyweight: false },
  { id: "pullup", name: "Pull-Up", primaryMuscle: "Back", secondaryMuscles: ["Biceps", "Core"], equipment: "Bodyweight", description: "Pull body up to bar with overhand grip.", isBodyweight: true },
  { id: "chinup", name: "Chin-Up", primaryMuscle: "Back", secondaryMuscles: ["Biceps"], equipment: "Bodyweight", description: "Pull body up to bar with underhand grip.", isBodyweight: true },
  { id: "lat-pulldown", name: "Lat Pulldown", primaryMuscle: "Back", secondaryMuscles: ["Biceps"], equipment: "Cable", description: "Pull bar down to chest on lat pulldown machine.", isBodyweight: false },
  { id: "close-grip-pulldown", name: "Close Grip Pulldown", primaryMuscle: "Back", secondaryMuscles: ["Biceps"], equipment: "Cable", description: "Lat pulldown with narrow grip attachment.", isBodyweight: false },
  { id: "seated-cable-row", name: "Seated Cable Row", primaryMuscle: "Back", secondaryMuscles: ["Biceps", "Rear Delts"], equipment: "Cable", description: "Row cable to midsection while seated.", isBodyweight: false },
  { id: "t-bar-row", name: "T-Bar Row", primaryMuscle: "Back", secondaryMuscles: ["Biceps"], equipment: "Barbell", description: "Row using T-bar or landmine setup.", isBodyweight: false },
  { id: "machine-row", name: "Machine Row", primaryMuscle: "Back", secondaryMuscles: ["Biceps"], equipment: "Machine", description: "Seated row on machine.", isBodyweight: false },
  { id: "cable-pullover", name: "Cable Pullover", primaryMuscle: "Back", secondaryMuscles: ["Chest"], equipment: "Cable", description: "Straight arm pullover using cable.", isBodyweight: false },
  { id: "hyperextension", name: "Hyperextension", primaryMuscle: "Back", secondaryMuscles: ["Glutes", "Hamstrings"], equipment: "Bodyweight", description: "Back extension on hyperextension bench.", isBodyweight: true },

  // BICEPS
  { id: "bb-curl", name: "Barbell Curl", primaryMuscle: "Biceps", secondaryMuscles: ["Forearms"], equipment: "Barbell", description: "Curl barbell from thigh to shoulder level.", isBodyweight: false },
  { id: "db-curl", name: "Dumbbell Curl", primaryMuscle: "Biceps", secondaryMuscles: ["Forearms"], equipment: "Dumbbell", description: "Alternating or simultaneous dumbbell curls.", isBodyweight: false },
  { id: "hammer-curl", name: "Hammer Curl", primaryMuscle: "Biceps", secondaryMuscles: ["Forearms"], equipment: "Dumbbell", description: "Curl with neutral grip (palms facing each other).", isBodyweight: false },
  { id: "incline-db-curl", name: "Incline Dumbbell Curl", primaryMuscle: "Biceps", secondaryMuscles: [], equipment: "Dumbbell", description: "Curl dumbbells while seated on incline bench.", isBodyweight: false },
  { id: "preacher-curl", name: "Preacher Curl", primaryMuscle: "Biceps", secondaryMuscles: [], equipment: "Barbell", description: "Curl on preacher bench for strict isolation.", isBodyweight: false },
  { id: "cable-curl", name: "Cable Curl", primaryMuscle: "Biceps", secondaryMuscles: [], equipment: "Cable", description: "Curl using cable machine for constant tension.", isBodyweight: false },
  { id: "concentration-curl", name: "Concentration Curl", primaryMuscle: "Biceps", secondaryMuscles: [], equipment: "Dumbbell", description: "Seated single arm curl with elbow braced on inner thigh.", isBodyweight: false },
  { id: "ez-bar-curl", name: "EZ Bar Curl", primaryMuscle: "Biceps", secondaryMuscles: ["Forearms"], equipment: "Barbell", description: "Curl using EZ curl bar for wrist comfort.", isBodyweight: false },

  // QUADS
  { id: "bb-squat", name: "Barbell Back Squat", primaryMuscle: "Quads", secondaryMuscles: ["Glutes", "Hamstrings", "Core"], equipment: "Barbell", description: "Squat with barbell on upper back.", isBodyweight: false },
  { id: "front-squat", name: "Front Squat", primaryMuscle: "Quads", secondaryMuscles: ["Glutes", "Core"], equipment: "Barbell", description: "Squat with barbell on front delts.", isBodyweight: false },
  { id: "goblet-squat", name: "Goblet Squat", primaryMuscle: "Quads", secondaryMuscles: ["Glutes"], equipment: "Dumbbell", description: "Squat holding dumbbell at chest.", isBodyweight: false },
  { id: "leg-press", name: "Leg Press", primaryMuscle: "Quads", secondaryMuscles: ["Glutes", "Hamstrings"], equipment: "Machine", description: "Press weight on leg press machine.", isBodyweight: false },
  { id: "hack-squat", name: "Hack Squat", primaryMuscle: "Quads", secondaryMuscles: ["Glutes"], equipment: "Machine", description: "Squat on hack squat machine.", isBodyweight: false },
  { id: "leg-extension", name: "Leg Extension", primaryMuscle: "Quads", secondaryMuscles: [], equipment: "Machine", description: "Extend legs on leg extension machine.", isBodyweight: false },
  { id: "bulgarian-split", name: "Bulgarian Split Squat", primaryMuscle: "Quads", secondaryMuscles: ["Glutes", "Hamstrings"], equipment: "Dumbbell", description: "Single leg squat with rear foot elevated.", isBodyweight: false },
  { id: "walking-lunge", name: "Walking Lunge", primaryMuscle: "Quads", secondaryMuscles: ["Glutes", "Hamstrings"], equipment: "Dumbbell", description: "Alternating forward lunges while walking.", isBodyweight: false },
  { id: "bodyweight-squat", name: "Bodyweight Squat", primaryMuscle: "Quads", secondaryMuscles: ["Glutes"], equipment: "Bodyweight", description: "Basic squat with no added weight.", isBodyweight: true },
  { id: "pistol-squat", name: "Pistol Squat", primaryMuscle: "Quads", secondaryMuscles: ["Glutes", "Core"], equipment: "Bodyweight", description: "Single leg squat with other leg extended.", isBodyweight: true },

  // HAMSTRINGS
  { id: "rdl", name: "Romanian Deadlift", primaryMuscle: "Hamstrings", secondaryMuscles: ["Glutes", "Back"], equipment: "Barbell", description: "Hip hinge with barbell, slight knee bend.", isBodyweight: false },
  { id: "db-rdl", name: "Dumbbell Romanian Deadlift", primaryMuscle: "Hamstrings", secondaryMuscles: ["Glutes"], equipment: "Dumbbell", description: "Romanian deadlift with dumbbells.", isBodyweight: false },
  { id: "lying-leg-curl", name: "Lying Leg Curl", primaryMuscle: "Hamstrings", secondaryMuscles: [], equipment: "Machine", description: "Curl legs on lying leg curl machine.", isBodyweight: false },
  { id: "seated-leg-curl", name: "Seated Leg Curl", primaryMuscle: "Hamstrings", secondaryMuscles: [], equipment: "Machine", description: "Curl legs on seated leg curl machine.", isBodyweight: false },
  { id: "good-morning", name: "Good Morning", primaryMuscle: "Hamstrings", secondaryMuscles: ["Back", "Glutes"], equipment: "Barbell", description: "Hip hinge with barbell on back.", isBodyweight: false },
  { id: "nordic-curl", name: "Nordic Hamstring Curl", primaryMuscle: "Hamstrings", secondaryMuscles: [], equipment: "Bodyweight", description: "Eccentric hamstring curl with feet anchored.", isBodyweight: true },
  { id: "single-leg-rdl", name: "Single Leg RDL", primaryMuscle: "Hamstrings", secondaryMuscles: ["Glutes", "Core"], equipment: "Dumbbell", description: "Romanian deadlift on one leg.", isBodyweight: false },

  // GLUTES
  { id: "hip-thrust", name: "Hip Thrust", primaryMuscle: "Glutes", secondaryMuscles: ["Hamstrings"], equipment: "Barbell", description: "Thrust hips up with back on bench, barbell on hips.", isBodyweight: false },
  { id: "glute-bridge", name: "Glute Bridge", primaryMuscle: "Glutes", secondaryMuscles: ["Hamstrings"], equipment: "Bodyweight", description: "Bridge hips up while lying on floor.", isBodyweight: true },
  { id: "cable-kickback", name: "Cable Kickback", primaryMuscle: "Glutes", secondaryMuscles: [], equipment: "Cable", description: "Kick leg back against cable resistance.", isBodyweight: false },
  { id: "step-up", name: "Step Up", primaryMuscle: "Glutes", secondaryMuscles: ["Quads"], equipment: "Dumbbell", description: "Step onto elevated platform with dumbbells.", isBodyweight: false },
  { id: "sumo-deadlift", name: "Sumo Deadlift", primaryMuscle: "Glutes", secondaryMuscles: ["Quads", "Hamstrings", "Back"], equipment: "Barbell", description: "Wide stance deadlift targeting glutes.", isBodyweight: false },

  // CALVES
  { id: "standing-calf-raise", name: "Standing Calf Raise", primaryMuscle: "Calves", secondaryMuscles: [], equipment: "Machine", description: "Raise heels on standing calf raise machine.", isBodyweight: false },
  { id: "seated-calf-raise", name: "Seated Calf Raise", primaryMuscle: "Calves", secondaryMuscles: [], equipment: "Machine", description: "Raise heels on seated calf raise machine.", isBodyweight: false },
  { id: "db-calf-raise", name: "Dumbbell Calf Raise", primaryMuscle: "Calves", secondaryMuscles: [], equipment: "Dumbbell", description: "Calf raise holding dumbbells on elevated surface.", isBodyweight: false },
  { id: "bw-calf-raise", name: "Bodyweight Calf Raise", primaryMuscle: "Calves", secondaryMuscles: [], equipment: "Bodyweight", description: "Calf raise with bodyweight only.", isBodyweight: true },

  // CORE
  { id: "plank", name: "Plank", primaryMuscle: "Core", secondaryMuscles: ["Shoulders"], equipment: "Bodyweight", description: "Hold body in straight line on forearms and toes.", isBodyweight: true },
  { id: "hanging-leg-raise", name: "Hanging Leg Raise", primaryMuscle: "Core", secondaryMuscles: ["Hip Flexors"], equipment: "Bodyweight", description: "Raise legs while hanging from pull-up bar.", isBodyweight: true },
  { id: "cable-crunch", name: "Cable Crunch", primaryMuscle: "Core", secondaryMuscles: [], equipment: "Cable", description: "Kneeling crunch against cable resistance.", isBodyweight: false },
  { id: "ab-wheel", name: "Ab Wheel Rollout", primaryMuscle: "Core", secondaryMuscles: ["Shoulders"], equipment: "Other", description: "Roll ab wheel forward and back from kneeling.", isBodyweight: false },
  { id: "russian-twist", name: "Russian Twist", primaryMuscle: "Core", secondaryMuscles: ["Obliques"], equipment: "Bodyweight", description: "Seated twist with feet elevated.", isBodyweight: true },
  { id: "mountain-climber", name: "Mountain Climber", primaryMuscle: "Core", secondaryMuscles: ["Shoulders", "Hip Flexors"], equipment: "Bodyweight", description: "Alternating knee drives from plank position.", isBodyweight: true },
  { id: "bicycle-crunch", name: "Bicycle Crunch", primaryMuscle: "Core", secondaryMuscles: ["Obliques"], equipment: "Bodyweight", description: "Alternating elbow to opposite knee while lying.", isBodyweight: true },
  { id: "dead-bug", name: "Dead Bug", primaryMuscle: "Core", secondaryMuscles: [], equipment: "Bodyweight", description: "Alternating arm and leg extensions while lying on back.", isBodyweight: true },
  { id: "side-plank", name: "Side Plank", primaryMuscle: "Core", secondaryMuscles: ["Obliques"], equipment: "Bodyweight", description: "Hold body sideways on one forearm.", isBodyweight: true },

  // TRAPS / FOREARMS
  { id: "bb-shrug", name: "Barbell Shrug", primaryMuscle: "Traps", secondaryMuscles: [], equipment: "Barbell", description: "Shrug shoulders up with barbell.", isBodyweight: false },
  { id: "db-shrug", name: "Dumbbell Shrug", primaryMuscle: "Traps", secondaryMuscles: [], equipment: "Dumbbell", description: "Shrug shoulders up with dumbbells.", isBodyweight: false },
  { id: "farmers-walk", name: "Farmer's Walk", primaryMuscle: "Forearms", secondaryMuscles: ["Traps", "Core"], equipment: "Dumbbell", description: "Walk while holding heavy dumbbells at sides.", isBodyweight: false },
  { id: "wrist-curl", name: "Wrist Curl", primaryMuscle: "Forearms", secondaryMuscles: [], equipment: "Dumbbell", description: "Curl wrists up while forearms rest on bench.", isBodyweight: false },
];

// ---------- WORKOUT TEMPLATES ----------

export const WORKOUT_TEMPLATES: Record<WorkoutType, string[]> = {
  Push: ["bb-bench", "inc-db-bench", "db-fly", "ohp", "lat-raise", "tricep-pushdown", "overhead-tricep-ext"],
  Pull: ["deadlift", "bb-row", "lat-pulldown", "seated-cable-row", "face-pull", "bb-curl", "hammer-curl"],
  Legs: ["bb-squat", "rdl", "leg-press", "leg-extension", "lying-leg-curl", "hip-thrust", "standing-calf-raise"],
  "Full Body": ["bb-squat", "bb-bench", "bb-row", "ohp", "rdl", "bb-curl", "plank"],
  Upper: ["bb-bench", "bb-row", "db-shoulder-press", "lat-pulldown", "cable-fly", "bb-curl", "tricep-pushdown"],
  Lower: ["bb-squat", "rdl", "leg-press", "bulgarian-split", "lying-leg-curl", "hip-thrust", "standing-calf-raise"],
  Custom: [],
};

// ---------- CUSTOM EXERCISES ----------

const CUSTOM_EXERCISES_KEY = "gymtrack_custom_exercises";

export function loadCustomExercises(): Exercise[] {
  try {
    const raw = localStorage.getItem(CUSTOM_EXERCISES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomExercises(exercises: Exercise[]): void {
  localStorage.setItem(CUSTOM_EXERCISES_KEY, JSON.stringify(exercises));
}

export function getAllExercises(): Exercise[] {
  return [...EXERCISE_DATABASE, ...loadCustomExercises()];
}

// ---------- DRAFT PLAN ----------

const DRAFT_PLAN_KEY = "gymtrack_draft_plan";

export interface DraftPlan {
  planName: string;
  planIcon: string;
  planColor: string;
  exercises: WorkoutExercise[];
}

export function saveDraftPlan(draft: DraftPlan): void {
  localStorage.setItem(DRAFT_PLAN_KEY, JSON.stringify(draft));
}

export function loadDraftPlan(): DraftPlan | null {
  try {
    const raw = localStorage.getItem(DRAFT_PLAN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearDraftPlan(): void {
  localStorage.removeItem(DRAFT_PLAN_KEY);
}

// ---------- HELPER FUNCTIONS ----------

export function getExerciseById(id: string): Exercise | undefined {
  return getAllExercises().find((e) => e.id === id);
}

export function getExercisesForWorkout(type: WorkoutType): WorkoutExercise[] {
  const ids = WORKOUT_TEMPLATES[type] ?? [];
  return ids
    .map((id) => {
      const exercise = getExerciseById(id);
      if (!exercise) return null;
      return {
        exerciseId: id,
        exercise,
        defaultSets: 4,
        defaultReps: type === "Legs" ? 10 : 8,
        loggedSets: [],
      };
    })
    .filter(Boolean) as WorkoutExercise[];
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  return `${seconds}s`;
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function convertWeight(value: number, from: "kg" | "lbs", to: "kg" | "lbs"): number {
  if (from === to) return value;
  if (from === "kg" && to === "lbs") return Math.round(value * 2.20462 * 10) / 10;
  return Math.round(value / 2.20462 * 10) / 10;
}

// ---------- LOCAL STORAGE ----------

const KEYS = {
  profile: "gymtrack_profile",
  onboarded: "gymtrack_onboarded",
  activeWorkout: "gymtrack_active_workout",
  history: "gymtrack_history",
  bodyWeight: "gymtrack_body_weight",
  streak: "gymtrack_streak",
  plans: "gymtrack_plans",
};

export function saveWorkoutPlans(plans: WorkoutPlan[]): void {
  localStorage.setItem(KEYS.plans, JSON.stringify(plans));
}

export function loadWorkoutPlans(): WorkoutPlan[] {
  const data = localStorage.getItem(KEYS.plans);
  return data ? JSON.parse(data) : [];
}

export function saveProfile(profile: UserProfile): void {
  localStorage.setItem(KEYS.profile, JSON.stringify(profile));
}

export function loadProfile(): UserProfile | null {
  const data = localStorage.getItem(KEYS.profile);
  return data ? JSON.parse(data) : null;
}

export function setOnboarded(value: boolean): void {
  localStorage.setItem(KEYS.onboarded, JSON.stringify(value));
}

export function isOnboarded(): boolean {
  return JSON.parse(localStorage.getItem(KEYS.onboarded) || "false");
}

export function saveActiveWorkout(workout: ActiveWorkout | null): void {
  if (workout) {
    localStorage.setItem(KEYS.activeWorkout, JSON.stringify(workout));
  } else {
    localStorage.removeItem(KEYS.activeWorkout);
  }
}

export function loadActiveWorkout(): ActiveWorkout | null {
  const data = localStorage.getItem(KEYS.activeWorkout);
  if (!data) return null;
  const w: ActiveWorkout = JSON.parse(data);
  // Guard against corrupted totalPausedMs (old pause/resume bug set it to ~Date.now()).
  // A valid paused duration can never exceed the elapsed wall-clock time.
  const elapsed = Date.now() - w.startedAt;
  if (w.totalPausedMs < 0 || w.totalPausedMs > elapsed) {
    w.totalPausedMs = 0;
  }
  return w;
}

export function saveWorkoutHistory(workouts: CompletedWorkout[]): void {
  localStorage.setItem(KEYS.history, JSON.stringify(workouts));
}

export function loadWorkoutHistory(): CompletedWorkout[] {
  const data = localStorage.getItem(KEYS.history);
  return data ? JSON.parse(data) : [];
}

export function saveBodyWeight(entries: BodyWeightEntry[]): void {
  localStorage.setItem(KEYS.bodyWeight, JSON.stringify(entries));
}

export function loadBodyWeight(): BodyWeightEntry[] {
  const data = localStorage.getItem(KEYS.bodyWeight);
  return data ? JSON.parse(data) : [];
}

// ---------- PLACEHOLDER API FUNCTIONS ----------

export async function fetchWorkoutHistory(): Promise<CompletedWorkout[]> {
  // Placeholder: Replace with actual API call
  return loadWorkoutHistory();
}

export async function fetchExercises(): Promise<Exercise[]> {
  // Placeholder: Replace with actual API call
  return EXERCISE_DATABASE;
}

export async function logSet(workoutId: string, exerciseId: string, weight: number, reps: number): Promise<void> {
  // Placeholder: Replace with actual API call
  console.log(`Logged set: workout=${workoutId}, exercise=${exerciseId}, ${weight}kg × ${reps}`);
}

export function getAISuggestion(exerciseId: string, _history: CompletedWorkout[]): { weight: number; reps: number } | null {
  // Placeholder: Replace with actual AI suggestion engine
  // Simple progressive overload: suggest +2.5kg from last session
  const history = loadWorkoutHistory();
  for (const workout of history) {
    const ex = workout.exercises.find((e) => e.exerciseId === exerciseId);
    if (ex && ex.sets.length > 0) {
      const bestSet = ex.sets.reduce((best, s) => (s.weight > best.weight ? s : best), ex.sets[0]);
      return { weight: bestSet.weight + 2.5, reps: bestSet.reps };
    }
  }
  return null;
}

export function getPersonalRecords(): Record<string, { weight: number; reps: number; date: number }> {
  const history = loadWorkoutHistory();
  const prs: Record<string, { weight: number; reps: number; date: number }> = {};
  for (const workout of history) {
    for (const ex of workout.exercises) {
      for (const set of ex.sets) {
        const key = ex.exerciseId;
        if (!prs[key] || set.weight > prs[key].weight) {
          prs[key] = { weight: set.weight, reps: set.reps, date: workout.date };
        }
      }
    }
  }
  return prs;
}

// ---------- MUSCLE GROUPS ----------

export const MUSCLE_GROUPS = [
  "Chest", "Back", "Shoulders", "Biceps", "Triceps",
  "Quads", "Hamstrings", "Glutes", "Calves", "Core",
  "Traps", "Forearms",
];

export const EQUIPMENT_TYPES = ["Barbell", "Dumbbell", "Machine", "Bodyweight", "Cable", "Other"] as const;

// ---------- SUPABASE API FUNCTIONS ----------

export async function fetchWorkoutHistoryFromDB(): Promise<WorkoutSession[]> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .order('started_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchExercisesFromDB(): Promise<import('../types').Exercise[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function startWorkoutSession(workoutType: string): Promise<WorkoutSession> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('workout_sessions')
    .insert({ user_id: user.id, workout_type: workoutType, started_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function insertSessionExercise(sessionId: string, exerciseId: string, exerciseName: string, position: number): Promise<SessionExercise> {
  const { data, error } = await supabase
    .from('session_exercises')
    .insert({ session_id: sessionId, exercise_id: exerciseId, exercise_name: exerciseName, position })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function insertSetLog(params: {
  sessionExerciseId: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  durationSeconds?: number;
  rpe?: number;
}): Promise<SetLog> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('set_logs')
    .insert({
      session_exercise_id: params.sessionExerciseId,
      user_id: user.id,
      set_number: params.setNumber,
      weight_kg: params.weightKg,
      reps: params.reps,
      duration_seconds: params.durationSeconds,
      rpe: params.rpe,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function completeWorkoutSession(sessionId: string, notes?: string, mood?: number): Promise<WorkoutSession> {
  const { data, error } = await supabase.functions.invoke('complete-workout', {
    body: { session_id: sessionId, notes, mood },
  });
  if (error) throw error;
  return data;
}

export async function fetchAISuggestion(exerciseId: string, sessionId: string): Promise<AISuggestion | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase.functions.invoke('get-ai-suggestion', {
      body: { user_id: user.id, exercise_id: exerciseId, current_session_id: sessionId },
    });
    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}

export async function fetchPersonalRecordsFromDB(): Promise<PersonalRecord[]> {
  const { data, error } = await supabase
    .from('personal_records')
    .select('*');
  if (error) throw error;
  return data ?? [];
}

export async function upsertProfile(profile: Partial<Profile> & { id: string }): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profile)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (error) return null;
  return data;
}

// ---------- SUGGESTED WORKOUT LOGIC ----------

export function getSuggestedWorkoutType(): WorkoutType {
  const history = loadWorkoutHistory();
  if (history.length === 0) return "Push";
  const pplOrder: WorkoutType[] = ["Push", "Pull", "Legs"];
  const lastType = history[0]?.type;
  const lastIndex = pplOrder.indexOf(lastType);
  if (lastIndex >= 0) return pplOrder[(lastIndex + 1) % 3];
  return "Push";
}

export function getWeekStreak(): { day: string; done: boolean; date: string }[] {
  const history = loadWorkoutHistory();
  const today = new Date();
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  const streak: { day: string; done: boolean; date: string }[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const done = history.some((w) => {
      const wDate = new Date(w.date).toISOString().split("T")[0];
      return wDate === dateStr;
    });
    streak.push({ day: days[d.getDay()], done, date: dateStr });
  }
  return streak;
}

export function getCurrentStreak(): number {
  const history = loadWorkoutHistory();
  if (history.length === 0) return 0;
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const done = history.some((w) => new Date(w.date).toISOString().split("T")[0] === dateStr);
    if (done) streak++;
    else if (i > 0) break;
  }
  return streak;
}