import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Dimensions,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { FitnessGoal, ExperienceLevel, WeightUnit } from '../../src/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
  {
    icon: '📊',
    title: 'Track Every Rep',
    subtitle: 'Log every set, rep, and weight. See your progress with detailed analytics.',
    accent: '#6C5CE7',
  },
  {
    icon: '🤖',
    title: 'AI-Powered Coaching',
    subtitle: 'Get smart weight suggestions based on your history. Train smarter, not just harder.',
    accent: '#00E676',
  },
  {
    icon: '🔥',
    title: 'Build Consistency',
    subtitle: 'Track your streak, celebrate PRs, and never miss a workout.',
    accent: '#FFD93D',
  },
];

const FITNESS_GOALS: { value: FitnessGoal; label: string }[] = [
  { value: 'strength', label: 'Strength' },
  { value: 'hypertrophy', label: 'Hypertrophy' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'weight_loss', label: 'Weight Loss' },
];

const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export default function OnboardingScreen() {
  const [slideIndex, setSlideIndex] = useState(0);
  const [showSetup, setShowSetup] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Profile setup state
  const [profileName, setProfileName] = useState('');
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal>('strength');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('beginner');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [restSeconds, setRestSeconds] = useState(90);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNextSlide = () => {
    if (slideIndex < SLIDES.length - 1) {
      const next = slideIndex + 1;
      setSlideIndex(next);
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
    } else {
      setShowSetup(true);
    }
  };

  const handleSubmitProfile = async () => {
    if (!profileName.trim()) {
      setError('Please enter your name.');
      return;
    }
    setLoading(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Session expired. Please sign in again.');
      setLoading(false);
      return;
    }

    const { error: upsertError } = await supabase.from('profiles').upsert({
      id: user.id,
      name: profileName.trim(),
      fitness_goal: fitnessGoal,
      experience_level: experienceLevel,
      weight_unit: weightUnit,
      default_rest_seconds: restSeconds,
    });

    setLoading(false);
    if (upsertError) {
      setError(upsertError.message);
    } else {
      router.replace('/(tabs)/home');
    }
  };

  if (showSetup) {
    return (
      <ScrollView
        style={styles.setupContainer}
        contentContainerStyle={styles.setupScroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.setupTitle}>Set Up Your Profile</Text>
        <Text style={styles.setupSubtitle}>Tell us about yourself so we can personalize your experience.</Text>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Name */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>YOUR NAME</Text>
          <TextInput
            style={styles.input}
            placeholder="John Doe"
            placeholderTextColor="#4A4A6A"
            value={profileName}
            onChangeText={setProfileName}
            autoCapitalize="words"
          />
        </View>

        {/* Fitness Goal */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>FITNESS GOAL</Text>
          <View style={styles.pillRow}>
            {FITNESS_GOALS.map((g) => (
              <TouchableOpacity
                key={g.value}
                style={[styles.pill, fitnessGoal === g.value && styles.pillActive]}
                onPress={() => setFitnessGoal(g.value)}
              >
                <Text style={[styles.pillText, fitnessGoal === g.value && styles.pillTextActive]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Experience Level */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>EXPERIENCE LEVEL</Text>
          <View style={styles.pillRow}>
            {EXPERIENCE_LEVELS.map((l) => (
              <TouchableOpacity
                key={l.value}
                style={[styles.pill, experienceLevel === l.value && styles.pillActive]}
                onPress={() => setExperienceLevel(l.value)}
              >
                <Text style={[styles.pillText, experienceLevel === l.value && styles.pillTextActive]}>
                  {l.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Weight Unit */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>WEIGHT UNIT</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, weightUnit === 'kg' && styles.toggleActive]}
              onPress={() => setWeightUnit('kg')}
            >
              <Text style={[styles.toggleText, weightUnit === 'kg' && styles.toggleTextActive]}>kg</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, weightUnit === 'lbs' && styles.toggleActive]}
              onPress={() => setWeightUnit('lbs')}
            >
              <Text style={[styles.toggleText, weightUnit === 'lbs' && styles.toggleTextActive]}>lbs</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Rest Timer */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DEFAULT REST TIMER</Text>
          <Text style={styles.restValue}>{restSeconds}s</Text>
          <View style={styles.sliderRow}>
            {[60, 90, 120, 150, 180, 240, 300].map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.sliderDot, restSeconds === s && styles.sliderDotActive]}
                onPress={() => setRestSeconds(s)}
              >
                <Text style={[styles.sliderDotText, restSeconds === s && styles.sliderDotTextActive]}>
                  {s < 60 ? `${s}s` : `${s / 60}m`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.startButton, loading && styles.buttonDisabled]}
          onPress={handleSubmitProfile}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.startButtonText}>START TRAINING</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <View style={styles.slideOuter}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
            <View style={[styles.slideIconBox, { backgroundColor: item.accent + '22' }]}>
              <Text style={styles.slideIcon}>{item.icon}</Text>
            </View>
            <Text style={[styles.slideTitle, { color: item.accent }]}>{item.title}</Text>
            <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
          </View>
        )}
      />

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === slideIndex && styles.dotActive]}
          />
        ))}
      </View>

      <TouchableOpacity style={styles.nextButton} onPress={handleNextSlide}>
        <Text style={styles.nextButtonText}>
          {slideIndex < SLIDES.length - 1 ? 'NEXT' : 'GET STARTED'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => setShowSetup(true)}
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  slideOuter: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 48,
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  slideIconBox: {
    width: 120,
    height: 120,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  slideIcon: {
    fontSize: 56,
  },
  slideTitle: {
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 1,
  },
  slideSubtitle: {
    fontSize: 16,
    color: '#8B8BA3',
    textAlign: 'center',
    lineHeight: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 40,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#6C5CE7',
  },
  nextButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 48,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 2,
  },
  skipButton: {
    marginTop: 16,
    padding: 12,
  },
  skipText: {
    color: '#8B8BA3',
    fontSize: 14,
  },
  setupContainer: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  setupScroll: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 48,
  },
  setupTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  setupSubtitle: {
    fontSize: 15,
    color: '#8B8BA3',
    lineHeight: 22,
    marginBottom: 32,
  },
  errorBox: {
    backgroundColor: 'rgba(255,80,80,0.12)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,80,80,0.3)',
  },
  errorText: {
    color: '#FF5050',
    fontSize: 13,
  },
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B8BA3',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#1C1C2E',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1C1C2E',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  pillActive: {
    backgroundColor: 'rgba(108,92,231,0.2)',
    borderColor: '#6C5CE7',
  },
  pillText: {
    color: '#8B8BA3',
    fontSize: 14,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#6C5CE7',
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#1C1C2E',
    borderRadius: 12,
    padding: 4,
    alignSelf: 'flex-start',
  },
  toggleBtn: {
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 10,
  },
  toggleActive: {
    backgroundColor: '#6C5CE7',
  },
  toggleText: {
    color: '#8B8BA3',
    fontSize: 15,
    fontWeight: '700',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  restValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#6C5CE7',
    marginBottom: 12,
  },
  sliderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sliderDot: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1C1C2E',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sliderDotActive: {
    backgroundColor: 'rgba(108,92,231,0.2)',
    borderColor: '#6C5CE7',
  },
  sliderDotText: {
    color: '#8B8BA3',
    fontSize: 13,
    fontWeight: '600',
  },
  sliderDotTextActive: {
    color: '#6C5CE7',
  },
  startButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
