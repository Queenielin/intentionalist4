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

Always return JSON only. Do not include any explanation or markdown formatting.

Task: "${task.title}"`;

      try {
        console.log('Calling Gemini API for task:', task.title);
        
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

        if (!response.ok) {
          throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Gemini response for task:', task.title, JSON.stringify(data, null, 2));

        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
          const responseText = data.candidates[0].content.parts[0].text.trim();
          console.log('Raw Gemini response text:', responseText);
          
          // Clean the response text and extract JSON
          let cleanedText = responseText;
          
          // Remove markdown code blocks if present
          cleanedText = cleanedText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
          
          // Find JSON object
          const jsonMatch = cleanedText.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
          
          if (jsonMatch) {
            const classification = JSON.parse(jsonMatch[0]);
            console.log('Parsed classification:', classification);
            
            // Map Gemini response to our format
            let workType: 'deep' | 'light' | 'admin' = 'light';
            if (classification.work_depth === 'Deep Work') workType = 'deep';
            else if (classification.work_depth === 'Admin Work') workType = 'admin';
            else if (classification.work_depth === 'Light Work') workType = 'light';
            
            let duration: 15 | 30 | 60 = 30;
            const timeEstimate = parseInt(classification.time_estimate);
            if (timeEstimate === 30) duration = 30;
            else if (timeEstimate === 60) duration = 60;
            else if (timeEstimate === 90) duration = 60; // Cap at 60

            categorizedTasks.push({
              ...task,
              id: task.id || `task-${Date.now()}-${Math.random()}`,
              workType,
              duration,
              taskType: classification.task_type || 'General'
            });
            
            console.log('Successfully categorized task:', task.title, 'as', workType, duration, classification.task_type);
          } else {
            throw new Error(`No valid JSON found in Gemini response: ${responseText}`);
          }
        } else {
          throw new Error(`Invalid Gemini API response structure: ${JSON.stringify(data)}`);
        }
      } catch (error) {
        console.error('Error processing task with Gemini:', task.title, error);
        // Fallback to original task properties
        categorizedTasks.push({
          ...task,
          id: task.id || `task-${Date.now()}-${Math.random()}`,
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