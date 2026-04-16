import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { scheduleRestNotification, cancelRestNotification } from '../lib/timers';
import {
  saveActiveWorkout,
  loadActiveWorkout,
  clearActiveWorkout,
  saveRestTimer,
  clearRestTimer,
  saveRepTimer,
  clearRepTimer,
} from '../lib/workoutPersistence';
import { ActiveWorkout, ActiveExercise, AISuggestion } from '../types';

interface WorkoutStore {
  activeWorkout: ActiveWorkout | null;
  restEndAtMs: number | null;
  repStartedAtMs: number | null;
  restNotificationId: string | null;
  isLoading: boolean;
  error: string | null;

  startWorkout(workoutType: string, exercises: ActiveExercise[]): Promise<void>;
  logSet(weight: number, reps: number, durationSeconds: number): Promise<void>;
  startRestTimer(seconds: number): Promise<void>;
  skipRest(): Promise<void>;
  onRestComplete(): void;
  startRepTimer(): Promise<void>;
  stopRepTimer(): Promise<void>;
  syncRestTimer(endAtMs: number): void;
  syncRepTimer(startedAtMs: number): void;
  completeWorkout(notes?: string, mood?: number): Promise<void>;
  abandonWorkout(): Promise<void>;
  fetchSuggestion(exerciseId: string): Promise<void>;
  restoreWorkout(): Promise<void>;
  nextExercise(): void;
  previousExercise(): void;
}

// Track session exercise IDs per exercise index to avoid re-creating them
const sessionExerciseCache: Record<string, string> = {};

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  activeWorkout: null,
  restEndAtMs: null,
  repStartedAtMs: null,
  restNotificationId: null,
  isLoading: false,
  error: null,

  async startWorkout(workoutType: string, exercises: ActiveExercise[]) {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: user.id,
          workout_type: workoutType,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      const workout: ActiveWorkout = {
        sessionId: data.id,
        workoutType,
        startedAtMs: Date.now(),
        exercises,
        currentExerciseIndex: 0,
        currentSetIndex: 0,
      };

      // Clear the cache for new workout
      Object.keys(sessionExerciseCache).forEach((k) => delete sessionExerciseCache[k]);

      await saveActiveWorkout(workout);
      set({ activeWorkout: workout, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err.message });
    }
  },

  async logSet(weight: number, reps: number, durationSeconds: number) {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    const { currentExerciseIndex, currentSetIndex, exercises, sessionId } = activeWorkout;
    const currentExercise = exercises[currentExerciseIndex];
    if (!currentExercise) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const cacheKey = `${sessionId}_${currentExerciseIndex}`;

      // Get or create session exercise
      let sessionExerciseId = sessionExerciseCache[cacheKey];
      if (!sessionExerciseId) {
        const { data: seData, error: seError } = await supabase
          .from('session_exercises')
          .insert({
            session_id: sessionId,
            exercise_id: currentExercise.exercise.id,
            exercise_name: currentExercise.exercise.name,
            position: currentExerciseIndex,
          })
          .select()
          .single();

        if (seError) throw seError;
        sessionExerciseId = seData.id;
        sessionExerciseCache[cacheKey] = sessionExerciseId;
      }

      // Insert set log
      await supabase.from('set_logs').insert({
        session_exercise_id: sessionExerciseId,
        user_id: user.id,
        set_number: currentSetIndex + 1,
        weight_kg: weight,
        reps,
        duration_seconds: durationSeconds,
        is_pr: false,
        logged_at: new Date().toISOString(),
      });

      // Update local state
      const updatedExercises = exercises.map((ex, idx) => {
        if (idx !== currentExerciseIndex) return ex;
        const updatedSets = [...ex.sets];
        updatedSets[currentSetIndex] = {
          weight,
          reps,
          duration_seconds: durationSeconds,
          logged: true,
        };
        return { ...ex, sets: updatedSets };
      });

      const newSetIndex = currentSetIndex + 1;
      const updatedWorkout: ActiveWorkout = {
        ...activeWorkout,
        exercises: updatedExercises,
        currentSetIndex: newSetIndex,
      };

      await saveActiveWorkout(updatedWorkout);
      set({ activeWorkout: updatedWorkout });

      // Auto-start rest timer (90s default)
      const profile = await supabase
        .from('profiles')
        .select('default_rest_seconds')
        .eq('id', user.id)
        .single();

      const restSeconds = profile.data?.default_rest_seconds ?? 90;
      await get().startRestTimer(restSeconds);

      // Fire-and-forget AI suggestion
      get().fetchSuggestion(currentExercise.exercise.id).catch(() => {});
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  async startRestTimer(seconds: number) {
    const endAtMs = Date.now() + seconds * 1000;

    let notificationId = '';
    try {
      notificationId = await scheduleRestNotification(endAtMs);
    } catch {
      // notifications may not be granted
    }

    await saveRestTimer({ endAtMs, totalSeconds: seconds, notificationId });
    set({ restEndAtMs: endAtMs, restNotificationId: notificationId });
  },

  async skipRest() {
    const { restNotificationId } = get();
    if (restNotificationId) {
      try {
        await cancelRestNotification(restNotificationId);
      } catch {}
    }
    await clearRestTimer();
    set({ restEndAtMs: null, restNotificationId: null });
  },

  onRestComplete() {
    clearRestTimer().catch(() => {});
    set({ restEndAtMs: null, restNotificationId: null });
  },

  async startRepTimer() {
    const startedAtMs = Date.now();
    await saveRepTimer({ startedAtMs });
    set({ repStartedAtMs: startedAtMs });
  },

  async stopRepTimer() {
    await clearRepTimer();
    set({ repStartedAtMs: null });
  },

  syncRestTimer(endAtMs: number) {
    set({ restEndAtMs: endAtMs });
  },

  syncRepTimer(startedAtMs: number) {
    set({ repStartedAtMs: startedAtMs });
  },

  async completeWorkout(notes?: string, mood?: number) {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    set({ isLoading: true });
    try {
      // Call edge function for volume/PR calculations
      await supabase.functions.invoke('complete-workout', {
        body: { session_id: activeWorkout.sessionId },
      });

      // Update notes and mood
      if (notes !== undefined || mood !== undefined) {
        await supabase
          .from('workout_sessions')
          .update({
            notes,
            mood,
            ended_at: new Date().toISOString(),
          })
          .eq('id', activeWorkout.sessionId);
      }

      await clearActiveWorkout();
      await clearRestTimer();
      await clearRepTimer();
      Object.keys(sessionExerciseCache).forEach((k) => delete sessionExerciseCache[k]);

      set({
        activeWorkout: null,
        restEndAtMs: null,
        repStartedAtMs: null,
        restNotificationId: null,
        isLoading: false,
      });
    } catch (err: any) {
      // Even if edge function fails, clear locally
      await clearActiveWorkout();
      set({ activeWorkout: null, isLoading: false, error: err.message });
    }
  },

  async abandonWorkout() {
    await clearActiveWorkout();
    await clearRestTimer();
    await clearRepTimer();
    Object.keys(sessionExerciseCache).forEach((k) => delete sessionExerciseCache[k]);

    const { restNotificationId } = get();
    if (restNotificationId) {
      try {
        await cancelRestNotification(restNotificationId);
      } catch {}
    }

    set({
      activeWorkout: null,
      restEndAtMs: null,
      repStartedAtMs: null,
      restNotificationId: null,
    });
  },

  async fetchSuggestion(exerciseId: string) {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.functions.invoke('get-ai-suggestion', {
        body: {
          user_id: user.id,
          exercise_id: exerciseId,
          session_id: activeWorkout.sessionId,
        },
      });

      if (error || !data) return;

      const suggestion: AISuggestion = data;
      const { currentExerciseIndex } = activeWorkout;

      const updatedExercises = activeWorkout.exercises.map((ex, idx) => {
        if (idx !== currentExerciseIndex) return ex;
        return { ...ex, suggestion };
      });

      const updatedWorkout = { ...activeWorkout, exercises: updatedExercises };
      await saveActiveWorkout(updatedWorkout);
      set({ activeWorkout: updatedWorkout });
    } catch {
      // Silently fail
    }
  },

  async restoreWorkout() {
    try {
      const workout = await loadActiveWorkout();
      if (workout) {
        set({ activeWorkout: workout });
      }
    } catch {
      // Nothing to restore
    }
  },

  nextExercise() {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    const nextIndex = Math.min(
      activeWorkout.currentExerciseIndex + 1,
      activeWorkout.exercises.length - 1
    );

    const updatedWorkout = {
      ...activeWorkout,
      currentExerciseIndex: nextIndex,
      currentSetIndex: 0,
    };

    saveActiveWorkout(updatedWorkout).catch(() => {});
    set({ activeWorkout: updatedWorkout });
  },

  previousExercise() {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    const prevIndex = Math.max(0, activeWorkout.currentExerciseIndex - 1);

    const updatedWorkout = {
      ...activeWorkout,
      currentExerciseIndex: prevIndex,
      currentSetIndex: 0,
    };

    saveActiveWorkout(updatedWorkout).catch(() => {});
    set({ activeWorkout: updatedWorkout });
  },
}));
