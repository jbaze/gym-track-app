import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { WorkoutSession, SessionExercise, SetLog } from '../../src/types';
import { formatWorkoutDuration } from '../../src/lib/timers';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

interface ExerciseWithSets extends SessionExercise {
  sets: SetLog[];
}

export default function HistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [exercisesWithSets, setExercisesWithSets] = useState<ExerciseWithSets[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    loadSessionData(id);
  }, [id]);

  const loadSessionData = async (sessionId: string) => {
    const [sessionRes, exercisesRes] = await Promise.all([
      supabase.from('workout_sessions').select('*').eq('id', sessionId).single(),
      supabase
        .from('session_exercises')
        .select('*')
        .eq('session_id', sessionId)
        .order('position', { ascending: true }),
    ]);

    setSession(sessionRes.data);

    const exercises: SessionExercise[] = exercisesRes.data ?? [];
    const exerciseIds = exercises.map((ex) => ex.id);

    if (exerciseIds.length > 0) {
      const { data: setsData } = await supabase
        .from('set_logs')
        .select('*')
        .in('session_exercise_id', exerciseIds)
        .order('set_number', { ascending: true });

      const setsMap: Record<string, SetLog[]> = {};
      (setsData ?? []).forEach((set: SetLog) => {
        if (!setsMap[set.session_exercise_id]) setsMap[set.session_exercise_id] = [];
        setsMap[set.session_exercise_id].push(set);
      });

      setExercisesWithSets(
        exercises.map((ex) => ({ ...ex, sets: setsMap[ex.id] ?? [] }))
      );
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#6C5CE7" size="large" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Session not found.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const MOOD_EMOJIS = ['', '😞', '😐', '🙂', '😄', '🔥'];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{session.workout_type} Workout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Session Meta */}
        <Text style={styles.sessionDate}>{formatDate(session.started_at)}</Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {session.duration_seconds
                ? formatWorkoutDuration(session.duration_seconds)
                : '—'}
            </Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {session.total_volume_kg
                ? `${session.total_volume_kg.toFixed(0)} kg`
                : '—'}
            </Text>
            <Text style={styles.statLabel}>Volume</Text>
          </View>
          {session.mood && (
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{MOOD_EMOJIS[session.mood] ?? '—'}</Text>
              <Text style={styles.statLabel}>Mood</Text>
            </View>
          )}
        </View>

        {/* Notes */}
        {session.notes && (
          <View style={styles.notesCard}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{session.notes}</Text>
          </View>
        )}

        {/* Exercises */}
        <Text style={styles.sectionTitle}>Exercises</Text>
        {exercisesWithSets.length === 0 ? (
          <Text style={styles.emptyText}>No exercise data recorded.</Text>
        ) : (
          exercisesWithSets.map((ex) => (
            <View key={ex.id} style={styles.exerciseCard}>
              <Text style={styles.exerciseName}>{ex.exercise_name}</Text>

              {ex.sets.length === 0 ? (
                <Text style={styles.noSetsText}>No sets logged</Text>
              ) : (
                <>
                  <View style={styles.setsHeader}>
                    <Text style={[styles.setHeaderCell, { flex: 1 }]}>Set</Text>
                    <Text style={styles.setHeaderCell}>Weight</Text>
                    <Text style={styles.setHeaderCell}>Reps</Text>
                    {ex.sets.some((s) => s.rpe) && (
                      <Text style={styles.setHeaderCell}>RPE</Text>
                    )}
                    {ex.sets.some((s) => s.is_pr) && (
                      <Text style={styles.setHeaderCell}>PR</Text>
                    )}
                  </View>
                  {ex.sets.map((set) => (
                    <View key={set.id} style={styles.setRow}>
                      <Text style={[styles.setCell, { flex: 1 }]}>{set.set_number}</Text>
                      <Text style={[styles.setCell, styles.setCellValue]}>{set.weight_kg} kg</Text>
                      <Text style={[styles.setCell, styles.setCellValue]}>{set.reps}</Text>
                      {ex.sets.some((s) => s.rpe) && (
                        <Text style={styles.setCell}>{set.rpe ?? '—'}</Text>
                      )}
                      {ex.sets.some((s) => s.is_pr) && (
                        <Text style={styles.setCell}>{set.is_pr ? '🏆' : ''}</Text>
                      )}
                    </View>
                  ))}

                  {/* Volume for this exercise */}
                  <View style={styles.exerciseVolRow}>
                    <Text style={styles.exerciseVolLabel}>Total volume:</Text>
                    <Text style={styles.exerciseVolValue}>
                      {ex.sets.reduce((sum, s) => sum + s.weight_kg * s.reps, 0).toFixed(0)} kg
                    </Text>
                  </View>
                </>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  centered: {
    flex: 1, backgroundColor: '#0A0A0F',
    justifyContent: 'center', alignItems: 'center', gap: 16,
  },
  errorText: { color: '#8B8BA3', fontSize: 16 },
  backLink: { color: '#6C5CE7', fontSize: 15, fontWeight: '700' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: {
    width: 40, height: 40,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#141420', borderRadius: 12,
  },
  backIcon: { fontSize: 20, color: '#FFFFFF' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48 },
  sessionDate: { fontSize: 16, color: '#8B8BA3', marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: '#141420',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statValue: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#8B8BA3', fontWeight: '600' },
  notesCard: {
    backgroundColor: '#141420',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  notesLabel: { fontSize: 12, color: '#8B8BA3', fontWeight: '700', marginBottom: 6, letterSpacing: 0.5 },
  notesText: { fontSize: 14, color: '#FFFFFF', lineHeight: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },
  emptyText: { color: '#8B8BA3', fontSize: 14 },
  exerciseCard: {
    backgroundColor: '#141420',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  exerciseName: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },
  noSetsText: { color: '#8B8BA3', fontSize: 13 },
  setsHeader: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  setHeaderCell: {
    flex: 1,
    fontSize: 11,
    color: '#8B8BA3',
    fontWeight: '700',
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  setCell: {
    flex: 1,
    fontSize: 13,
    color: '#8B8BA3',
    textAlign: 'center',
  },
  setCellValue: { color: '#FFFFFF', fontWeight: '600' },
  exerciseVolRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  exerciseVolLabel: { fontSize: 12, color: '#8B8BA3' },
  exerciseVolValue: { fontSize: 14, fontWeight: '700', color: '#6C5CE7' },
});
