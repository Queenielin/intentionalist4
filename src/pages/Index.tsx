// src/components/TaskInput.tsx
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea'; // ⬅️ use shadcn Textarea (or swap to native <textarea>)
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TaskInputProps {
  // Parent creates the Task, AI fills { title, category, duration } later.
  onAddTask: (title: string, duration: 15 | 30 | 60, scheduledDay?: 'today' | 'tomorrow') => void;
}

export default function TaskInput({ onAddTask }: TaskInputProps) {
  const [value, setValue] = useState('');
  const [duration, setDuration] = useState<15 | 30 | 60>(30);
  const [scheduledDay, setScheduledDay] = useState<'today' | 'tomorrow'>('today');

  const addOne = useCallback((title: string) => {
    const t = title.trim();
    if (!t) return;
    onAddTask(t, duration, scheduledDay);
  }, [onAddTask, duration, scheduledDay]);

  const handleSubmit = useCallback(() => {
    // Split by lines, ignore empties
    const lines = value.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    lines.forEach(addOne);
    setValue('');
  }, [value, addOne]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // ⌘/Ctrl + Enter submits
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
      return;
    }
    // Plain Enter should create a newline — do not preventDefault.
    // Shift+Enter also naturally makes a newline.
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <div className="flex-1 space-y-1">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          rows={6}
          className="resize-y"
          placeholder={`One task per line, e.g.:
1 journal & analysis
Reply to LinkedIn
Study adhd class - adhd content of the day
reply to Specialsterm AU
reply to bali Airbnb
write google review
...`}
          spellCheck
        />
        <div className="text-xs text-muted-foreground">
          Press <kbd className="px-1">⌘/Ctrl</kbd>+<kbd className="px-1">Enter</kbd> to add all lines. Enter adds a new line.
        </div>
      </div>

      <div className="flex gap-2 sm:flex-col sm:w-[260px]">
        <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v) as 15 | 30 | 60)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Duration" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="15">15 min</SelectItem>
            <SelectItem value="30">30 min</SelectItem>
            <SelectItem value="60">60 min</SelectItem>
          </SelectContent>
        </Select>

        <Select value={scheduledDay} onValueChange={(v: 'today' | 'tomorrow') => setScheduledDay(v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Day" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="tomorrow">Tomorrow</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={handleSubmit} className="whitespace-nowrap">
          Add Tasks
        </Button>
      </div>
    </div>
  );
}
