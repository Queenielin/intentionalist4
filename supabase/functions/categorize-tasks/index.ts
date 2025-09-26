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
  const prompt = `You are an advanced task classifier. Return JSON array with objects containing:
- workType: one of ["deep","light","admin"] 
- duration: one of [15,30,60]
- taskType: specific subcategory
- groupingKey: short label for grouping

WORK TYPES:
🔵 DEEP: Strategy, Creative, Research, Building
🟢 LIGHT: Communication, Review, Organizing, Coordination  
🟡 ADMIN: Documentation, Scheduling, FileManagement, Operations

DURATIONS:
⚡ 15min: Quick tasks (emails, updates)
⏳ 30min: Medium focus (drafts, reviews)
🎯 60min: Deep focus (reports, coding)

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
      workType: 'light', duration: 30, taskType: 'Other', groupingKey: 'Other:General'
    }));
  }

  // Validate classifications
  const validWorkTypes = ['deep', 'light', 'admin'];
  const validDurations = [15, 30, 60];
  
  return classifications.map((c: any) => ({
    workType: validWorkTypes.includes(c.workType) ? c.workType : 'light',
    duration: validDurations.includes(c.duration) ? c.duration : 30,
    taskType: c.taskType || 'Other',
    groupingKey: c.groupingKey || 'Other:General'
  }));
}