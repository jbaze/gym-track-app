import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RequestBody {
  user_id: string;
  exercise_id: string;
  current_session_id: string;
}

interface SetLog {
  weight_kg: number;
  reps: number;
  set_number: number;
}

interface SessionWithSets {
  started_at: string;
  sets: SetLog[];
}

interface ClaudeAISuggestion {
  weight_kg: number;
  reps: number;
  note: string;
  confidence: 'increase' | 'maintain' | 'decrease';
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: RequestBody = await req.json();
    const { user_id, exercise_id, current_session_id } = body;

    if (!user_id || !exercise_id || !current_session_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, exercise_id, current_session_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fetch exercise name
    const { data: exerciseData, error: exerciseError } = await supabase
      .from('exercises')
      .select('name')
      .eq('id', exercise_id)
      .single();

    if (exerciseError || !exerciseData) {
      return new Response(
        JSON.stringify({ error: 'Exercise not found', details: exerciseError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const exerciseName: string = exerciseData.name;

    // Fetch user profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('fitness_goal, experience_level')
      .eq('id', user_id)
      .single();

    if (profileError) {
      console.warn('Could not fetch user profile:', profileError.message);
    }

    const fitnessGoal: string = profileData?.fitness_goal ?? 'general fitness';
    const experienceLevel: string = profileData?.experience_level ?? 'beginner';

    // Fetch last 4 sessions where this exercise was performed
    // set_logs -> session_exercises (on session_exercise_id) -> workout_sessions (on session_id)
    const { data: rawSetLogs, error: setLogsError } = await supabase
      .from('set_logs')
      .select(
        `
        weight_kg,
        reps,
        set_number,
        session_exercises!inner (
          exercise_id,
          session_id,
          workout_sessions!inner (
            id,
            user_id,
            started_at
          )
        )
      `,
      )
      .eq('session_exercises.exercise_id', exercise_id)
      .eq('session_exercises.workout_sessions.user_id', user_id)
      .neq('session_exercises.session_id', current_session_id)
      .order('session_exercises(workout_sessions(started_at))', { ascending: false });

    if (setLogsError) {
      console.error('Error fetching set logs:', setLogsError);
    }

    // Group set logs by session, take top 4 sessions
    const sessionMap = new Map<string, SessionWithSets>();

    if (rawSetLogs && rawSetLogs.length > 0) {
      for (const log of rawSetLogs as any[]) {
        const sessionExercise = log.session_exercises;
        const workoutSession = sessionExercise?.workout_sessions;

        if (!workoutSession) continue;

        const sessionId: string = workoutSession.id;
        const startedAt: string = workoutSession.started_at;

        if (!sessionMap.has(sessionId)) {
          if (sessionMap.size >= 4) continue; // limit to 4 sessions
          sessionMap.set(sessionId, { started_at: startedAt, sets: [] });
        }

        sessionMap.get(sessionId)!.sets.push({
          weight_kg: log.weight_kg,
          reps: log.reps,
          set_number: log.set_number,
        });
      }
    }

    const sessions: SessionWithSets[] = Array.from(sessionMap.values()).sort(
      (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
    );

    // If no history, return beginner suggestion
    if (sessions.length === 0) {
      return new Response(
        JSON.stringify({
          suggested_weight_kg: 20,
          suggested_reps: 10,
          note: 'Starting weight for beginners. Focus on form first.',
          confidence: 'maintain',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Build recent performance string
    const performanceLines = sessions.map((session) => {
      const dateStr = new Date(session.started_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      const sortedSets = session.sets.sort((a, b) => a.set_number - b.set_number);
      const setsStr = sortedSets.map((s) => `${s.weight_kg}kg × ${s.reps} reps`).join(', ');

      return `${dateStr}: ${setsStr}`;
    });

    const recentPerformance = performanceLines.join('\n');

    // Build prompt
    const prompt = `You are a personal trainer AI. Analyze the athlete's recent performance for ${exerciseName} and suggest weight and reps for their next set.

Recent performance (newest first):
${recentPerformance}

Athlete profile: ${fitnessGoal}, ${experienceLevel}

Respond ONLY in JSON: { "weight_kg": number, "reps": number, "note": string (max 60 chars), "confidence": "increase"|"maintain"|"decrease" }`;

    // Call Anthropic API
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!anthropicResponse.ok) {
      const errorBody = await anthropicResponse.text();
      console.error('Anthropic API error:', anthropicResponse.status, errorBody);
      return new Response(
        JSON.stringify({ error: 'Failed to get AI suggestion', details: errorBody }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const anthropicData = await anthropicResponse.json();
    const rawContent: string = anthropicData?.content?.[0]?.text ?? '';

    // Parse JSON from Claude's response (strip markdown fences if present)
    let suggestion: ClaudeAISuggestion;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON object found in response');
      suggestion = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', rawContent, parseError);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response', raw: rawContent }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({
        suggested_weight_kg: suggestion.weight_kg,
        suggested_reps: suggestion.reps,
        note: suggestion.note,
        confidence: suggestion.confidence,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('Unhandled error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
