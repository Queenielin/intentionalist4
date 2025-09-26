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

    // Categorize each task using Gemini API
    const categorizedTasks = [];
    
    for (const task of tasks) {
      const prompt = `You are an assistant for a task manager app. Given a user's task description, classify it into:

Work Depth → Deep Work / Light Work / Admin Work

Time Estimate → 30 / 60 / 90 (minutes, rounded to nearest block)

Task Type → A high-level category label so similar tasks can be grouped. (Examples: Writing, Research, Coding, Email, Meetings, Planning, Design, Review, Documentation, Learning, Chores)

Always return JSON only.

Task: "${task.title}"`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 200,
          }
        }),
      });

      const data = await response.json();
      console.log('Gemini response for task:', task.title, data);

      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const responseText = data.candidates[0].content.parts[0].text;
        
        try {
          // Extract JSON from the response
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const classification = JSON.parse(jsonMatch[0]);
            
            // Map Gemini response to our format
            let workType: 'deep' | 'light' | 'admin' = 'light';
            if (classification.work_depth === 'Deep Work') workType = 'deep';
            else if (classification.work_depth === 'Admin Work') workType = 'admin';
            
            let duration: 15 | 30 | 60 = 30;
            if (classification.time_estimate === '30') duration = 30;
            else if (classification.time_estimate === '60') duration = 60;
            else if (classification.time_estimate === '90') duration = 60; // Cap at 60

            categorizedTasks.push({
              ...task,
              workType,
              duration,
              taskType: classification.task_type || 'General'
            });
          } else {
            throw new Error('No valid JSON found in response');
          }
        } catch (parseError) {
          console.error('Error parsing Gemini response:', parseError, responseText);
          // Fallback to default categorization
          categorizedTasks.push({
            ...task,
            workType: task.workType || 'light',
            duration: task.duration || 30,
            taskType: 'General'
          });
        }
      } else {
        console.error('Unexpected Gemini API response structure:', data);
        // Fallback to default categorization
        categorizedTasks.push({
          ...task,
          workType: task.workType || 'light',
          duration: task.duration || 30,
          taskType: 'General'
        });
      }
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