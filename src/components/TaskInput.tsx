import { useState, KeyboardEvent } from 'react';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { categorizeTask } from '@/utils/taskAI';

interface TaskInputProps {
  onAddTask: (title: string, workType: 'deep' | 'light' | 'admin', duration: 15 | 30 | 60) => void;
}

export default function TaskInput({ onAddTask }: TaskInputProps) {
  const [taskTitle, setTaskTitle] = useState('');

  const handleAddTask = () => {
    if (taskTitle.trim()) {
      const { workType, duration } = categorizeTask(taskTitle);
      onAddTask(taskTitle.trim(), workType, duration);
      setTaskTitle('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddTask();
    }
  };

  return (
    <Card className="p-6 shadow-lg border-0 bg-gradient-to-r from-background to-muted/30">
      <div className="flex gap-3">
        <Input
          value={taskTitle}
          onChange={(e) => setTaskTitle(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="What needs to be done today? (AI will categorize it for you)"
          className="flex-1 border-2 border-border/60 focus:border-primary transition-colors text-base h-12 focus-ring"
          autoFocus
        />
        <Button 
          onClick={handleAddTask}
          disabled={!taskTitle.trim()}
          className="h-12 px-6 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-all duration-300 shadow-lg hover:shadow-xl focus-ring"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Task
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mt-3 text-center">
        ⌨️ Press Enter to quickly add tasks • AI automatically categorizes based on your input
      </p>
    </Card>
  );
}