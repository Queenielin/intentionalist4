import { useState, KeyboardEvent } from 'react';
import { Plus } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { breakDownTasks } from '@/utils/taskAI';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TaskInputProps {
  onAddTask: (title: string, workType: 'deep' | 'light' | 'admin', duration: 15 | 30 | 60, isCategorizing?: boolean, tempId?: string, taskType?: string) => void;
}

export default function TaskInput({ onAddTask }: TaskInputProps) {
  const [taskTitle, setTaskTitle] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleAddTask = async () => {
    if (taskTitle.trim()) {
      setIsProcessing(true);
      try {
        // Break down the input into individual task titles
        const taskTitles = breakDownTasks(taskTitle);
        
        // Add tasks immediately with "categorizing" status
        const tempTaskIds: string[] = [];
        taskTitles.forEach((title) => {
          const tempId = `temp-${Date.now()}-${Math.random()}`;
          tempTaskIds.push(tempId);
          onAddTask(title, 'light', 30, true, tempId); // Add with categorizing flag
        });

        // Show immediate feedback
        toast({
          title: "Tasks added",
          description: `${taskTitles.length} task(s) added and categorizing...`,
          duration: 2000
        });

        setTaskTitle('');
        setIsProcessing(false);

        // Try streaming first for multiple tasks
        if (taskTitles.length > 1) {
          try {
            const response = await fetch(`https://kerstiyewadsqwkvrafq.supabase.co/functions/v1/categorize-tasks`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlcnN0aXlld2Fkc3F3a3ZyYWZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MjgxNDksImV4cCI6MjA3MzUwNDE0OX0.A7r5gtYbJfRaAZlubv8ivUq1R2262PaRED9DnJVhgH8`,
              },
              body: JSON.stringify({ tasks: taskTitles, stream: true }),
            });

            if (response.body) {
              const reader = response.body.getReader();
              const decoder = new TextDecoder();

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    const data = JSON.parse(line.slice(6));
                    const { index, classification } = data;
                    
                    // Update the specific task with AI classification
                    onAddTask(
                      taskTitles[index], 
                      classification.workType, 
                      classification.duration, 
                      false, // Remove categorizing flag
                      tempTaskIds[index], // Use temp ID to update existing task
                      classification.taskType
                    );

                    toast({
                      title: "Task updated",
                      description: `"${taskTitles[index]}" → ${classification.taskType}`,
                      duration: 1500
                    });
                  }
                }
              }
              return;
            }
          } catch (streamError) {
            console.log('Streaming failed, falling back to batch:', streamError);
          }
        }

        // Fallback to batch processing
        const { data, error } = await supabase.functions.invoke('categorize-tasks', {
          body: { tasks: taskTitles }
        });

        if (error) {
          console.error('Error categorizing tasks:', error);
          // Just remove categorizing flag, keep default classification
          tempTaskIds.forEach((tempId, index) => {
            onAddTask(taskTitles[index], 'light', 30, false, tempId, 'Social & Relational');
          });
        } else {
          const { classifications } = data;
          // Update each task with AI classification
          tempTaskIds.forEach((tempId, index) => {
            const classification = classifications[index];
            onAddTask(
              taskTitles[index], 
              classification.workType, 
              classification.duration, 
              false, 
              tempId,
              classification.taskType
            );
          });
        }
        
      } catch (error) {
        console.error('Error adding tasks:', error);
        toast({
          title: "Error",
          description: "Failed to add tasks. Please try again.",
          variant: "destructive"
        });
        setIsProcessing(false);
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleAddTask();
    }
  };

  return (
    <Card className="p-6 shadow-lg border-0 bg-gradient-to-r from-background to-muted/30">
      <div className="flex gap-3">
        <Textarea
          value={taskTitle}
          onChange={(e) => setTaskTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add multiple tasks (try: '1. Code for 2hr 2. Email clients 3. Review proposal')"
          className="flex-1 border-2 border-border/60 focus:border-primary transition-colors text-base min-h-[120px] focus-ring"
          autoFocus
        />
        <Button 
          onClick={handleAddTask}
          disabled={!taskTitle.trim() || isProcessing}
          className="h-12 px-6 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-all duration-300 shadow-lg hover:shadow-xl focus-ring"
        >
          <Plus className="w-5 h-5 mr-2" />
          {isProcessing ? 'Categorizing...' : 'Add Task'}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mt-3 text-center">
        ⌨️ Press Ctrl+Enter to add • Add multiple tasks at once • Specify time (e.g., "1hr", "30min")
      </p>
    </Card>
  );
}