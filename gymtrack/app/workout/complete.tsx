import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { formatWorkoutDuration, getWorkoutElapsed } from '../../src/lib/timers';
import { ActiveSet } from '../../src/types';

const MOOD_EMOJIS = ['😞', '😐', '🙂', '😄', '🔥'];

export default function WorkoutCompleteScreen() {
  const { activeWorkout, completeWorkout, abandonWorkout } = useWorkoutStore();
  const [notes, setNotes] = useState('');
  const [mood, setMood] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  if (!activeWorkout) {
    return (
      <View style={styles.centered}>
        <Text style={styles.noWorkoutText}>No workout to complete.</Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/home')}>
          <Text style={styles.homeLink}>Go Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const elapsedSeconds = getWorkoutElapsed(activeWorkout.startedAtMs);
  const { exercises } = activeWorkout;

  // Compute stats
  const allSets = exercises.flatMap((ex) => ex.sets.filter((s: ActiveSet) => s.logged));
  const totalSets = allSets.length;
  const totalVolume = allSets.reduce((sum, s) => sum + s.weight * s.reps, 0);

  // PRs (simple check — real PR detection is server-side)
  const prCount = 0; // Server will compute

  const handleSave = async () => {
    if (!mood) {
      Alert.alert('Rate your session', 'How did the workout feel?');
      return;
    }
    setSaving(true);
    await completeWorkout(notes.trim() || undefined, mood);
    setSaving(false);
    router.replace('/(tabs)/home');
  };

  const handleDiscard = () => {
    Alert.alert('Discard Workout', 'This will discard all workout data. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: async () => {
          await abandonWorkout();
          router.replace('/(tabs)/home');
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View style={[styles.heroSection, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.heroEmoji}>🎉</Text>
        <Text style={styles.heroTitle}>Workout Complete!</Text>
        <Text style={styles.heroSub}>
          {activeWorkout.workoutType} · {formatWorkoutDuration(elapsedSeconds)}
        </Text>
      </Animated.View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{formatWorkoutDuration(elapsedSeconds)}</Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalVolume.toFixed(0)} kg</Text>
          <Text style={styles.statLabel}>Volume</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalSets}</Text>
          <Text style={styles.statLabel}>Sets</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#FFD93D' }]}>{prCount}</Text>
          <Text style={styles.statLabel}>🏆 PRs</Text>
        </View>
      </View>

      {/* Exercise Summary */}
      <Text style={styles.sectionTitle}>Exercises</Text>
      {exercises.map((ex, i) => {
        const logged = ex.sets.filter((s: ActiveSet) => s.logged);
        if (logged.length === 0) return null;
        return (
          <View key={i} style={styles.exCard}>
            <Text style={styles.exName}>{ex.exercise.name}</Text>
            <View style={styles.exSetsRow}>
              {logged.map((set: ActiveSet, j: number) => (
                <View key={j} style={styles.exSetBadge}>
                  <Text style={styles.exSetText}>{set.weight}kg × {set.reps}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}

      {/* Mood Rating */}
      <Text style={styles.sectionTitle}>How did it feel?</Text>
      <View style={styles.moodRow}>
        {MOOD_EMOJIS.map((emoji, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.moodBtn, mood === i + 1 && styles.moodBtnActive]}
            onPress={() => setMood(i + 1)}
          >
            <Text style={styles.moodEmoji}>{emoji}</Text>
            {mood === i + 1 && <View style={styles.moodDot} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Notes */}
      <Text style={styles.sectionTitle}>Notes (optional)</Text>
      <TextInput
        style={styles.notesInput}
        placeholder="How did the workout go? Any PRs? Notes..."
        placeholderTextColor="#4A4A6A"
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, saving && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#0A0A0F" />
        ) : (
          <Text style={styles.saveButtonText}>SAVE WORKOUT</Text>
        )}
      </TouchableOpacity>

      {/* Discard */}
      <TouchableOpacity style={styles.discardButton} onPress={handleDiscard}>
        <Text style={styles.discardButtonText}>Discard</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  centered: {
    flex: 1, backgroundColor: '#0A0A0F',
    justifyContent: 'center', alignItems: 'center', gap: 16,
  },
  noWorkoutText: { color: '#8B8BA3', fontSize: 16 },
  homeLink: { color: '#6C5CE7', fontSize: 15, fontWeight: '700' },
  content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 48 },
  heroSection: { alignItems: 'center', marginBottom: 32 },
  heroEmoji: { fontSize: 64, marginBottom: 12 },
  heroTitle: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', marginBottom: 8 },
  heroSub: { fontSize: 16, color: '#8B8BA3' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#141420',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statValue: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#8B8BA3', fontWeight: '600' },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  exCard: {
    backgroundColor: '#141420',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  exName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  exSetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  exSetBadge: {
    backgroundColor: 'rgba(108,92,231,0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  exSetText: { color: '#6C5CE7', fontSize: 12, fontWeight: '600' },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
    backgroundColor: '#141420',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  moodBtn: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
  },
  moodBtnActive: {
    backgroundColor: 'rgba(108,92,231,0.2)',
  },
  moodEmoji: { fontSize: 32 },
  moodDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#6C5CE7',
    marginTop: 4,
  },
  notesInput: {
    backgroundColor: '#141420',
    borderRadius: 14,
    padding: 16,
    fontSize: 14,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    minHeight: 100,
    marginBottom: 24,
  },
  saveButton: {
    backgroundColor: '#00E676',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#0A0A0F', fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  discardButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  discardButtonText: { color: '#4A4A6A', fontSize: 14, fontWeight: '600' },
});
