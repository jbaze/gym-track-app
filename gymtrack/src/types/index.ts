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
  startedAtMs: number;
  exercises: ActiveExercise[];
  currentExerciseIndex: number;
  currentSetIndex: number;
}

export interface RestTimerState {
  endAtMs: number;
  totalSeconds: number;
  notificationId: string;
}

export interface RepTimerState {
  startedAtMs: number;
}
