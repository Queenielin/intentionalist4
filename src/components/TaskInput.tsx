import { useState, KeyboardEvent } from 'react';
import { Plus } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { breakDownTasks } from '@/utils/taskAI';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TaskInputProps {
  onAddTask: (title: string, workType: 'deep' | 'light' | 'admin', duration: 15 | 30 | 60) => void;
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
        
        // Call the categorize-tasks edge function
        const { data, error } = await supabase.functions.invoke('categorize-tasks', {
          body: { tasks: taskTitles }
        });

        if (error) {
          console.error('Error categorizing tasks:', error);
          toast({
            title: "Categorization failed",
            description: "Using fallback categorization",
            variant: "destructive"
          });
          // Fallback to local parsing
          const { parseTaskInput } = await import('@/utils/taskAI');
          const fallbackTasks = parseTaskInput(taskTitle);
          fallbackTasks.forEach(({ title, workType, duration }) => {
            onAddTask(title, workType, duration);
          });
        } else {
          const { classifications } = data;
          // Add each classified task
          taskTitles.forEach((title, index) => {
            const classification = classifications[index];
            onAddTask(title, classification.workType, classification.duration);
            
            // Show classification result
            toast({
              title: "Task categorized",
              description: `"${title}" → ${classification.taskType} (${classification.workType} work, ${classification.duration} min)`,
              duration: 2000
            });
          });
        }
        
        setTaskTitle('');
      } catch (error) {
        console.error('Error adding tasks:', error);
        toast({
          title: "Error",
          description: "Failed to add tasks. Please try again.",
          variant: "destructive"
        });
      } finally {
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