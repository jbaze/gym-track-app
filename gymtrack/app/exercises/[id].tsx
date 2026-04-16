import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { Exercise, PersonalRecord, SetLog } from '../../src/types';

const EQUIPMENT_COLORS: Record<string, string> = {
  barbell: '#6C5CE7',
  dumbbell: '#00E676',
  machine: '#FFD93D',
  cable: '#00CEC9',
  bodyweight: '#A29BFE',
  other: '#8B8BA3',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeWorkout } = useWorkoutStore();

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [pr, setPr] = useState<PersonalRecord | null>(null);
  const [recentSets, setRecentSets] = useState<SetLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    loadExerciseData(id);
  }, [id]);

  const loadExerciseData = async (exerciseId: string) => {
    const { data: { user } } = await supabase.auth.getUser();

    const [exRes, prRes] = await Promise.all([
      supabase.from('exercises').select('*').eq('id', exerciseId).single(),
      user
        ? supabase
            .from('personal_records')
            .select('*')
            .eq('user_id', user.id)
            .eq('exercise_id', exerciseId)
            .order('one_rep_max', { ascending: false })
            .limit(1)
            .single()
        : Promise.resolve({ data: null, error: null }),
    ]);

    setExercise(exRes.data);
    setPr(prRes.data);

    // Get recent sets via session_exercises join
    if (user) {
      const { data: seData } = await supabase
        .from('session_exercises')
        .select('id')
        .eq('exercise_id', exerciseId);

      if (seData && seData.length > 0) {
        const seIds = seData.map((se: { id: string }) => se.id);
        const { data: setsData } = await supabase
          .from('set_logs')
          .select('*')
          .in('session_exercise_id', seIds)
          .eq('user_id', user.id)
          .order('logged_at', { ascending: false })
          .limit(5);

        setRecentSets(setsData ?? []);
      }
    }

    setLoading(false);
  };

  const handleAddToWorkout = () => {
    if (!activeWorkout || !exercise) return;
    // Navigate back to active workout — user adds via exercises screen instead
    Alert.alert(
      'Add to Workout',
      'To add an exercise to an active workout, please use the exercise selection screen at the start of your next workout.',
      [{ text: 'OK' }]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#6C5CE7" size="large" />
      </View>
    );
  }

  if (!exercise) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Exercise not found.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const equipColor = EQUIPMENT_COLORS[exercise.equipment] ?? '#8B8BA3';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {exercise.name}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Exercise Name & Badges */}
        <Text style={styles.exerciseName}>{exercise.name}</Text>

        <View style={styles.badgesRow}>
          <View style={styles.muscleBadge}>
            <Text style={styles.muscleBadgeText}>{exercise.primary_muscle}</Text>
          </View>
          <View style={[styles.equipBadge, { backgroundColor: equipColor + '22' }]}>
            <Text style={[styles.equipBadgeText, { color: equipColor }]}>
              {exercise.equipment}
            </Text>
          </View>
        </View>

        {exercise.secondary_muscles && exercise.secondary_muscles.length > 0 && (
          <View style={styles.secondaryRow}>
            <Text style={styles.secondaryLabel}>Secondary: </Text>
            <Text style={styles.secondaryMuscles}>
              {exercise.secondary_muscles.join(', ')}
            </Text>
          </View>
        )}

        {/* Description */}
        {exercise.description && (
          <View style={styles.descCard}>
            <Text style={styles.descTitle}>About</Text>
            <Text style={styles.descText}>{exercise.description}</Text>
          </View>
        )}

        {/* Personal Record */}
        <View style={styles.prCard}>
          <Text style={styles.sectionTitle}>Personal Record</Text>
          {pr ? (
            <View style={styles.prContent}>
              <View style={styles.prStat}>
                <Text style={styles.prValue}>{pr.weight_kg} kg</Text>
                <Text style={styles.prLabel}>Best Weight</Text>
              </View>
              <View style={styles.prDivider} />
              <View style={styles.prStat}>
                <Text style={styles.prValue}>{pr.reps}</Text>
                <Text style={styles.prLabel}>Reps</Text>
              </View>
              <View style={styles.prDivider} />
              <View style={styles.prStat}>
                <Text style={[styles.prValue, { color: '#FFD93D' }]}>
                  {pr.one_rep_max.toFixed(1)}
                </Text>
                <Text style={styles.prLabel}>Est. 1RM</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noPR}>No PR recorded yet. Start lifting!</Text>
          )}
          {pr && (
            <Text style={styles.prDate}>Achieved {formatDate(pr.achieved_at)}</Text>
          )}
        </View>

        {/* Recent Sets */}
        <Text style={styles.sectionTitle}>Recent Performance</Text>
        {recentSets.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No sets logged yet.</Text>
          </View>
        ) : (
          <View style={styles.setsCard}>
            <View style={styles.setsHeader}>
              <Text style={styles.setsHeaderCell}>Date</Text>
              <Text style={styles.setsHeaderCell}>Weight</Text>
              <Text style={styles.setsHeaderCell}>Reps</Text>
              <Text style={styles.setsHeaderCell}>Set #</Text>
            </View>
            {recentSets.map((set) => (
              <View key={set.id} style={styles.setRow}>
                <Text style={styles.setCell}>{formatDate(set.logged_at)}</Text>
                <Text style={[styles.setCell, { color: '#FFFFFF', fontWeight: '600' }]}>
                  {set.weight_kg} kg
                </Text>
                <Text style={[styles.setCell, { color: '#FFFFFF', fontWeight: '600' }]}>
                  {set.reps}
                </Text>
                <Text style={styles.setCell}>{set.set_number}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Add to Workout button (if active workout) */}
        {activeWorkout && (
          <TouchableOpacity style={styles.addToWorkoutBtn} onPress={handleAddToWorkout}>
            <Text style={styles.addToWorkoutText}>+ Add to Workout</Text>
          </TouchableOpacity>
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
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', flex: 1, textAlign: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 },
  exerciseName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 14,
  },
  badgesRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  muscleBadge: {
    backgroundColor: 'rgba(108,92,231,0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  muscleBadgeText: { color: '#6C5CE7', fontSize: 13, fontWeight: '700' },
  equipBadge: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  equipBadgeText: { fontSize: 13, fontWeight: '700' },
  secondaryRow: { flexDirection: 'row', marginBottom: 20 },
  secondaryLabel: { fontSize: 13, color: '#8B8BA3', fontWeight: '600' },
  secondaryMuscles: { fontSize: 13, color: '#FFFFFF', flex: 1 },
  descCard: {
    backgroundColor: '#141420',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  descTitle: { fontSize: 14, fontWeight: '700', color: '#8B8BA3', marginBottom: 8, letterSpacing: 0.5 },
  descText: { fontSize: 14, color: '#FFFFFF', lineHeight: 22 },
  prCard: {
    backgroundColor: '#141420',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,211,61,0.2)',
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 14 },
  prContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  prStat: { flex: 1, alignItems: 'center' },
  prValue: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', marginBottom: 4 },
  prLabel: { fontSize: 12, color: '#8B8BA3', fontWeight: '600' },
  prDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.08)' },
  prDate: { fontSize: 12, color: '#8B8BA3', textAlign: 'center', marginTop: 4 },
  noPR: { color: '#8B8BA3', fontSize: 14, textAlign: 'center', paddingVertical: 12 },
  emptyCard: {
    backgroundColor: '#141420',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 24,
  },
  emptyText: { color: '#8B8BA3', fontSize: 14 },
  setsCard: {
    backgroundColor: '#141420',
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  setsHeader: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  setsHeaderCell: {
    flex: 1,
    fontSize: 11,
    color: '#8B8BA3',
    fontWeight: '700',
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  setCell: {
    flex: 1,
    fontSize: 13,
    color: '#8B8BA3',
    textAlign: 'center',
  },
  addToWorkoutBtn: {
    backgroundColor: 'rgba(108,92,231,0.15)',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#6C5CE7',
  },
  addToWorkoutText: { color: '#6C5CE7', fontSize: 15, fontWeight: '700' },
});
