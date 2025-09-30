// src/components/TaskInput.tsx
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface TaskInputProps {
  onAddTask: (title: string, duration: 15 | 30 | 60, scheduledDay?: 'today' | 'tomorrow') => void;
}

export default function TaskInput({ onAddTask }: TaskInputProps) {
  const [value, setValue] = useState('');

  const addOne = useCallback((title: string) => {
    const t = title.trim();
    if (!t) return;
    // Default to 30 minutes and today
    onAddTask(t, 30, 'today');
  }, [onAddTask]);

  const handleSubmit = useCallback(() => {
    // split by newlines; keep each line as its own task
    const lines = value.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    lines.forEach(addOne);
    setValue('');
  }, [value, addOne]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on ⌘/Ctrl+Enter
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
      return;
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          className="resize-none border-2 border-primary/30 focus:border-primary text-base min-h-[60px]"
          placeholder="Add your tasks here..."
        />
      </div>

      <Button 
        onClick={handleSubmit} 
        className="w-full px-6 py-3 h-auto text-base font-medium"
        size="lg"
      >
        + Add Task
      </Button>
      
      <div className="text-sm text-muted-foreground">
       
        ⌘ Press Ctrl+Enter to input tasks  <br/>
  • Add multiple tasks at once  <br/>
 • Specify time (e.g., "1hr", "30min") <br/>
      </div>
    </div>
  );
}