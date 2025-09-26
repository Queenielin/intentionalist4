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
    const { tasks, stream = false } = await req.json();
    console.log('Received tasks for classification:', tasks);

    if (!tasks || !Array.isArray(tasks)) {
      throw new Error('Tasks array is required');
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    // For streaming, process tasks individually
    if (stream && tasks.length > 1) {
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for (let i = 0; i < tasks.length; i++) {
              const singleTask = [tasks[i]];
              const classification = await classifyTasks(singleTask, GEMINI_API_KEY);
              
              const result = {
                index: i,
                task: tasks[i],
                classification: classification[0]
              };
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(result)}\n\n`));
            }
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        }
      });

      return new Response(readableStream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // For non-streaming, process all tasks at once
    const classifications = await classifyTasks(tasks, GEMINI_API_KEY);
    
    return new Response(JSON.stringify({ classifications }), {
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

// Extracted classification logic
async function classifyTasks(tasks: string[], apiKey: string) {
  const prompt = `You are an advanced task classifier using cognitive science principles. Classify each task into ONE of these 8 categories:

🧠 DEEP WORK (High cognitive load, sustained focus):

1. "Analytical × Strategic" - Logic-heavy, structured reasoning, big-picture trade-offs
   • Business strategy, financial modeling, decision frameworks, problem-solving, analysis
   • Examples: strategic planning, market analysis, business cases, complex decisions

2. "Creative × Generative" - Divergent, imaginative, associative synthesis  
   • Writing, design, coding, music, content creation, brainstorming, ideation
   • Examples: writing articles, creative design, programming, composing, innovation

3. "Learning × Absorptive" - Taking in and encoding new material, schema-building
   • Reading, studying, research, knowledge synthesis, data exploration
   • Examples: studying courses, reading books, research, learning new skills

4. "Constructive × Building" - Hands-on creation, chaining micro-decisions into artifacts
   • Product design, system architecture, prototyping, building, implementation
   • Examples: building products, coding implementations, creating prototypes

🔄 LIGHT WORK (Medium focus, execution/processing):

5. "Social & Relational" - Communication and coordination using social cognition
   • Emails, chat replies, networking, follow-ups, coordination, relationship building
   • Examples: replying to emails, Slack messages, networking, team coordination

6. "Critical & Structuring" - Detail-oriented review and organization
   • Review, feedback, organizing, planning, proofreading, quality checks
   • Examples: reviewing documents, giving feedback, organizing tasks, planning

🟡 ADMIN WORK (Low focus, maintenance/logistics):

7. "Clerical & Admin Routines" - Repetitive procedures and compliance
   • Documentation, data entry, form filling, routine operations, logging
   • Examples: expense reports, data entry, form completion, compliance tasks

8. "Logistics & Maintenance" - Scheduling and organizational maintenance
   • Calendar management, file organization, booking, tool maintenance, backups
   • Examples: scheduling meetings, organizing files, calendar management

DURATION GUIDELINES:
- 15 minutes: Quick replies, simple admin, brief reviews, short coordination
- 30 minutes: Standard communication, planning sessions, moderate analysis
- 60 minutes: Deep analytical work, complex creation, intensive learning, building

Return JSON array with objects containing:
- taskType: exact category name from the 8 options above
- duration: one of [15,30,60] based on cognitive complexity and typical time needed

Tasks: ${tasks.map((task, i) => `${i + 1}. ${task}`).join('\n')}`;

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-8b:generateContent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
    }),
  });

  const data = await response.json();
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  
  let classifications;
  try {
    const cleanText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    classifications = JSON.parse(cleanText);
  } catch {
    classifications = tasks.map(() => ({
      workType: 'light', duration: 30, taskType: 'Social & Relational', groupingKey: 'Light:Social & Relational'
    }));
  }

  // Map the 8 categories to workType and validate
  const validDurations = [15, 30, 60];
  
  const categoryToWorkType = {
    'Analytical × Strategic': 'deep',
    'Creative × Generative': 'deep', 
    'Learning × Absorptive': 'deep',
    'Constructive × Building': 'deep',
    'Social & Relational': 'light',
    'Critical & Structuring': 'light',
    'Clerical & Admin Routines': 'admin',
    'Logistics & Maintenance': 'admin'
  };
  
  const validCategories = Object.keys(categoryToWorkType);
  
  return classifications.map((c: any) => {
    const taskType = validCategories.includes(c.taskType) ? c.taskType : 'Social & Relational';
    const workType = categoryToWorkType[taskType as keyof typeof categoryToWorkType];
    const duration = validDurations.includes(c.duration) ? c.duration : 30;
    
    console.log(`Task classification: taskType=${taskType}, workType=${workType}, duration=${duration}`);
    
    return {
      workType,
      duration,
      taskType,
      groupingKey: `${workType}:${taskType}`
    };
  });
}