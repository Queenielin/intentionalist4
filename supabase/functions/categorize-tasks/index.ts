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
    const prompt = `You are an advanced task classifier for a productivity system. Given task titles, return a JSON array with objects containing:
- workType: one of ["deep","light","admin"] (lowercase only)
- duration: one of [15,30,60] (minutes, integer)
- taskType: specific subcategory based on cognitive type required
- groupingKey: short label used to group similar tasks (e.g., "Email:Support", "Strategy:ProductRoadmap")

WORK TYPE DEFINITIONS:

🔵 DEEP WORK | Focused × High-Value × Cognitively Demanding
Work requiring full concentration, no distractions, producing high-value output through problem-solving, creativity, or analysis.
Subcategories (taskType options):
- "Strategy" → Business strategy, analysis, financial modeling, decision frameworks
- "Creative" → Writing, design, coding, music, content creation  
- "Research" → Reading, studying, synthesizing knowledge, data exploration
- "Building" → Product design, system architecture, prototyping, solution mapping

🟢 LIGHT WORK | Execution × Low-Depth × Medium Value
Work requiring some focus but not deep concentration; routine tasks applying existing knowledge.
Subcategories (taskType options):
- "Communication" → Emails, chat replies, drafting short updates, responding to inquiries
- "Review" → Reviewing documents, slide decks, pull requests, proofreading
- "Organizing" → Updating task boards, making short plans, simple scheduling
- "Coordination" → Follow-ups, aligning with colleagues, preparing reminders

🟡 ADMIN WORK | Maintenance × Low Cognitive Demand × Organizational  
Necessary support tasks that keep systems running but don't produce high-value creative output.
Subcategories (taskType options):
- "Documentation" → Logging notes, updating CRM, form filling, timesheets
- "Scheduling" → Booking/rescheduling meetings, time-blocking
- "FileManagement" → Uploading files, renaming, organizing folders, backups
- "Operations" → Expense reports, invoice processing, compliance checklists

DURATION ASSIGNMENT RULES:

⚡ 15-MINUTE TASKS | Quick × Low Complexity × High Context-Switch Tolerance
Small, atomic tasks completed in one go with little prep:
- Replying to 3-5 emails
- Quick calendar reschedule  
- Sending reminder/follow-up message
- Reviewing short document for typos
- Simple data entry

⏳ 30-MINUTE TASKS | Medium Depth × Moderate Focus × Self-Contained
Work requiring moderate focus, finished in one sitting:
- Drafting LinkedIn post or short update
- Creating 2-3 presentation slides
- Reviewing and commenting on short proposal
- Testing software feature
- Writing meeting notes summary

🎯 60-MINUTE TASKS | Deep × High Focus × Complex Output
Sustained deep focus producing tangible output:
- Writing 2-3 page report section
- Coding feature or debugging workflow
- Designing product flow
- Research and synthesis
- Strategy presentation prep

SPECIAL RULES:
1) If task appears to need >1 hour, still assign 60 minutes but add "Block 1" to groupingKey
2) Never use "General" - always pick specific subcategory
3) For batch tasks (multiple emails, etc.), estimate total time and categorize accordingly

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
        // Deep Work subcategories
        'Strategy', 'Creative', 'Research', 'Building',
        // Light Work subcategories  
        'Communication', 'Review', 'Organizing', 'Coordination',
        // Admin Work subcategories
        'Documentation', 'Scheduling', 'FileManagement', 'Operations',
        // Legacy fallback
        'Other'
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