import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tasks } = await req.json();
    console.log('Received tasks for classification:', tasks);

    if (!tasks || !Array.isArray(tasks)) {
      throw new Error('Tasks array is required');
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    // Create prompt for batch processing
    const prompt = `You are a classifier for a task manager. Given task titles, return a JSON array with objects containing:
- workType: one of ["deep","light","admin"] (lowercase only)
- duration: one of [15,30,60] (minutes, integer)
- taskType: one of ["Email","Comms","Calls","Meetings","Planning","Writing","Reading","Research","Coding","Design","Documentation","Applications","Finance","Travel","Reviews","Chores","Learning","Other"]
- groupingKey: short label used to group similar tasks (e.g., "Email:Support", "Comms:LinkedIn", "Applications:Kaplan")

Rules:
1) Never output "General". If nothing fits, use "Other" with a sensible groupingKey.
2) workType:
   - admin → logistics/coordination/comms/scheduling/forms/payments/travel.
   - deep → creation/analysis/learning/coding/writing/design/research/strategy.
   - light → quick chores/small edits/short replies/reviews/labeling/filing.
3) Duration heuristics (round to nearest of 15/30/60):
   - 15 → ultra-quick replies, single confirmation/lookup, tiny edits, a single rating or review.
   - 30 → small batches (3–6 emails/chats), simple bookings/forms, short reviews, brief planning.
   - 60 → drafting/learning/research sessions, non-trivial coding/design, longer applications/prep.

Return only a JSON array with one object per task, in the same order. No explanations.

Tasks to classify:
${tasks.map((task: string, index: number) => `${index + 1}. ${task}`).join('\n')}`;

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Gemini response:', data);

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response from Gemini API');
    }

    const responseText = data.candidates[0].content.parts[0].text.trim();
    console.log('Gemini response text:', responseText);

    // Parse the JSON response
    let classifications;
    try {
      // Remove any markdown code blocks if present
      const cleanText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      classifications = JSON.parse(cleanText);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError);
      console.error('Response text:', responseText);
      
      // Fallback to default classifications
      classifications = tasks.map(() => ({
        workType: 'light',
        duration: 30,
        taskType: 'Other',
        groupingKey: 'Other:General'
      }));
    }

    // Ensure we have the right number of classifications
    if (!Array.isArray(classifications) || classifications.length !== tasks.length) {
      console.warn('Classification count mismatch, using defaults');
      classifications = tasks.map(() => ({
        workType: 'light',
        duration: 30,
        taskType: 'Other',
        groupingKey: 'Other:General'
      }));
    }

    // Validate and sanitize each classification
    const validatedClassifications = classifications.map((classification: any, index: number) => {
      const validWorkTypes = ['deep', 'light', 'admin'];
      const validDurations = [15, 30, 60];
      const validTaskTypes = [
        'Email', 'Comms', 'Calls', 'Meetings', 'Planning', 'Writing', 'Reading',
        'Research', 'Coding', 'Design', 'Documentation', 'Applications', 'Finance',
        'Travel', 'Reviews', 'Chores', 'Learning', 'Other'
      ];

      return {
        workType: validWorkTypes.includes(classification.workType) ? classification.workType : 'light',
        duration: validDurations.includes(classification.duration) ? classification.duration : 30,
        taskType: validTaskTypes.includes(classification.taskType) ? classification.taskType : 'Other',
        groupingKey: classification.groupingKey || 'Other:General'
      };
    });

    console.log('Final classifications:', validatedClassifications);

    return new Response(JSON.stringify({ classifications: validatedClassifications }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in categorize-tasks function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});