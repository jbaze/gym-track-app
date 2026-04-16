import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { Exercise } from '../../src/types';

const MUSCLE_GROUPS = [
  'All', 'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core',
];

const EQUIPMENT_TYPES = [
  'All', 'barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'other',
];

const MUSCLE_COLORS: Record<string, string> = {
  Chest: '#FF5050',
  Back: '#6C5CE7',
  Shoulders: '#00CEC9',
  Biceps: '#00E676',
  Triceps: '#A29BFE',
  Quads: '#FFD93D',
  Hamstrings: '#FDCB6E',
  Glutes: '#E17055',
  Calves: '#74B9FF',
  Core: '#55EFC4',
};

function getMuscleColor(muscle: string): string {
  for (const [key, color] of Object.entries(MUSCLE_COLORS)) {
    if (muscle.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return '#8B8BA3';
}

export default function ExerciseLibraryScreen() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('All');
  const [selectedEquipment, setSelectedEquipment] = useState('All');

  const loadExercises = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('exercises').select('*').order('name', { ascending: true });

    if (selectedMuscle !== 'All') {
      query = query.ilike('primary_muscle', `%${selectedMuscle}%`);
    }
    if (selectedEquipment !== 'All') {
      query = query.eq('equipment', selectedEquipment);
    }
    if (searchQuery.trim()) {
      query = query.ilike('name', `%${searchQuery.trim()}%`);
    }

    const { data } = await query.limit(100);
    setExercises(data ?? []);
    setLoading(false);
  }, [searchQuery, selectedMuscle, selectedEquipment]);

  useEffect(() => {
    const timer = setTimeout(loadExercises, 300);
    return () => clearTimeout(timer);
  }, [loadExercises]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Exercise Library</Text>
        <Text style={styles.headerCount}>{exercises.length} exercises</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises..."
          placeholderTextColor="#4A4A6A"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {!!searchQuery && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Muscle Group Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {MUSCLE_GROUPS.map((muscle) => (
          <TouchableOpacity
            key={muscle}
            style={[
              styles.filterChip,
              selectedMuscle === muscle && styles.filterChipActive,
            ]}
            onPress={() => setSelectedMuscle(muscle)}
          >
            <Text style={[
              styles.filterChipText,
              selectedMuscle === muscle && styles.filterChipTextActive,
            ]}>
              {muscle}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Equipment Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {EQUIPMENT_TYPES.map((equip) => (
          <TouchableOpacity
            key={equip}
            style={[
              styles.filterChip,
              styles.equipChip,
              selectedEquipment === equip && styles.equipChipActive,
            ]}
            onPress={() => setSelectedEquipment(equip)}
          >
            <Text style={[
              styles.filterChipText,
              selectedEquipment === equip && styles.equipChipTextActive,
            ]}>
              {equip}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Exercise List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#6C5CE7" size="large" />
        </View>
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>No exercises found</Text>
              <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
            </View>
          }
          renderItem={({ item }) => {
            const muscleColor = getMuscleColor(item.primary_muscle);
            return (
              <TouchableOpacity
                style={styles.exerciseItem}
                onPress={() => router.push(`/exercises/${item.id}` as any)}
                activeOpacity={0.7}
              >
                <View style={styles.exerciseLeft}>
                  <View style={[styles.muscleIndicator, { backgroundColor: muscleColor }]} />
                </View>

                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{item.name}</Text>
                  <View style={styles.exerciseMeta}>
                    <View style={[styles.muscleBadge, { backgroundColor: muscleColor + '22' }]}>
                      <Text style={[styles.muscleBadgeText, { color: muscleColor }]}>
                        {item.primary_muscle}
                      </Text>
                    </View>
                    <View style={styles.equipmentBadge}>
                      <Text style={styles.equipmentText}>{item.equipment}</Text>
                    </View>
                  </View>
                  {item.description && (
                    <Text style={styles.exerciseDesc} numberOfLines={1}>
                      {item.description}
                    </Text>
                  )}
                </View>

                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  headerCount: { fontSize: 13, color: '#8B8BA3', fontWeight: '600' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141420',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    paddingVertical: 12,
  },
  clearIcon: { fontSize: 14, color: '#8B8BA3', padding: 4 },
  filterScroll: { maxHeight: 48, marginTop: 10 },
  filterContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#141420',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(108,92,231,0.2)',
    borderColor: '#6C5CE7',
  },
  filterChipText: { fontSize: 12, color: '#8B8BA3', fontWeight: '600' },
  filterChipTextActive: { color: '#6C5CE7' },
  equipChip: { borderColor: 'rgba(255,211,61,0.2)' },
  equipChipActive: {
    backgroundColor: 'rgba(255,211,61,0.15)',
    borderColor: '#FFD93D',
  },
  equipChipTextActive: { color: '#FFD93D' },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  emptySubtext: { fontSize: 14, color: '#8B8BA3' },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141420',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  exerciseLeft: { marginRight: 12 },
  muscleIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 6 },
  exerciseMeta: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  muscleBadge: {
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  muscleBadgeText: { fontSize: 11, fontWeight: '700' },
  equipmentBadge: {
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: '#1C1C2E',
  },
  equipmentText: { fontSize: 11, color: '#8B8BA3', fontWeight: '600' },
  exerciseDesc: { fontSize: 12, color: '#8B8BA3' },
  chevron: { fontSize: 22, color: '#4A4A6A', marginLeft: 8 },
});
