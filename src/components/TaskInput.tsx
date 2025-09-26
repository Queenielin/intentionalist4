import { useState, KeyboardEvent } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { parseTaskInput } from '@/utils/taskAI';

interface TaskInputProps {
  onAddTask: (title: string, workType: 'deep' | 'light' | 'admin', duration: 15 | 30 | 60) => void;
  onAddMultipleTasks?: (tasks: Array<{title: string; workType: 'deep' | 'light' | 'admin'; duration: 15 | 30 | 60}>) => void;
}

export default function TaskInput({ onAddTask, onAddMultipleTasks }: TaskInputProps) {
  const [taskTitle, setTaskTitle] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingTasks, setPendingTasks] = useState<Array<{title: string; workType: 'deep' | 'light' | 'admin'; duration: 15 | 30 | 60}>>([]);
  const { toast } = useToast();

  const handleAddTask = () => {
    if (taskTitle.trim()) {
      const tasks = parseTaskInput(taskTitle);
      
      if (tasks.length > 1 && onAddMultipleTasks) {
        // Show confirmation for multiple tasks
        setPendingTasks(tasks);
        toast({
          title: "Multiple tasks detected",
          description: `Found ${tasks.length} tasks. Would you like to use AI grouping?`,
        });
      } else {
        // Single task, add normally
        tasks.forEach(({ title, workType, duration }) => {
          onAddTask(title, workType, duration);
        });
        setTaskTitle('');
      }
    }
  };

  const handleConfirmGrouping = async () => {
    if (pendingTasks.length === 0) return;
    
    setIsProcessing(true);
    try {
      const response = await supabase.functions.invoke('categorize-tasks', {
        body: { tasks: pendingTasks }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { categorizedTasks, groups } = response.data;
      
      if (onAddMultipleTasks && categorizedTasks) {
        onAddMultipleTasks(categorizedTasks);
        toast({
          title: "Tasks categorized successfully!",
          description: `Added ${categorizedTasks.length} tasks with AI grouping.`,
        });
      }
      
      setPendingTasks([]);
      setTaskTitle('');
    } catch (error) {
      console.error('Error categorizing tasks:', error);
      toast({
        title: "Error",
        description: "Failed to categorize tasks. Adding normally.",
        variant: "destructive",
      });
      
      // Fallback to normal addition
      pendingTasks.forEach(({ title, workType, duration }) => {
        onAddTask(title, workType, duration);
      });
      setPendingTasks([]);
      setTaskTitle('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkipGrouping = () => {
    pendingTasks.forEach(({ title, workType, duration }) => {
      onAddTask(title, workType, duration);
    });
    setPendingTasks([]);
    setTaskTitle('');
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
          disabled={isProcessing}
        />
        <Button 
          onClick={handleAddTask}
          disabled={!taskTitle.trim() || isProcessing}
          className="h-12 px-6 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-all duration-300 shadow-lg hover:shadow-xl focus-ring"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Task
        </Button>
      </div>
      
      {/* Confirmation dialog for AI grouping */}
      {pendingTasks.length > 0 && (
        <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="font-medium">AI Grouping Available</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {pendingTasks.length} tasks detected. Use AI to categorize and group similar tasks?
          </p>
          <div className="flex gap-2">
            <Button 
              onClick={handleConfirmGrouping}
              disabled={isProcessing}
              size="sm"
              className="bg-primary hover:bg-primary/90"
            >
              {isProcessing ? (
                <>
                  <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 mr-1" />
                  Use AI Grouping
                </>
              )}
            </Button>
            <Button 
              onClick={handleSkipGrouping}
              disabled={isProcessing}
              size="sm"
              variant="outline"
            >
              Skip & Add Normally
            </Button>
          </div>
        </div>
      )}
      
      <p className="text-sm text-muted-foreground mt-3 text-center">
        ⌨️ Press Ctrl+Enter to add • Add multiple tasks at once • Specify time (e.g., "1hr", "30min") • AI grouping for multiple tasks
      </p>
    </Card>
  );
}