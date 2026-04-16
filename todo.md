# GymTrack — Development Plan

## Design Guidelines

### Design References
- **Nike Training Club**: Dark athletic aesthetic, bold typography
- **Strong App**: Clean workout tracking UI, excellent data display
- **Style**: Dark Mode Athletic + Neon Accent + Premium Minimal

### Color Palette
- Background: #0A0A0F (Near Black)
- Surface: #141420 (Dark Purple-Gray)
- Card: #1C1C2E (Elevated Surface)
- Accent: #6C5CE7 (Electric Purple - primary CTA)
- Accent Glow: #A29BFE (Light Purple - highlights)
- Success: #00E676 (Neon Green - completed/PR)
- Warning: #FFD93D (Gold - streaks/achievements)
- Danger: #FF6B6B (Coral Red - delete/destructive)
- Text Primary: #FFFFFF
- Text Secondary: #8B8BA3 (Muted Lavender)
- Text Tertiary: #4A4A6A (Subtle)

### Typography
- Font: Inter (clean, modern, highly readable)
- H1: Inter 700, 28px
- H2: Inter 600, 22px
- H3: Inter 600, 18px
- Body: Inter 400, 15px
- Caption: Inter 500, 13px
- Stat Numbers: Inter 700, 32px

### Key Component Styles
- Buttons: Rounded-xl (12px), min-height 48px for touch targets
- Cards: bg-card, rounded-2xl, border border-white/5
- Inputs: Dark bg with subtle border, focus: accent glow ring
- Spinners: Large 56px touch targets with +/- buttons
- Bottom Nav: Fixed, frosted glass effect (backdrop-blur)

### Layout
- Mobile-first: max-w-md mx-auto
- Safe area padding: pb-20 for bottom nav
- Section gaps: 24px
- Card padding: 16-20px
- Touch targets: minimum 44px

### Images to Generate
1. **onboarding-hero-gym.jpg** - Dramatic dark gym interior with moody purple/blue lighting, weights and equipment visible (Style: photorealistic, dark mood, cinematic)
2. **onboarding-ai-brain.jpg** - Abstract neural network visualization with purple glowing nodes, representing AI intelligence (Style: 3d, dark background, purple glow)
3. **onboarding-timer.jpg** - Stylized stopwatch/timer with neon purple glow rings, athletic feel (Style: 3d, dark background, neon accents)
4. **workout-complete-celebration.jpg** - Abstract burst of purple and green light particles, celebration/achievement feel (Style: 3d, dark background, vibrant)

---

## Architecture Overview

### File Structure (8 files max)
1. **src/pages/Index.tsx** — Router/App shell with bottom tab nav + all screen routing
2. **src/components/OnboardingFlow.tsx** — 3 slides + auth + profile setup
3. **src/components/Dashboard.tsx** — Home screen with greeting, CTA, streak, recent workouts
4. **src/components/WorkoutFlow.tsx** — Type selector + exercise list + active workout + rest timer + complete screen
5. **src/components/HistoryScreen.tsx** — Workout history list with filters and detail view
6. **src/components/ProgressScreen.tsx** — Volume/Strength/Body tabs with charts
7. **src/components/ProfileScreen.tsx** — Profile + exercise library (combined)
8. **src/lib/gymData.ts** — All data types, exercise database, placeholder functions, localStorage helpers

### State Management
- localStorage for persistence (onboarding complete, user profile, active workout, workout history)
- React useState/useReducer for local state
- Timestamp-based timers (startedAt as Unix ms)

### Data Flow
- gymData.ts exports all types, exercise DB (100+ exercises), and placeholder functions
- Each screen component is self-contained with its own state
- Index.tsx manages top-level navigation state and passes down via props/context