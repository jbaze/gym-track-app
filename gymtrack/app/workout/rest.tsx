import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { formatSeconds, getRestRemaining } from '../../src/lib/timers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CIRCLE_SIZE = 240;
const STROKE_WIDTH = 12;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH * 2) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function RestScreen() {
  const { restEndAtMs, activeWorkout, skipRest, onRestComplete } = useWorkoutStore();
  const [, forceUpdate] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasNavigated = useRef(false);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      forceUpdate((n) => n + 1);

      if (restEndAtMs && Date.now() >= restEndAtMs && !hasNavigated.current) {
        hasNavigated.current = true;
        onRestComplete();
        router.back();
      }
    }, 250);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [restEndAtMs]);

  const handleSkip = async () => {
    await skipRest();
    router.back();
  };

  if (!restEndAtMs || !activeWorkout) {
    return (
      <View style={styles.centered}>
        <Text style={styles.noTimerText}>No active rest timer.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const remaining = getRestRemaining(restEndAtMs);
  const totalSeconds = Math.ceil((restEndAtMs - activeWorkout.startedAtMs) / 1000);
  // Total rest duration: use difference between endAt and when timer was set
  // We approximate total as remaining when fully fresh. We store totalSeconds in the timer state.
  // For progress, use remaining vs a fixed total derived from the store
  const storedTotal = useWorkoutStore.getState().activeWorkout
    ? Math.max(remaining, 1)
    : 90;

  // Try to get total from rest timer if stored
  const progressFraction = Math.max(0, Math.min(1, remaining / Math.max(remaining, 90)));
  const strokeDashoffset = CIRCUMFERENCE * (1 - progressFraction);

  const { exercises, currentExerciseIndex } = activeWorkout;
  const currentExercise = exercises[currentExerciseIndex];
  const nextExercise = exercises[currentExerciseIndex + 1];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>REST</Text>
        <Text style={styles.headerSubtitle}>Recover before your next set</Text>
      </View>

      {/* Current exercise reminder */}
      <View style={styles.exerciseReminder}>
        <Text style={styles.reminderLabel}>CURRENT EXERCISE</Text>
        <Text style={styles.reminderExercise}>{currentExercise?.exercise.name}</Text>
      </View>

      {/* Circular countdown */}
      <View style={styles.circleContainer}>
        <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
          {/* Background track */}
          <Circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={RADIUS}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />
          {/* Progress arc */}
          <Circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={RADIUS}
            stroke={remaining <= 10 ? '#FF5050' : '#FFD93D'}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
          />
        </Svg>

        {/* Center content */}
        <View style={styles.circleCenter}>
          <Text style={[styles.countdown, remaining <= 10 && { color: '#FF5050' }]}>
            {formatSeconds(remaining)}
          </Text>
          <Text style={styles.countdownLabel}>remaining</Text>
        </View>
      </View>

      {/* Next exercise preview */}
      {nextExercise && (
        <View style={styles.nextBox}>
          <Text style={styles.nextLabel}>NEXT UP</Text>
          <Text style={styles.nextExercise}>{nextExercise.exercise.name}</Text>
          <Text style={styles.nextMuscle}>{nextExercise.exercise.primary_muscle}</Text>
        </View>
      )}

      {/* Skip button */}
      <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
        <Text style={styles.skipBtnText}>Skip Rest</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backToWorkout} onPress={() => router.back()}>
        <Text style={styles.backToWorkoutText}>← Back to Workout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  centered: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  noTimerText: { color: '#8B8BA3', fontSize: 16 },
  backLink: { color: '#6C5CE7', fontSize: 15, fontWeight: '700' },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFD93D',
    letterSpacing: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8B8BA3',
    marginTop: 4,
  },
  exerciseReminder: {
    backgroundColor: '#141420',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  reminderLabel: { fontSize: 10, color: '#8B8BA3', fontWeight: '700', letterSpacing: 1.5, marginBottom: 4 },
  reminderExercise: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  circleContainer: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  circleCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  countdown: {
    fontSize: 52,
    fontWeight: '900',
    color: '#FFD93D',
    fontVariant: ['tabular-nums'],
  },
  countdownLabel: {
    fontSize: 13,
    color: '#8B8BA3',
    marginTop: 4,
  },
  nextBox: {
    backgroundColor: '#141420',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.15)',
  },
  nextLabel: { fontSize: 10, color: '#00E676', fontWeight: '700', letterSpacing: 1.5, marginBottom: 4 },
  nextExercise: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  nextMuscle: { fontSize: 13, color: '#8B8BA3', textTransform: 'capitalize' },
  skipBtn: {
    backgroundColor: 'rgba(255,211,61,0.15)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderWidth: 1.5,
    borderColor: '#FFD93D',
    marginBottom: 16,
  },
  skipBtnText: {
    color: '#FFD93D',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
  },
  backToWorkout: { padding: 12 },
  backToWorkoutText: { color: '#8B8BA3', fontSize: 14 },
});
