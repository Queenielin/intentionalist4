import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
          try {
            const singleTask = [tasks[i]];
            const classification = await classifyTasks(singleTask, GEMINI_API_KEY);

            const result = {
              index: i,
              task: tasks[i],
              classification: classification[0],
            };

            controller.enqueue(encoder.encode(`data: ${JSON.stringify(result)}\n\n`));
          } catch (taskErr) {
            // Emit an error event for this item but continue streaming
            controller.enqueue(
              encoder.encode(
                `event: error\ndata: ${JSON.stringify({ index: i, message: String(taskErr) })}\n\n`
              )
            );
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error); // <-- correct API (fixes the crash)
      }
    },
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
  const validCategories = [
    "Analytical × Strategic","Creative × Generative","Learning × Absorptive","Constructive × Building",
    "Social & Relational","Critical & Structuring","Clerical & Admin Routines","Logistics & Maintenance"
  ];

  // --- Prompt (final) ---
  const prompt = `You are an advanced task classifier using cognitive science principles.  
Classify each task into ONE of these 8 categories, then assign a duration (15, 30, 60).  
Return ONLY a JSON array of objects (no prose, no code fences).  

CATEGORIES (cognitive definitions):  
1. "Analytical × Strategic" = structured reasoning, trade-offs, modeling, scenario planning, debugging.  
2. "Creative × Generative" = divergent creation: long-form writing, ideation, content design, coding from scratch.  
3. "Learning × Absorptive" = reading/studying/encoding new material (input-heavy, not output).  
4. "Constructive × Building" = hands-on implementation/prototyping, chaining micro-decisions into a build.  
5. "Social & Relational" = communication & coordination: replies, follow-ups, team alignment, messaging.  
6. "Critical & Structuring" = review/organization: proofreading, feedback, task board updates, short plans.  
7. "Clerical & Admin Routines" = routine logging/compliance: expenses, invoices, forms, data entry.  
8. "Logistics & Maintenance" = scheduling, calendar, file/folder/backup/tool hygiene.  

DURATION GUIDELINES:  
- 15 → quick replies, simple admin, brief reviews, short coordination  
- 30 → standard comms/planning, moderate analysis, small deliverable  
- 60 → deep analysis/creation/learning/building (focus block)  

Tie-break rules:  
- If multiple actions: choose the DOMINANT one (latest verb or biggest effort).  
- If ambiguous: pick the category needing MORE focus (bias upward).  
- Duration can be shortened if the task clearly signals small scale (e.g. "1 email" = 15, "20 emails" = 60).  

OUTPUT FORMAT:
[{ "title": "<cleaned task text>", "category": "<one of 8>", "duration": 15|30|60 }]

Tasks:
${tasks.map((task, i) => `${i + 1}. ${task}`).join('\n')}
`;

  // --- Call Gemini with JSON mode + schema ---
  const resp = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-8b:generateContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 512,
          responseMimeType: "application/json",
          responseSchema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title:    { type: "string" },
                category: { type: "string", enum: validCategories },
                duration: { type: "number", enum: [15,30,60] }
              },
              required: ["title","category","duration"],
              additionalProperties: false
            }
          }
        }
      })
    }
  );

  // --- Parse robustly (json mode or plain text) ---
  const data = await resp.json();
  const part = data?.candidates?.[0]?.content?.parts?.[0];
  let arr: any[] = [];
  try {
    if (part?.json) {
      arr = part.json;
    } else {
      const text = (part?.text ?? "").trim().replace(/```json|```/g, "");
      arr = JSON.parse(text || "[]");
    }
  } catch {
    // Fallback: neutral defaults using original titles
    arr = tasks.map(t => ({ title: t, category: "Social & Relational", duration: 30 }));
  }

  // --- Safety nets ---
  const validDur = new Set([15,30,60]);
  const guessDuration = (s: string): 15|30|60 => {
    const lc = s.toLowerCase();
    if (/(reply|email|book|schedule|invite|remind|resched|expense|invoice|form)/.test(lc)) return 15;
    if (/(write|design|code|analy|research|study|build|implement)/.test(lc)) return 60;
    return 30;
  };

  // --- Normalize & return final shape ---
  return tasks.map((originalTitle, i) => {
    const m = arr[i] || {};
    const title    = (m?.title && String(m.title).trim()) || originalTitle;
    const category = validCategories.includes(m?.category) ? m.category : "Social & Relational";
    const duration = validDur.has(m?.duration) ? m.duration : guessDuration(title);
    console.log(`Task classified: "${title}" => category=${category}, duration=${duration}`);
    return { title, category, duration };
  });
}