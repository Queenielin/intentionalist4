import { supabase } from '@/integrations/supabase/client';
import type { Category8, AICategoryResult } from '@/types/task';

export async function categorizeTasksWithAI(taskTitles: string[]): Promise<AICategoryResult[]> {
  try {
    const { data, error } = await supabase.functions.invoke('categorize-tasks', {
      body: { tasks: taskTitles, stream: false }
    });

    if (error) {
      console.error('AI categorization error:', error);
      // Fallback to default categorization
      return taskTitles.map(title => ({
        title,
        category: 'Social & Relational' as Category8,
        duration: 30 as const
      }));
    }

    return data.classifications || [];
  } catch (error) {
    console.error('Failed to categorize tasks:', error);
    // Fallback to default categorization
    return taskTitles.map(title => ({
      title,
      category: 'Social & Relational' as Category8,
      duration: 30 as const
    }));
  }
}

export async function categorizeTasksWithAIStream(
  taskTitles: string[],
  onTaskCategorized: (index: number, result: AICategoryResult) => void
): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('categorize-tasks', {
      body: { tasks: taskTitles, stream: true }
    });

    if (error) {
      console.error('AI categorization stream error:', error);
      // Fallback: categorize all at once
      const results = await categorizeTasksWithAI(taskTitles);
      results.forEach((result, index) => {
        onTaskCategorized(index, result);
      });
      return;
    }

    // Handle streaming response
    if (data && typeof data.getReader === 'function') {
      const reader = data.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.index !== undefined && data.classification) {
                onTaskCategorized(data.index, data.classification);
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', e);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to stream categorize tasks:', error);
    // Fallback to non-streaming
    const results = await categorizeTasksWithAI(taskTitles);
    results.forEach((result, index) => {
      onTaskCategorized(index, result);
    });
  }
}