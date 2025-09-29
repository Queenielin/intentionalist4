import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TaskInputProps {
  // Parent will create the Task with category left undefined and isCategorizing=true if desired,
  // then your backend will fill in {title, category, duration}.
  onAddTask: (title: string, duration: 15 | 30 | 60, scheduledDay?: 'today' | 'tomorrow') => void;
}

export default function TaskInput({ onAddTask }: TaskInputProps) {
  const [value, setValue] = useState('');
  const [duration, setDuration] = useState<15 | 30 | 60>(30);
  const [scheduledDay, setScheduledDay] = useState<'today' | 'tomorrow'>('today');

  const addOne = (title: string) => {
    const t = title.trim();
    if (!t) return;
    onAddTask(t, duration, scheduledDay);
  };

  const handleSubmit = () => {
    // support multi-line paste: add each non-empty line as a task
    const lines = value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    lines.forEach(addOne);
    setValue('');
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input
        placeholder="Add a task (press Enter). Paste multiple lines to add many."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
          }
        }}
      />

      <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v) as 15 | 30 | 60)}>
        <SelectTrigger className="w-[110px]">
          <SelectValue placeholder="Duration" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="15">15 min</SelectItem>
          <SelectItem value="30">30 min</SelectItem>
          <SelectItem value="60">60 min</SelectItem>
        </SelectContent>
      </Select>

      <Select value={scheduledDay} onValueChange={(v: 'today' | 'tomorrow') => setScheduledDay(v)}>
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Day" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="tomorrow">Tomorrow</SelectItem>
        </SelectContent>
      </Select>

      <Button onClick={handleSubmit}>Add</Button>
    </div>
  );
}
