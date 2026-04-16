import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useWorkoutStore } from '../../src/store/workoutStore';
import {
  formatSeconds,
  getWorkoutElapsed,
  getRestRemaining,
  getRepElapsed,
} from '../../src/lib/timers';
import { ActiveSet } from '../../src/types';

const RPE_OPTIONS = [6, 7, 8, 9, 10];

export default function ActiveWorkoutScreen() {
  const {
    activeWorkout,
    restEndAtMs,
    repStartedAtMs,
    logSet,
    skipRest,
    startRepTimer,
    stopRepTimer,
    nextExercise,
    previousExercise,
    abandonWorkout,
  } = useWorkoutStore();

  const [, forceUpdate] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer display state (computed from timestamps on each tick)
  const [weight, setWeight] = useState(60);
  const [reps, setReps] = useState(8);
  const [rpe, setRpe] = useState<number | null>(null);
  const [logging, setLogging] = useState(false);
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  // Tick to force re-render for timer display
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      forceUpdate((n) => n + 1);
      // Auto-complete rest
      if (restEndAtMs && Date.now() >= restEndAtMs) {
        useWorkoutStore.getState().onRestComplete();
      }
    }, 500);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [restEndAtMs]);

  // Pre-fill weight/reps from AI suggestion when exercise changes
  useEffect(() => {
    if (!activeWorkout) return;
    const currentEx = activeWorkout.exercises[activeWorkout.currentExerciseIndex];
    if (currentEx?.suggestion) {
      setWeight(currentEx.suggestion.suggested_weight_kg);
      setReps(currentEx.suggestion.suggested_reps);
    } else {
      setReps(currentEx?.targetReps ?? 8);
    }
    setRpe(null);
  }, [activeWorkout?.currentExerciseIndex]);

  if (!activeWorkout) {
    return (
      <View style={styles.centered}>
        <Text style={styles.noWorkoutText}>No active workout.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(tabs)/home')}>
          <Text style={styles.backBtnText}>Go Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { exercises, currentExerciseIndex, currentSetIndex, startedAtMs } = activeWorkout;
  const currentExercise = exercises[currentExerciseIndex];
  if (!currentExercise) return null;

  // Computed timer values (never stored as countdown ints)
  const workoutElapsed = getWorkoutElapsed(startedAtMs);
  const restRemaining = restEndAtMs ? getRestRemaining(restEndAtMs) : 0;
  const repElapsed = repStartedAtMs ? getRepElapsed(repStartedAtMs) : 0;
  const isResting = !!restEndAtMs && restRemaining > 0;
  const restProgress = restEndAtMs
    ? 1 - restRemaining / Math.max(1, (restEndAtMs - startedAtMs) / 1000)
    : 0;

  const loggedSets = currentExercise.sets.filter((s) => s.logged);

  const suggestion = currentExercise.suggestion;
  const confidenceIcon =
    suggestion?.confidence === 'increase' ? '↑' :
    suggestion?.confidence === 'decrease' ? '↓' : '→';
  const confidenceColor =
    suggestion?.confidence === 'increase' ? '#00E676' :
    suggestion?.confidence === 'decrease' ? '#FF5050' : '#FFD93D';

  const handleLogSet = async () => {
    setLogging(true);
    const repDuration = repStartedAtMs ? getRepElapsed(repStartedAtMs) : 0;
    await stopRepTimer();
    await logSet(weight, reps, repDuration);
    setLogging(false);
  };

  const handleFinish = () => {
    Alert.alert('Finish Workout', 'Ready to wrap up?', [
      { text: 'Keep Going', style: 'cancel' },
      { text: 'Finish', onPress: () => router.push('/workout/complete') },
    ]);
  };

  const handleAbandon = () => {
    Alert.alert('Abandon Workout', 'This will discard all progress. Are you sure?', [
      { text: 'Keep Going', style: 'cancel' },
      {
        text: 'Abandon',
        style: 'destructive',
        onPress: async () => {
          await abandonWorkout();
          router.replace('/(tabs)/home');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.abandonBtn} onPress={handleAbandon}>
          <Text style={styles.abandonIcon}>✕</Text>
        </TouchableOpacity>

        <View style={styles.topCenter}>
          <Text style={styles.elapsedTime}>{formatSeconds(workoutElapsed)}</Text>
          <Text style={styles.exerciseCounter}>
            Exercise {currentExerciseIndex + 1}/{exercises.length}
          </Text>
        </View>

        <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
          <Text style={styles.finishBtnText}>Finish</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Exercise Name */}
        <Text style={styles.exerciseName}>{currentExercise.exercise.name}</Text>
        <Text style={styles.exerciseMuscle}>{currentExercise.exercise.primary_muscle}</Text>

        {/* AI Suggestion Chip */}
        <View style={styles.suggestionBox}>
          {suggestionLoading ? (
            <ActivityIndicator color="#6C5CE7" size="small" />
          ) : suggestion ? (
            <>
              <Text style={styles.suggestionLabel}>AI Suggests</Text>
              <Text style={[styles.suggestionValue, { color: confidenceColor }]}>
                {suggestion.suggested_weight_kg}kg × {suggestion.suggested_reps} reps{' '}
                <Text style={{ fontSize: 16 }}>{confidenceIcon}</Text>
              </Text>
              {!!suggestion.note && (
                <Text style={styles.suggestionNote}>{suggestion.note}</Text>
              )}
            </>
          ) : (
            <Text style={styles.suggestionPlaceholder}>AI suggestion loading...</Text>
          )}
        </View>

        {/* Rest Timer */}
        {isResting && (
          <View style={styles.restBar}>
            <View style={styles.restBarInner}>
              <Text style={styles.restLabel}>REST</Text>
              <Text style={styles.restTime}>{formatSeconds(restRemaining)}</Text>
              <TouchableOpacity style={styles.skipRestBtn} onPress={skipRest}>
                <Text style={styles.skipRestText}>Skip</Text>
              </TouchableOpacity>
            </View>
            {/* Progress bar */}
            <View style={styles.restProgressTrack}>
              <View
                style={[
                  styles.restProgressFill,
                  { width: `${Math.min(100, restProgress * 100)}%` },
                ]}
              />
            </View>
          </View>
        )}

        {/* Set Log Table */}
        {loggedSets.length > 0 && (
          <View style={styles.setTable}>
            <View style={styles.setTableHeader}>
              <Text style={[styles.setCol, styles.setHeaderText]}>Set</Text>
              <Text style={[styles.setCol, styles.setHeaderText]}>Weight</Text>
              <Text style={[styles.setCol, styles.setHeaderText]}>Reps</Text>
            </View>
            {loggedSets.map((set: ActiveSet, i: number) => (
              <View key={i} style={styles.setRow}>
                <Text style={styles.setCol}>{i + 1}</Text>
                <Text style={[styles.setCol, styles.setValueText]}>{set.weight} kg</Text>
                <Text style={[styles.setCol, styles.setValueText]}>{set.reps}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Current Set */}
        <View style={styles.currentSetBox}>
          <Text style={styles.currentSetLabel}>
            Set {currentSetIndex + 1} of {currentExercise.targetSets}
          </Text>

          {/* Rep timer */}
          <View style={styles.repTimerRow}>
            <Text style={styles.repTimerLabel}>Rep Timer</Text>
            <Text style={styles.repTimerValue}>{formatSeconds(repElapsed)}</Text>
            <TouchableOpacity
              style={styles.repTimerToggle}
              onPress={repStartedAtMs ? stopRepTimer : startRepTimer}
            >
              <Text style={styles.repTimerToggleText}>
                {repStartedAtMs ? 'Stop' : 'Start'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Weight Spinner */}
          <View style={styles.spinnerSection}>
            <Text style={styles.spinnerLabel}>WEIGHT (kg)</Text>
            <View style={styles.spinner}>
              <TouchableOpacity
                style={styles.spinnerBtn}
                onPress={() => setWeight((w) => Math.max(0, +(w - 2.5).toFixed(1)))}
              >
                <Text style={styles.spinnerBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.spinnerValue}>{weight}</Text>
              <TouchableOpacity
                style={styles.spinnerBtn}
                onPress={() => setWeight((w) => +(w + 2.5).toFixed(1))}
              >
                <Text style={styles.spinnerBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Reps Spinner */}
          <View style={styles.spinnerSection}>
            <Text style={styles.spinnerLabel}>REPS</Text>
            <View style={styles.spinner}>
              <TouchableOpacity
                style={styles.spinnerBtn}
                onPress={() => setReps((r) => Math.max(1, r - 1))}
              >
                <Text style={styles.spinnerBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.spinnerValue}>{reps}</Text>
              <TouchableOpacity
                style={styles.spinnerBtn}
                onPress={() => setReps((r) => r + 1)}
              >
                <Text style={styles.spinnerBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* RPE */}
          <View style={styles.rpeSection}>
            <Text style={styles.spinnerLabel}>RPE (optional)</Text>
            <View style={styles.rpeRow}>
              {RPE_OPTIONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.rpeDot, rpe === r && styles.rpeDotActive]}
                  onPress={() => setRpe(rpe === r ? null : r)}
                >
                  <Text style={[styles.rpeDotText, rpe === r && styles.rpeDotTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Log Set Button */}
          <TouchableOpacity
            style={[styles.logSetBtn, logging && styles.logSetBtnDisabled]}
            onPress={handleLogSet}
            disabled={logging || isResting}
          >
            {logging ? (
              <ActivityIndicator color="#0A0A0F" />
            ) : (
              <Text style={styles.logSetBtnText}>LOG SET ✓</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Exercise Navigation */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.navBtn, currentExerciseIndex === 0 && styles.navBtnDisabled]}
            onPress={previousExercise}
            disabled={currentExerciseIndex === 0}
          >
            <Text style={styles.navBtnText}>← Prev</Text>
          </TouchableOpacity>

          <View style={styles.navDots}>
            {exercises.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.navDot,
                  i === currentExerciseIndex && styles.navDotActive,
                ]}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.navBtn,
              currentExerciseIndex === exercises.length - 1 && styles.navBtnDisabled,
            ]}
            onPress={nextExercise}
            disabled={currentExerciseIndex === exercises.length - 1}
          >
            <Text style={styles.navBtnText}>Next →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  centered: { flex: 1, backgroundColor: '#0A0A0F', justifyContent: 'center', alignItems: 'center', gap: 16 },
  noWorkoutText: { color: '#8B8BA3', fontSize: 16 },
  backBtn: {
    backgroundColor: '#6C5CE7', borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  backBtnText: { color: '#FFFFFF', fontWeight: '700' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: '#141420',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  abandonBtn: {
    width: 36, height: 36,
    borderRadius: 10, backgroundColor: '#1C1C2E',
    justifyContent: 'center', alignItems: 'center',
  },
  abandonIcon: { fontSize: 16, color: '#8B8BA3' },
  topCenter: { alignItems: 'center' },
  elapsedTime: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  exerciseCounter: { fontSize: 12, color: '#8B8BA3', marginTop: 2 },
  finishBtn: {
    backgroundColor: 'rgba(108,92,231,0.2)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#6C5CE7',
  },
  finishBtnText: { color: '#6C5CE7', fontWeight: '700', fontSize: 13 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  exerciseName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  exerciseMuscle: {
    fontSize: 14,
    color: '#8B8BA3',
    marginBottom: 16,
    textTransform: 'capitalize',
  },
  suggestionBox: {
    backgroundColor: '#141420',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(108,92,231,0.25)',
    minHeight: 52,
    justifyContent: 'center',
  },
  suggestionLabel: { fontSize: 11, color: '#8B8BA3', fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  suggestionValue: { fontSize: 18, fontWeight: '800' },
  suggestionNote: { fontSize: 12, color: '#8B8BA3', marginTop: 4 },
  suggestionPlaceholder: { color: '#4A4A6A', fontSize: 13 },
  restBar: {
    backgroundColor: '#141420',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,211,61,0.3)',
  },
  restBarInner: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  restLabel: { fontSize: 12, color: '#FFD93D', fontWeight: '700', letterSpacing: 1, flex: 1 },
  restTime: { fontSize: 28, fontWeight: '900', color: '#FFD93D', marginRight: 12 },
  skipRestBtn: {
    backgroundColor: 'rgba(255,211,61,0.15)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#FFD93D',
  },
  skipRestText: { color: '#FFD93D', fontSize: 13, fontWeight: '700' },
  restProgressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  restProgressFill: {
    height: '100%',
    backgroundColor: '#FFD93D',
    borderRadius: 2,
  },
  setTable: {
    backgroundColor: '#141420',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  setTableHeader: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  setHeaderText: { color: '#8B8BA3', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  setRow: { flexDirection: 'row', paddingVertical: 6 },
  setCol: { flex: 1, textAlign: 'center', color: '#8B8BA3', fontSize: 13 },
  setValueText: { color: '#FFFFFF', fontWeight: '600' },
  currentSetBox: {
    backgroundColor: '#141420',
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  currentSetLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6C5CE7',
    marginBottom: 14,
    letterSpacing: 0.5,
  },
  repTimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C2E',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    gap: 10,
  },
  repTimerLabel: { fontSize: 12, color: '#8B8BA3', flex: 1, fontWeight: '600' },
  repTimerValue: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  repTimerToggle: {
    backgroundColor: '#6C5CE7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  repTimerToggleText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  spinnerSection: { marginBottom: 16 },
  spinnerLabel: { fontSize: 11, color: '#8B8BA3', fontWeight: '700', letterSpacing: 1.5, marginBottom: 10 },
  spinner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 0 },
  spinnerBtn: {
    width: 56, height: 56,
    backgroundColor: '#1C1C2E',
    borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  spinnerBtnText: { color: '#FFFFFF', fontSize: 24, fontWeight: '400' },
  spinnerValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    width: 120,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  rpeSection: { marginBottom: 20 },
  rpeRow: { flexDirection: 'row', gap: 8 },
  rpeDot: {
    flex: 1, height: 36,
    borderRadius: 8, backgroundColor: '#1C1C2E',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  rpeDotActive: { backgroundColor: 'rgba(108,92,231,0.3)', borderColor: '#6C5CE7' },
  rpeDotText: { color: '#8B8BA3', fontSize: 13, fontWeight: '700' },
  rpeDotTextActive: { color: '#6C5CE7' },
  logSetBtn: {
    backgroundColor: '#00E676',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  logSetBtnDisabled: { opacity: 0.5 },
  logSetBtnText: { color: '#0A0A0F', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    backgroundColor: '#141420',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  navDots: { flexDirection: 'row', gap: 6 },
  navDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  navDotActive: { backgroundColor: '#6C5CE7', width: 16 },
});
