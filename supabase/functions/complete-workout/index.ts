import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RequestBody {
  session_id: string;
}

interface WorkoutSession {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  total_volume_kg: number | null;
  duration_seconds: number | null;
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
    const { session_id } = body;

    if (!session_id) {
      return new Response(JSON.stringify({ error: 'Missing required field: session_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fetch the session to get started_at and verify it exists
    const { data: sessionData, error: sessionError } = await supabase
      .from('workout_sessions')
      .select('id, user_id, started_at, ended_at')
      .eq('id', session_id)
      .single();

    if (sessionError || !sessionData) {
      return new Response(
        JSON.stringify({ error: 'Session not found', details: sessionError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (sessionData.ended_at) {
      return new Response(JSON.stringify({ error: 'Session is already completed' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Compute total_volume_kg = SUM(weight_kg * reps) for all set_logs in this session
    // set_logs -> session_exercises (on session_exercise_id), filter by session_id
    const { data: setLogs, error: setLogsError } = await supabase
      .from('set_logs')
      .select(
        `
        weight_kg,
        reps,
        session_exercises!inner (
          session_id
        )
      `,
      )
      .eq('session_exercises.session_id', session_id);

    if (setLogsError) {
      console.error('Error fetching set logs:', setLogsError);
      return new Response(
        JSON.stringify({ error: 'Failed to compute volume', details: setLogsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const totalVolumeKg: number = (setLogs ?? []).reduce(
      (sum: number, log: any) => sum + (log.weight_kg ?? 0) * (log.reps ?? 0),
      0,
    );

    // Compute duration_seconds = now() - started_at (in seconds)
    const startedAt = new Date(sessionData.started_at);
    const now = new Date();
    const durationSeconds = Math.round((now.getTime() - startedAt.getTime()) / 1000);

    // Update the workout_sessions row
    const { data: updatedSession, error: updateError } = await supabase
      .from('workout_sessions')
      .update({
        total_volume_kg: totalVolumeKg,
        duration_seconds: durationSeconds,
        ended_at: now.toISOString(),
      })
      .eq('id', session_id)
      .select()
      .single();

    if (updateError || !updatedSession) {
      console.error('Error updating session:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update session', details: updateError?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify(updatedSession as WorkoutSession), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unhandled error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
