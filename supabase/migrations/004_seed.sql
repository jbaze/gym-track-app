insert into public.exercises (name, primary_muscle, secondary_muscles, equipment, description) values

-- CHEST (10 exercises)
('Barbell Bench Press',       'chest',       array['triceps','shoulders'],          'barbell',    'Classic flat bench press with a barbell'),
('Incline Dumbbell Press',    'chest',       array['triceps','shoulders'],          'dumbbell',   'Upper-chest focused press on an incline bench'),
('Decline Barbell Press',     'chest',       array['triceps'],                      'barbell',    'Lower-chest focused press on a decline bench'),
('Cable Fly',                 'chest',       array['shoulders'],                    'cable',      'Cable crossover targeting chest isolation'),
('Dumbbell Fly',              'chest',       array['shoulders'],                    'dumbbell',   'Flat bench fly for chest stretch and contraction'),
('Dips',                      'chest',       array['triceps','shoulders'],          'bodyweight', 'Chest-forward dips for lower chest and triceps'),
('Push-ups',                  'chest',       array['triceps','shoulders','core'],   'bodyweight', 'Classic bodyweight push-up'),
('Pec Deck Machine',          'chest',       array['shoulders'],                    'machine',    'Machine fly for chest isolation'),
('Incline Cable Fly',         'chest',       array['shoulders'],                    'cable',      'Upper-chest cable fly from low pulley'),
('Landmine Press',            'chest',       array['shoulders','triceps'],          'other',      'Angled pressing movement with a landmine setup'),

-- BACK (10 exercises)
('Deadlift',                  'back',        array['glutes','hamstrings','traps'],  'barbell',    'Fundamental compound pull from the floor'),
('Pull-ups',                  'back',        array['biceps','core'],                'bodyweight', 'Overhand grip pull-up for lat width'),
('Barbell Row',               'back',        array['biceps','rear delts'],          'barbell',    'Bent-over barbell row for mid-back thickness'),
('Lat Pulldown',              'back',        array['biceps'],                       'cable',      'Cable pulldown targeting the latissimus dorsi'),
('Seated Cable Row',          'back',        array['biceps','rear delts'],          'cable',      'Seated row for mid-back and rhomboids'),
('Face Pulls',                'back',        array['shoulders','traps'],            'cable',      'High-pulley pull targeting rear delts and rotator cuff'),
('T-Bar Row',                 'back',        array['biceps','rear delts'],          'other',      'Chest-supported or landmine T-bar row'),
('Single-Arm Dumbbell Row',   'back',        array['biceps'],                       'dumbbell',   'Unilateral row for back thickness'),
('Chin-ups',                  'back',        array['biceps','core'],                'bodyweight', 'Underhand grip pull-up with strong bicep involvement'),
('Straight-Arm Pulldown',     'back',        array['core'],                         'cable',      'Cable pulldown with straight arms isolating lats'),

-- SHOULDERS (8 exercises)
('Overhead Press',            'shoulders',   array['triceps','traps'],              'barbell',    'Standing barbell press overhead'),
('Dumbbell Lateral Raise',    'shoulders',   ARRAY[]::text[],                               'dumbbell',   'Lateral raise for medial deltoid isolation'),
('Rear Delt Fly',             'shoulders',   array['traps'],                        'dumbbell',   'Bent-over fly targeting the rear deltoid'),
('Arnold Press',              'shoulders',   array['triceps'],                      'dumbbell',   'Rotating dumbbell press for full deltoid activation'),
('Cable Lateral Raise',       'shoulders',   ARRAY[]::text[],                               'cable',      'Low-pulley lateral raise for constant tension'),
('Front Raise',               'shoulders',   array['chest'],                        'dumbbell',   'Forward raise for anterior deltoid'),
('Upright Row',               'shoulders',   array['traps','biceps'],               'barbell',    'Barbell upright row for traps and medial delts'),
('Machine Shoulder Press',    'shoulders',   array['triceps'],                      'machine',    'Seated machine press for overhead strength'),

-- BICEPS (6 exercises)
('Barbell Curl',              'biceps',      array['forearms'],                     'barbell',    'Standing barbell curl for overall bicep mass'),
('Dumbbell Curl',             'biceps',      array['forearms'],                     'dumbbell',   'Alternating or simultaneous dumbbell curl'),
('Hammer Curl',               'biceps',      array['forearms'],                     'dumbbell',   'Neutral-grip curl targeting brachialis and brachioradialis'),
('Cable Curl',                'biceps',      array['forearms'],                     'cable',      'Low-pulley cable curl for constant tension'),
('Incline Dumbbell Curl',     'biceps',      array['forearms'],                     'dumbbell',   'Incline bench curl for long head stretch'),
('Concentration Curl',        'biceps',      ARRAY[]::text[],                               'dumbbell',   'Seated isolation curl for peak contraction'),

-- TRICEPS (6 exercises)
('Skull Crushers',            'triceps',     ARRAY[]::text[],                               'barbell',    'Lying tricep extension with EZ-bar or barbell'),
('Tricep Pushdown',           'triceps',     ARRAY[]::text[],                               'cable',      'High-pulley rope or bar pushdown for tricep isolation'),
('Close-Grip Bench Press',    'triceps',     array['chest','shoulders'],            'barbell',    'Narrow grip bench press emphasizing triceps'),
('Overhead Tricep Extension', 'triceps',     ARRAY[]::text[],                               'dumbbell',   'Overhead extension for long head of tricep'),
('Tricep Kickback',           'triceps',     ARRAY[]::text[],                               'dumbbell',   'Bent-over dumbbell kickback for tricep isolation'),
('Dips (Tricep)',             'triceps',     array['chest','shoulders'],            'bodyweight', 'Upright-torso dips focused on triceps'),

-- QUADS (7 exercises)
('Back Squat',                'quads',       array['glutes','hamstrings','core'],   'barbell',    'Classic barbell squat with bar on upper back'),
('Front Squat',               'quads',       array['glutes','core'],                'barbell',    'Barbell squat with bar in front rack position'),
('Leg Press',                 'quads',       array['glutes','hamstrings'],          'machine',    'Sled leg press machine for quad and glute development'),
('Leg Extension',             'quads',       ARRAY[]::text[],                               'machine',    'Seated machine extension for quad isolation'),
('Walking Lunges',            'quads',       array['glutes','hamstrings'],          'dumbbell',   'Forward walking lunges with dumbbells'),
('Bulgarian Split Squat',     'quads',       array['glutes','hamstrings'],          'dumbbell',   'Rear-foot elevated split squat'),
('Hack Squat',                'quads',       array['glutes'],                       'machine',    'Machine hack squat for quad-dominant leg press'),

-- HAMSTRINGS (5 exercises)
('Romanian Deadlift',         'hamstrings',  array['glutes','lower back'],          'barbell',    'Hip-hinge deadlift variation for hamstring stretch'),
('Lying Leg Curl',            'hamstrings',  ARRAY[]::text[],                               'machine',    'Prone machine curl for hamstring isolation'),
('Good Mornings',             'hamstrings',  array['glutes','lower back'],          'barbell',    'Barbell good morning for posterior chain'),
('Seated Leg Curl',           'hamstrings',  ARRAY[]::text[],                               'machine',    'Seated machine curl for hamstring isolation'),
('Stiff-Leg Deadlift',        'hamstrings',  array['glutes','lower back'],          'barbell',    'Straight-leg deadlift emphasizing hamstring lengthening'),

-- GLUTES (5 exercises)
('Hip Thrust',                'glutes',      array['hamstrings','quads'],           'barbell',    'Barbell hip thrust for maximum glute activation'),
('Glute Bridge',              'glutes',      array['hamstrings'],                   'bodyweight', 'Supine glute bridge with bodyweight or plate'),
('Cable Kickback',            'glutes',      array['hamstrings'],                   'cable',      'Cable ankle kickback for glute isolation'),
('Sumo Deadlift',             'glutes',      array['hamstrings','quads','adductors'],'barbell',   'Wide-stance deadlift with greater glute and adductor emphasis'),
('Step-ups',                  'glutes',      array['quads','hamstrings'],           'dumbbell',   'Dumbbell step-ups onto a box or bench'),

-- CALVES (4 exercises)
('Standing Calf Raise',       'calves',      ARRAY[]::text[],                               'machine',    'Standing machine or smith machine calf raise'),
('Seated Calf Raise',         'calves',      ARRAY[]::text[],                               'machine',    'Seated machine calf raise targeting soleus'),
('Donkey Calf Raise',         'calves',      ARRAY[]::text[],                               'machine',    'Bent-over calf raise for peak contraction'),
('Single-Leg Calf Raise',     'calves',      ARRAY[]::text[],                               'bodyweight', 'Unilateral calf raise for balance and isolation'),

-- CORE (6 exercises)
('Plank',                     'core',        array['shoulders'],                    'bodyweight', 'Isometric hold in a push-up position'),
('Cable Crunch',              'core',        ARRAY[]::text[],                               'cable',      'Kneeling cable crunch for weighted ab work'),
('Hanging Leg Raise',         'core',        array['hip flexors'],                  'bodyweight', 'Hanging from a bar raising legs for lower abs'),
('Ab Wheel Rollout',          'core',        array['shoulders','lats'],             'other',      'Ab wheel extension for anti-extension core strength'),
('Russian Twist',             'core',        ARRAY[]::text[],                               'other',      'Seated rotation for oblique development'),
('Decline Sit-up',            'core',        array['hip flexors'],                  'bodyweight', 'Decline bench sit-up for weighted abdominal work'),

-- TRAPS (3 exercises)
('Barbell Shrug',             'traps',       array['shoulders'],                    'barbell',    'Heavy barbell shrug for upper trap hypertrophy'),
('Dumbbell Shrug',            'traps',       array['shoulders'],                    'dumbbell',   'Dumbbell shrug with neutral or pronated grip'),
('Cable Shrug',               'traps',       array['shoulders'],                    'cable',      'Low-pulley cable shrug for constant trap tension'),

-- FOREARMS (3 exercises)
('Wrist Curl',                'forearms',    ARRAY[]::text[],                               'barbell',    'Seated barbell wrist curl for forearm flexors'),
('Reverse Curl',              'forearms',    array['biceps'],                       'barbell',    'Overhand barbell curl targeting brachioradialis and forearm extensors'),
('Farmers Carry',             'forearms',    array['traps','core','glutes'],        'dumbbell',   'Heavy dumbbell carry for grip strength and full-body stability')

on conflict do nothing;

-- ----------------------------------------------------------------
-- Admin seed user
-- email: admin@mygym.com  password: Administrator1!
-- ----------------------------------------------------------------
do $$
declare
  v_user_id uuid := gen_random_uuid();
begin
  -- Insert into auth.users (Supabase internal auth table)
  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) values (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@mygym.com',
    crypt('Administrator1!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Administrator"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  on conflict (email) do nothing;

  -- Create the matching profile row
  insert into public.profiles (id, name, fitness_goal, experience_level, weight_unit, default_rest_seconds)
  select v_user_id, 'Administrator', 'strength', 'advanced', 'kg', 90
  where exists (select 1 from auth.users where email = 'admin@mygym.com' and id = v_user_id)
  on conflict (id) do nothing;
end;
$$;
