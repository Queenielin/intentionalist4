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
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    console.log('Processing tasks for categorization:', tasks);

    // Create batch prompt for all tasks
    const taskTitles = tasks.map((task: any) => `"${task.title}"`).join('\n');
    
    const batchPrompt = `You are a classifier for a task manager. Given a single task title or short description, return a JSON object with:
- workType: one of ["deep","light","admin"] (lowercase only)
- duration: one of [15,30,60] (minutes, integer)
- taskType: one of [
  "Email","Comms","Calls","Meetings","Planning","Writing","Reading",
  "Research","Coding","Design","Documentation","Applications","Finance",
  "Travel","Reviews","Chores","Learning","Other"
]
- groupingKey: short label used to group similar tasks (e.g., "Email:Support", "Comms:LinkedIn", "Applications:Kaplan")

Rules:
1) Never output "General". If nothing fits, use "Other" with a sensible groupingKey.
2) Depth:
   - admin → logistics/coordination/comms/scheduling/forms/payments/travel.
   - deep → creation/analysis/learning/coding/writing/design/research/strategy.
   - light → quick chores/small edits/short replies/reviews/labeling/filing.
3) Duration heuristics (round to nearest of 15/30/60):
   - 15 → ultra-quick replies (1–2 messages), single confirmation/lookup, tiny edits, a single rating or review.
   - 30 → small batches (3–6 emails/chats), simple bookings/forms, short reviews, brief planning.
   - 60 → drafting/learning/research sessions, non-trivial coding/design, longer applications/prep.
4) Keyword nudges (not exclusive):
   - admin: reply, email, message, WhatsApp, LinkedIn, call, schedule, book, arrange, confirm, invoice, expense, receipt, submit, form, register, apply, visa, Airbnb, travel.
   - deep: draft, write, analyze, journal, research, study, learn, read chapter, design, architecture, refactor, implement, prototype, build, strategy.
   - light: quick, review (short), tidy, rename, format, minor fix, rate, label.
5) Output JSON only. No explanations. Use integers for duration.

FORMAT
{
  "workType": "deep|light|admin",
  "duration": 15|30|60,
  "taskType": "OneOfTheList",
  "groupingKey": "ShortGroupingLabel"
}

FEW-SHOT EXAMPLES

Input: "Reply to 5 customer support emails"
Output: {"workType":"admin","duration":30,"taskType":"Email","groupingKey":"Email:Support"}

Input: "Prepare slides for Monday's strategy meeting"
Output: {"workType":"deep","duration":60,"taskType":"Design","groupingKey":"Design:Strategy Deck"}

Input: "Schedule 1:1 with team members"
Output: {"workType":"admin","duration":30,"taskType":"Meetings","groupingKey":"Meetings:1:1 Scheduling"}

Input: "Refactor the authentication module"
Output: {"workType":"deep","duration":60,"taskType":"Coding","groupingKey":"Coding:Auth Refactor"}

Input: "Organize expense receipts and submit reimbursement form"
Output: {"workType":"admin","duration":30,"taskType":"Finance","groupingKey":"Finance:Expenses"}

Input: "Fix typo on landing page"
Output: {"workType":"light","duration":15,"taskType":"Design","groupingKey":"Design:Landing Page Edit"}

Input: "Draft 500-word blog post on feature X"
Output: {"workType":"deep","duration":60,"taskType":"Writing","groupingKey":"Writing:Feature X Blog"}

-- YOUR TASKS (examples) --

Input: "1 journal & analysis"
Output: {"workType":"deep","duration":60,"taskType":"Planning","groupingKey":"Planning:Journaling"}

Input: "Reply to LinkedIn"
Output: {"workType":"admin","duration":15,"taskType":"Comms","groupingKey":"Comms:LinkedIn"}

Input: "Study adhd class - adhd content of the day"
Output: {"workType":"deep","duration":60,"taskType":"Learning","groupingKey":"Learning:ADHD Course"}

Input: "reply to Specialsterm AU"
Output: {"workType":"admin","duration":15,"taskType":"Email","groupingKey":"Email:Specialsterm AU"}

Input: "reply to bali Airbnb"
Output: {"workType":"admin","duration":15,"taskType":"Travel","groupingKey":"Travel:Airbnb Bali"}

Input: "write google review"
Output: {"workType":"light","duration":15,"taskType":"Reviews","groupingKey":"Reviews:Google"}

Input: "reply to TW emails"
Output: {"workType":"admin","duration":30,"taskType":"Email","groupingKey":"Email:TW"}

Input: "reply to Julie"
Output: {"workType":"admin","duration":15,"taskType":"Comms","groupingKey":"Comms:Julie"}

Input: "coding"
Output: {"workType":"deep","duration":60,"taskType":"Coding","groupingKey":"Coding:General"}

Input: "Apply for netherlands program"
Output: {"workType":"admin","duration":60,"taskType":"Applications","groupingKey":"Applications:Netherlands Program"}

Input: "Make an mvp"
Output: {"workType":"deep","duration":60,"taskType":"Coding","groupingKey":"Coding:MVP Prototype"}

Input: "Read innovation book"
Output: {"workType":"deep","duration":60,"taskType":"Reading","groupingKey":"Reading:Innovation Book"}

Input: "Write goal of mvp"
Output: {"workType":"deep","duration":30,"taskType":"Planning","groupingKey":"Planning:MVP Goals"}

Input: "Reply to whtsapp + apollonia"
Output: {"workType":"admin","duration":15,"taskType":"Comms","groupingKey":"Comms:WhatsApp Apollonia"}

Input: "Kaplan scholarship write!"
Output: {"workType":"deep","duration":60,"taskType":"Writing","groupingKey":"Applications:Kaplan Essay"}

Now classify these tasks. Return a JSON array where each element corresponds to the task at the same index:

${taskTitles}

Return format: [{"workType":"...","duration":...,"taskType":"...","groupingKey":"..."},...]`;

    const categorizedTasks: any[] = [];

    try {
      console.log('Calling Gemini API for batch classification');
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: batchPrompt
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1000,
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Gemini batch response:', JSON.stringify(data, null, 2));

      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
        const responseText = data.candidates[0].content.parts[0].text.trim();
        console.log('Raw Gemini batch response text:', responseText);
        
        // Clean the response text and extract JSON array
        let cleanedText = responseText;
        
        // Remove markdown code blocks if present
        cleanedText = cleanedText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
        // Find JSON array
        const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
        
        if (jsonMatch) {
          const classifications = JSON.parse(jsonMatch[0]);
          console.log('Parsed classifications:', classifications);
          
          // Map each classification to a task
          tasks.forEach((task: any, index: number) => {
            const classification = classifications[index];
            
            if (classification) {
              // Use the correct field names from the new schema
              const workType = classification.workType || 'light';
              const duration = classification.duration || 30;
              const taskType = classification.taskType || 'Other';
              const groupingKey = classification.groupingKey || `${taskType}:General`;

              categorizedTasks.push({
                ...task,
                id: task.id || `task-${Date.now()}-${Math.random()}-${index}`,
                workType,
                duration,
                taskType,
                groupingKey
              });
              
              console.log('Successfully categorized task:', task.title, 'as', workType, duration, taskType, groupingKey);
            } else {
              // Fallback for missing classification
              categorizedTasks.push({
                ...task,
                id: task.id || `task-${Date.now()}-${Math.random()}-${index}`,
                workType: 'light',
                duration: 30,
                taskType: 'Other',
                groupingKey: 'Other:General'
              });
              console.log('Used fallback for task:', task.title);
            }
          });
        } else {
          throw new Error(`No valid JSON array found in Gemini response: ${responseText}`);
        }
      } else {
        throw new Error(`Invalid Gemini API response structure: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      console.error('Error in batch processing with Gemini:', error);
      
      // Fallback: create tasks with default values
      tasks.forEach((task: any, index: number) => {
        categorizedTasks.push({
          ...task,
          id: task.id || `task-${Date.now()}-${Math.random()}-${index}`,
          workType: 'light',
          duration: 30,
          taskType: 'Other',
          groupingKey: 'Other:General'
        });
      });
    }

    // Group similar tasks
    const groups = groupSimilarTasks(categorizedTasks);

    return new Response(JSON.stringify({ categorizedTasks, groups }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in categorize-tasks function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function groupSimilarTasks(tasks: any[]) {
  const groups: any[] = [];
  const usedTaskIds = new Set();

  // Group by task type and work type
  const tasksByType = tasks.reduce((acc, task) => {
    const key = `${task.taskType}-${task.workType}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});

  for (const [typeKey, typeTasks] of Object.entries(tasksByType) as [string, any[]][]) {
    if (typeTasks.length < 2) continue; // Only group if there are 2+ similar tasks

    // Sort tasks by duration for better grouping
    typeTasks.sort((a, b) => a.duration - b.duration);

    let currentGroup: any[] = [];
    let currentGroupTime = 0;

    for (const task of typeTasks) {
      if (usedTaskIds.has(task.id)) continue;

      // If adding this task would exceed 60 minutes, start a new group
      if (currentGroupTime + task.duration > 60 && currentGroup.length > 0) {
        if (currentGroup.length >= 2) {
          groups.push({
            id: `group-${groups.length}`,
            title: `${currentGroup[0].taskType} Tasks`,
            taskIds: currentGroup.map(t => t.id),
            workType: currentGroup[0].workType,
            duration: Math.min(60, currentGroupTime),
            taskType: currentGroup[0].taskType,
            totalTime: currentGroupTime
          });
          
          currentGroup.forEach(t => usedTaskIds.add(t.id));
        }
        
        currentGroup = [task];
        currentGroupTime = task.duration;
      } else {
        currentGroup.push(task);
        currentGroupTime += task.duration;
      }
    }

    // Add remaining group if it has 2+ tasks
    if (currentGroup.length >= 2) {
      groups.push({
        id: `group-${groups.length}`,
        title: `${currentGroup[0].taskType} Tasks`,
        taskIds: currentGroup.map(t => t.id),
        workType: currentGroup[0].workType,
        duration: Math.min(60, currentGroupTime),
        taskType: currentGroup[0].taskType,
        totalTime: currentGroupTime
      });
      
      currentGroup.forEach(t => usedTaskIds.add(t.id));
    }
  }

  return groups;
}