import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 52) / 2;

interface WorkoutType {
  type: string;
  icon: string;
  color: string;
  duration: string;
  muscles: string;
}

const WORKOUT_TYPES: WorkoutType[] = [
  {
    type: 'Push',
    icon: '💪',
    color: '#6C5CE7',
    duration: '45-60 min',
    muscles: 'Chest, Shoulders, Triceps',
  },
  {
    type: 'Pull',
    icon: '🏋️',
    color: '#00E676',
    duration: '45-60 min',
    muscles: 'Back, Biceps, Rear Delts',
  },
  {
    type: 'Legs',
    icon: '🦵',
    color: '#FFD93D',
    duration: '50-70 min',
    muscles: 'Quads, Hamstrings, Glutes',
  },
  {
    type: 'Full Body',
    icon: '⚡',
    color: '#FF5050',
    duration: '60-75 min',
    muscles: 'All Major Muscles',
  },
  {
    type: 'Upper',
    icon: '🔥',
    color: '#A29BFE',
    duration: '45-60 min',
    muscles: 'Chest, Back, Shoulders, Arms',
  },
  {
    type: 'Lower',
    icon: '🏃',
    color: '#00CEC9',
    duration: '45-60 min',
    muscles: 'Quads, Hamstrings, Calves',
  },
  {
    type: 'Custom',
    icon: '✏️',
    color: '#8B8BA3',
    duration: 'Variable',
    muscles: 'You choose',
  },
];

export default function WorkoutSelectScreen() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose Workout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {WORKOUT_TYPES.map((wt) => (
          <TouchableOpacity
            key={wt.type}
            style={[styles.card, { width: CARD_WIDTH }]}
            onPress={() =>
              router.push({
                pathname: '/workout/exercises',
                params: { type: wt.type },
              })
            }
            activeOpacity={0.8}
          >
            {/* Color accent */}
            <View style={[styles.cardAccent, { backgroundColor: wt.color + '22' }]} />

            <Text style={styles.cardIcon}>{wt.icon}</Text>
            <Text style={styles.cardType}>{wt.type}</Text>

            <View style={[styles.durationBadge, { backgroundColor: wt.color + '22' }]}>
              <Text style={[styles.durationText, { color: wt.color }]}>{wt.duration}</Text>
            </View>

            <Text style={styles.cardMuscles}>{wt.muscles}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#141420',
    borderRadius: 12,
  },
  backIcon: { fontSize: 20, color: '#FFFFFF' },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 12,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#141420',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    position: 'relative',
  },
  cardAccent: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 80,
    height: 80,
    borderRadius: 40,
    transform: [{ translateX: 20 }, { translateY: -20 }],
  },
  cardIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  cardType: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  durationBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardMuscles: {
    fontSize: 12,
    color: '#8B8BA3',
    lineHeight: 16,
  },
});
