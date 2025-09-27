// No need for std/http in Edge/Deploy:
import "https://deno.land/x/xhr@0.1.0/mod.ts"; // fetch/XMLHttpRequest polyfill for some libs

const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Authorization, X-Client-Info, apikey, Content-Type, X-Requested-With",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Parse JSON body once
    const { tasks, stream = false } = await req.json().catch(() => ({}));
    if (!tasks || !Array.isArray(tasks)) {
      return new Response(JSON.stringify({ error: "Tasks array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY is not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- STREAMING (SSE) ---
    if (stream) {
      const encoder = new TextEncoder();

      const readableStream = new ReadableStream<Uint8Array>({
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

                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(result)}\n\n`),
                );
              } catch (taskErr) {
                controller.enqueue(
                  encoder.encode(
                    `event: error\ndata: ${JSON.stringify({
                      index: i,
                      message: String(taskErr),
                    })}\n\n`,
                  ),
                );
              }
            }
            // Optional end signal
            controller.enqueue(encoder.encode("event: end\ndata: done\n\n"));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }

    // --- NON-STREAMING ---
    const classifications = await classifyTasks(tasks, GEMINI_API_KEY);
    return new Response(JSON.stringify({ classifications }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in categorize-tasks function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// -------- Utilities --------

// Extract a time hint from a raw task (15|30|60) and return a cleaned title without the time tokens.
// Keeps counts like "10 emails" intact; only removes time words like "15m", "30 min", "1h", etc.
function extractTimeHint(raw: string): { title: string; durationHint: 15 | 30 | 60 | null } {
  const original = String(raw);
  let duration: 15 | 30 | 60 | null = null;

  const lower = original.toLowerCase();

  // Decide duration from hint (cap at 60 for a single block)
  if (/\b(15m|15\s*min(?:ute)?s?|quarter[- ]?hour|quick)\b/i.test(lower)) {
    duration = 15;
  } else if (/\b(30m|30\s*min(?:ute)?s?|half[- ]?hour)\b/i.test(lower)) {
    duration = 30;
  } else if (/\b(60m|1h|1\s*hour|full[- ]?hour)\b/i.test(lower)) {
    duration = 60;
  } else if (/\b(90m|1\.5h|1\.5\s*hours)\b/i.test(lower)) {
    duration = 60; // clamp
  } else if (/\b(2h|2\s*hours|120m)\b/i.test(lower)) {
    duration = 60; // clamp
  }

  // Remove ONLY time tokens; keep counts like "10 emails"
  let cleaned = original
    .replace(
      /\b(15m|15\s*min(?:ute)?s?|30m|30\s*min(?:ute)?s?|60m|1h|1\s*hour|2h|2\s*hours|90m|120m|half[- ]?hour|quarter[- ]?hour|full[- ]?hour|quick)\b/ig,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) cleaned = original.trim();

  return { title: cleaned, durationHint: duration };
}

// Core classifier (Gemini JSON mode + schema)
async function classifyTasks(tasks: string[], apiKey: string) {
  const validCategories = [
    "Analytical × Strategic",
    "Creative × Generative",
    "Learning × Absorptive",
    "Constructive × Building",
    "Social & Relational",
    "Critical & Structuring",
    "Clerical & Admin Routines",
    "Logistics & Maintenance",
  ] as const;

  // Preprocess: remove time hints from titles (but remember their value)
  const pre = tasks.map(extractTimeHint);
  const cleaned = pre.map((p) => p.title);
  const hintDurations = pre.map((p) => p.durationHint);

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
${cleaned.map((task, i) => `${i + 1}. ${task}`).join("\n")}
`;

  // Gemini REST call (v1beta)
  const resp = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-8b:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          max_output_tokens: 512,
          response_mime_type: "application/json",
          response_schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                category: { type: "string", enum: [...validCategories] },
                duration: { type: "number", enum: [15, 30, 60] },
              },
              required: ["title", "category", "duration"],
              additionalProperties: false,
            },
          },
        },
      }),
    },
  );

  // Handle non-200 early
  if (!resp.ok) {
    const errBody = await resp.text().catch(() => "");
    console.error("Gemini HTTP error:", resp.status, errBody);
    // Graceful fallback
    return tasks.map((t) => ({
      title: t,
      category: "Social & Relational",
      duration: 30 as const,
    }));
  }

  // Parse robustly
  const data = await resp.json().catch(() => ({}));
  const part = data?.candidates?.[0]?.content?.parts?.[0];
  let arr: unknown = [];

  try {
    if (part?.json) {
      arr = part.json;
    } else {
      const text = (part?.text ?? "").trim().replace(/```json|```/g, "");
      arr = text ? JSON.parse(text) : [];
    }
  } catch {
    arr = [];
  }

  // Type guard-ish
  const maybeArray = Array.isArray(arr) ? arr : [];

  const validDur = new Set([15, 30, 60] as const);
  const guessDuration = (s: string): 15 | 30 | 60 => {
    const lc = s.toLowerCase();
    // keep 'booking' separate from 'book'
    if (/(reply|email|inbox|schedule|invite|remind|reschedul|expense|invoice|form|receipt|dm|text|ping)/.test(lc)) return 15;
    if (/(write|design|code|analy[sz]|research|study|build|implement|prototype|refactor|diagram)/.test(lc)) return 60;
    return 30;
  };

  // Normalize & return final shape
  return tasks.map((originalTitle, i) => {
    const modelItem = (maybeArray[i] ?? {}) as {
      title?: unknown;
      category?: unknown;
      duration?: unknown;
    };

    const { title: cleanedTitle, durationHint } = extractTimeHint(originalTitle);

    const title =
      typeof modelItem.title === "string" && modelItem.title.trim()
        ? modelItem.title.trim()
        : cleanedTitle;

    const category =
      typeof modelItem.category === "string" &&
      (validCategories as readonly string[]).includes(modelItem.category)
        ? (modelItem.category as (typeof validCategories)[number])
        : ("Social & Relational" as const);

    const modelDur =
      typeof modelItem.duration === "number" && validDur.has(modelItem.duration as 15 | 30 | 60)
        ? (modelItem.duration as 15 | 30 | 60)
        : null;

    const duration = (modelDur ?? durationHint ?? guessDuration(title)) as 15 | 30 | 60;

    console.log(`Task classified: "${title}" => category=${category}, duration=${duration}`);
    return { title, category, duration };
  });
}
