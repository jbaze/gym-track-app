import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { Exercise, ActiveExercise } from '../../src/types';

const WORKOUT_TEMPLATES: Record<string, string[]> = {
  Push: ['Bench Press', 'Incline DB Press', 'Cable Fly', 'OHP', 'Lateral Raise', 'Tricep Pushdown', 'Overhead Extension'],
  Pull: ['Deadlift', 'Barbell Row', 'Lat Pulldown', 'Seated Cable Row', 'Face Pulls', 'Barbell Curl', 'Hammer Curl'],
  Legs: ['Back Squat', 'Romanian DL', 'Leg Press', 'Leg Extension', 'Lying Leg Curl', 'Hip Thrust', 'Standing Calf Raise'],
  'Full Body': ['Back Squat', 'Bench Press', 'Barbell Row', 'OHP', 'Romanian DL', 'Barbell Curl', 'Plank'],
  Upper: ['Bench Press', 'Barbell Row', 'DB Shoulder Press', 'Lat Pulldown', 'Cable Fly', 'Barbell Curl', 'Tricep Pushdown'],
  Lower: ['Back Squat', 'Romanian DL', 'Leg Press', 'Bulgarian Split Squat', 'Lying Leg Curl', 'Hip Thrust', 'Calf Raise'],
  Custom: [],
};

const EQUIPMENT_COLORS: Record<string, string> = {
  barbell: '#6C5CE7',
  dumbbell: '#00E676',
  machine: '#FFD93D',
  cable: '#00CEC9',
  bodyweight: '#A29BFE',
  other: '#8B8BA3',
};

interface ExerciseConfig extends Exercise {
  selected: boolean;
  targetSets: number;
  targetReps: number;
}

function makeFallbackExercise(name: string): Exercise {
  return {
    id: `fallback-${name.replace(/\s+/g, '-').toLowerCase()}`,
    name,
    primary_muscle: 'General',
    secondary_muscles: [],
    equipment: 'other',
    description: '',
  };
}

export default function ExercisesScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const startWorkout = useWorkoutStore((s) => s.startWorkout);

  const [exercises, setExercises] = useState<ExerciseConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Exercise[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadTemplateExercises();
  }, [type]);

  const loadTemplateExercises = async () => {
    const templateNames = WORKOUT_TEMPLATES[type ?? 'Custom'] ?? [];
    if (templateNames.length === 0) {
      setExercises([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('exercises')
      .select('*')
      .in('name', templateNames);

    const dbMap: Record<string, Exercise> = {};
    (data ?? []).forEach((ex: Exercise) => {
      dbMap[ex.name] = ex;
    });

    const config: ExerciseConfig[] = templateNames.map((name) => ({
      ...(dbMap[name] ?? makeFallbackExercise(name)),
      selected: true,
      targetSets: 4,
      targetReps: 8,
    }));

    setExercises(config);
    setLoading(false);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const { data } = await supabase
      .from('exercises')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(20);
    setSearchResults(data ?? []);
    setSearching(false);
  };

  const addExercise = (ex: Exercise) => {
    setExercises((prev) => {
      if (prev.find((e) => e.id === ex.id)) return prev;
      return [...prev, { ...ex, selected: true, targetSets: 4, targetReps: 8 }];
    });
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const toggleExercise = (id: string) => {
    setExercises((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, selected: !ex.selected } : ex))
    );
  };

  const updateSets = (id: string, delta: number) => {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === id
          ? { ...ex, targetSets: Math.max(1, Math.min(10, ex.targetSets + delta)) }
          : ex
      )
    );
  };

  const updateReps = (id: string, delta: number) => {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === id
          ? { ...ex, targetReps: Math.max(1, Math.min(30, ex.targetReps + delta)) }
          : ex
      )
    );
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setExercises((prev) => {
      const arr = [...prev];
      [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
      return arr;
    });
  };

  const moveDown = (index: number) => {
    setExercises((prev) => {
      if (index === prev.length - 1) return prev;
      const arr = [...prev];
      [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
      return arr;
    });
  };

  const handleStartWorkout = async () => {
    const selected = exercises.filter((ex) => ex.selected);
    if (selected.length === 0) {
      Alert.alert('No Exercises', 'Select at least one exercise to start.');
      return;
    }

    setStarting(true);

    const activeExercises: ActiveExercise[] = selected.map((ex) => ({
      exercise: {
        id: ex.id,
        name: ex.name,
        primary_muscle: ex.primary_muscle,
        secondary_muscles: ex.secondary_muscles,
        equipment: ex.equipment,
        description: ex.description,
      },
      targetSets: ex.targetSets,
      targetReps: ex.targetReps,
      sets: Array.from({ length: ex.targetSets }, () => ({
        weight: 0,
        reps: ex.targetReps,
        duration_seconds: 0,
        logged: false,
      })),
    }));

    await startWorkout(type ?? 'Custom', activeExercises);
    setStarting(false);
    router.replace('/workout/active');
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#6C5CE7" size="large" />
      </View>
    );
  }

  const selectedCount = exercises.filter((ex) => ex.selected).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>{type} Day</Text>
          <Text style={styles.headerSub}>{selectedCount} exercises selected</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowSearch(true)}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Exercise List */}
      <FlatList
        data={exercises}
        keyExtractor={(item, i) => `${item.id}-${i}`}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const badgeColor = EQUIPMENT_COLORS[item.equipment] ?? '#8B8BA3';
          return (
            <View style={[styles.exCard, !item.selected && styles.exCardDimmed]}>
              {/* Checkbox + Name */}
              <View style={styles.exTop}>
                <TouchableOpacity
                  style={[styles.checkbox, item.selected && styles.checkboxChecked]}
                  onPress={() => toggleExercise(item.id)}
                >
                  {item.selected && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>

                <View style={styles.exInfo}>
                  <Text style={styles.exName}>{item.name}</Text>
                  <View style={styles.exMeta}>
                    <Text style={styles.exMuscle}>{item.primary_muscle}</Text>
                    <View style={[styles.equipBadge, { backgroundColor: badgeColor + '22' }]}>
                      <Text style={[styles.equipText, { color: badgeColor }]}>
                        {item.equipment}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Reorder */}
                <View style={styles.reorderBtns}>
                  <TouchableOpacity
                    style={styles.reorderBtn}
                    onPress={() => moveUp(index)}
                    disabled={index === 0}
                  >
                    <Text style={[styles.reorderIcon, index === 0 && { opacity: 0.2 }]}>↑</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.reorderBtn}
                    onPress={() => moveDown(index)}
                    disabled={index === exercises.length - 1}
                  >
                    <Text style={[styles.reorderIcon, index === exercises.length - 1 && { opacity: 0.2 }]}>↓</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Sets / Reps */}
              {item.selected && (
                <View style={styles.setsRepsRow}>
                  <View style={styles.counterGroup}>
                    <Text style={styles.counterLabel}>SETS</Text>
                    <View style={styles.counter}>
                      <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => updateSets(item.id, -1)}
                      >
                        <Text style={styles.counterBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.counterValue}>{item.targetSets}</Text>
                      <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => updateSets(item.id, 1)}
                      >
                        <Text style={styles.counterBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.counterDivider} />

                  <View style={styles.counterGroup}>
                    <Text style={styles.counterLabel}>REPS TARGET</Text>
                    <View style={styles.counter}>
                      <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => updateReps(item.id, -1)}
                      >
                        <Text style={styles.counterBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.counterValue}>{item.targetReps}</Text>
                      <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => updateReps(item.id, 1)}
                      >
                        <Text style={styles.counterBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </View>
          );
        }}
        ListFooterComponent={<View style={{ height: 120 }} />}
      />

      {/* Start Button */}
      <View style={styles.startContainer}>
        <TouchableOpacity
          style={[styles.startButton, starting && styles.buttonDisabled]}
          onPress={handleStartWorkout}
          disabled={starting}
        >
          {starting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.startButtonText}>START WORKOUT ({selectedCount})</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Search Modal */}
      <Modal visible={showSearch} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Exercise</Text>
              <TouchableOpacity onPress={() => setShowSearch(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Search exercises..."
              placeholderTextColor="#4A4A6A"
              value={searchQuery}
              onChangeText={handleSearch}
              autoFocus
            />

            {searching ? (
              <ActivityIndicator color="#6C5CE7" style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.searchResultItem}
                    onPress={() => addExercise(item)}
                  >
                    <Text style={styles.searchResultName}>{item.name}</Text>
                    <Text style={styles.searchResultMuscle}>{item.primary_muscle}</Text>
                  </TouchableOpacity>
                )}
                style={styles.searchResults}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  centered: { flex: 1, backgroundColor: '#0A0A0F', justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
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
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  headerSub: { fontSize: 12, color: '#8B8BA3', marginTop: 2 },
  addBtn: {
    backgroundColor: 'rgba(108,92,231,0.2)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#6C5CE7',
  },
  addBtnText: { color: '#6C5CE7', fontSize: 13, fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingTop: 16 },
  exCard: {
    backgroundColor: '#141420',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  exCardDimmed: { opacity: 0.45 },
  exTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: '#4A4A6A',
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: '#6C5CE7', borderColor: '#6C5CE7' },
  checkmark: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  exInfo: { flex: 1 },
  exName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  exMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exMuscle: { fontSize: 12, color: '#8B8BA3' },
  equipBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  equipText: { fontSize: 11, fontWeight: '700' },
  reorderBtns: { gap: 2 },
  reorderBtn: { padding: 4 },
  reorderIcon: { fontSize: 16, color: '#8B8BA3', fontWeight: '700' },
  setsRepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  counterGroup: { flex: 1, alignItems: 'center' },
  counterLabel: { fontSize: 10, color: '#8B8BA3', fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  counterBtn: {
    width: 32, height: 32,
    backgroundColor: '#1C1C2E', borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  counterBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  counterValue: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', minWidth: 28, textAlign: 'center' },
  counterDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.08)' },
  startContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#0A0A0F',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  startButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  startButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: 1.5 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#141420',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  modalClose: { fontSize: 20, color: '#8B8BA3' },
  searchInput: {
    backgroundColor: '#1C1C2E',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  searchResults: { maxHeight: 400 },
  searchResultItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  searchResultName: { fontSize: 15, color: '#FFFFFF', fontWeight: '600' },
  searchResultMuscle: { fontSize: 13, color: '#8B8BA3', marginTop: 2 },
});
