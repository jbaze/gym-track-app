import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { WorkoutSession } from '../../src/types';
import { formatWorkoutDuration } from '../../src/lib/timers';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const BADGE_COLORS: Record<string, string> = {
  Push: '#6C5CE7',
  Pull: '#00E676',
  Legs: '#FFD93D',
  'Full Body': '#FF5050',
  Upper: '#A29BFE',
  Lower: '#00CEC9',
  Custom: '#8B8BA3',
};

export default function HistoryScreen() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });

      setSessions(data ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSessions();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#6C5CE7" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Workout History</Text>
        <Text style={styles.headerCount}>{sessions.length} sessions</Text>
      </View>

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, sessions.length === 0 && styles.listEmpty]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C5CE7" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏋️</Text>
            <Text style={styles.emptyTitle}>No workouts yet</Text>
            <Text style={styles.emptySubtitle}>Start your first workout to see it here!</Text>
          </View>
        }
        renderItem={({ item }) => {
          const badgeColor = BADGE_COLORS[item.workout_type] ?? '#8B8BA3';
          return (
            <TouchableOpacity
              style={styles.sessionCard}
              onPress={() => router.push(`/history/${item.id}` as any)}
              activeOpacity={0.7}
            >
              <View style={styles.cardLeft}>
                <View style={[styles.typeBadge, { backgroundColor: badgeColor + '22' }]}>
                  <Text style={[styles.typeBadgeText, { color: badgeColor }]}>
                    {item.workout_type}
                  </Text>
                </View>
                <Text style={styles.sessionDate}>{formatDate(item.started_at)}</Text>
              </View>

              <View style={styles.cardRight}>
                <View style={styles.statRow}>
                  <Text style={styles.statIcon}>⏱</Text>
                  <Text style={styles.statText}>
                    {item.duration_seconds
                      ? formatWorkoutDuration(item.duration_seconds)
                      : '—'}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statIcon}>🏋️</Text>
                  <Text style={styles.statText}>
                    {item.total_volume_kg
                      ? `${item.total_volume_kg.toFixed(0)} kg`
                      : '—'}
                  </Text>
                </View>
              </View>

              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  centered: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBar: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerCount: {
    fontSize: 13,
    color: '#8B8BA3',
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  listEmpty: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8B8BA3',
    textAlign: 'center',
  },
  sessionCard: {
    backgroundColor: '#141420',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardLeft: {
    flex: 1,
  },
  typeBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sessionDate: {
    fontSize: 13,
    color: '#8B8BA3',
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 4,
    marginRight: 12,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statIcon: {
    fontSize: 12,
  },
  statText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  chevron: {
    fontSize: 22,
    color: '#4A4A6A',
  },
});
