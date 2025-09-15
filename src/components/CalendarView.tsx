import { useMemo, useState } from 'react';
import { Task, TimeSlot } from '@/types/task';
import { Card } from '@/components/ui/card';
import { getWorkTypeColor } from '@/utils/taskAI';
import { Progress } from '@/components/ui/progress';
import { Clock, Trophy, Target, Coffee, Dumbbell, Utensils, Users, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CalendarViewProps {
  tasks: Task[];
}

export default function CalendarView({ tasks }: CalendarViewProps) {
  const [breaks, setBreaks] = useState<TimeSlot[]>([]);
  const [newBreakTime, setNewBreakTime] = useState('');
  const [newBreakType, setNewBreakType] = useState<'exercise' | 'nap' | 'food' | 'meeting' | 'other'>('food');
  const [newBreakLabel, setNewBreakLabel] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  // Build hours and half-hour slots for the day
  const dayLength = 9; // hours
  const hourRows = useMemo(() => {
    const [startHour] = startTime.split(':').map(Number);
    return Array.from({ length: dayLength }, (_, i) => startHour + i);
  }, [startTime]);

  const timeSlots = useMemo(() => {
    // Half-hour granularity (e.g., 09:00, 09:30, 10:00, ...)
    return hourRows.flatMap((hour) => [
      { id: `${hour}:00`, time: `${hour}:00`, hour, minute: 0 as 0 | 30 },
      { id: `${hour}:30`, time: `${hour}:30`, hour, minute: 30 as 0 | 30 },
    ]);
  }, [hourRows]);

const scheduleResult = useMemo(() => {
  type Segment = {
    kind: 'task' | 'break';
    minutes: number; // minutes within the half-hour slot
    task?: Task;
    label?: string;
    breakType?: 'exercise' | 'nap' | 'food' | 'meeting' | 'other';
  };

  type HalfState = {
    hour: number;
    minute: 0 | 30;
    segments: Segment[];
    remaining: number; // remaining minutes in this half (max 30)
  };

  // Initialize half-hour slots for the day
  const halves: HalfState[] = timeSlots.map((s) => ({
    hour: s.hour,
    minute: s.minute,
    segments: [],
    remaining: 30,
  }));

  const findNextHalfWith = (minNeeded: number, startIndex: number) => {
    let idx = startIndex;
    while (idx < halves.length && halves[idx].remaining < minNeeded) idx++;
    return idx;
  };

  let cursor = 0;

  const place15 = (task: Task) => {
    cursor = findNextHalfWith(15, cursor);
    if (cursor >= halves.length) return;
    halves[cursor].segments.push({ kind: 'task', minutes: 15, task });
    halves[cursor].remaining -= 15;
  };

  const place30 = (task: Task) => {
    cursor = findNextHalfWith(30, cursor);
    if (cursor >= halves.length) return;
    halves[cursor].segments.push({ kind: 'task', minutes: 30, task });
    halves[cursor].remaining = 0;
    cursor += 1;
  };

  const place60WithBreak = (task: Task) => {
    // First half: 30m work
    cursor = findNextHalfWith(30, cursor);
    if (cursor >= halves.length) return;
    halves[cursor].segments.push({ kind: 'task', minutes: 30, task });
    halves[cursor].remaining = 0;
    cursor += 1;

    // Second half: 20m work + 10m break
    cursor = findNextHalfWith(30, cursor);
    if (cursor >= halves.length) return;
    halves[cursor].segments.push({ kind: 'task', minutes: 20, task });
    halves[cursor].segments.push({ kind: 'break', minutes: 10, label: 'Break' });
    halves[cursor].remaining = 0;
    cursor += 1;
  };

  const scheduled = tasks.filter((t) => !t.completed).map((t) => ({ ...t } as Task));

  const deepTasks = scheduled.filter((t) => t.workType === 'deep');
  const lightTasks = scheduled.filter((t) => t.workType === 'light');
  const adminTasks = scheduled.filter((t) => t.workType === 'admin');

  const placeTask = (t: Task) => {
    if (t.duration === 60) place60WithBreak(t);
    else if (t.duration === 30) place30(t);
    else place15(t);
  };

  // Schedule deep work first
  deepTasks.forEach(placeTask);

  // Automatic 1h break between deep and light (2 x 30min halves)
  const autoBreakKeys: string[] = [];
  const addAutoBreak = () => {
    const startBreakIdx = findNextHalfWith(30, cursor);
    if (startBreakIdx < halves.length) {
      halves[startBreakIdx].segments = [{ kind: 'break', minutes: 30, label: 'Break' }];
      halves[startBreakIdx].remaining = 0;
      autoBreakKeys.push(`${halves[startBreakIdx].hour}:${halves[startBreakIdx].minute.toString().padStart(2, '0')}`);
      const nextIdx = startBreakIdx + 1;
      if (nextIdx < halves.length) {
        halves[nextIdx].segments = [{ kind: 'break', minutes: 30, label: 'Break' }];
        halves[nextIdx].remaining = 0;
        autoBreakKeys.push(`${halves[nextIdx].hour}:${halves[nextIdx].minute.toString().padStart(2, '0')}`);
        cursor = nextIdx + 1;
      } else {
        cursor = startBreakIdx + 1;
      }
    }
  };
  addAutoBreak();

  // Then light and admin work
  lightTasks.forEach(placeTask);
  adminTasks.forEach(placeTask);

  // Overlay user-added breaks (replace contents of that half)
  breaks.forEach((b) => {
    const idx = halves.findIndex((h) => h.hour === b.hour && h.minute === b.minute);
    if (idx !== -1) {
      halves[idx].segments = [
        { kind: 'break', minutes: 30, label: b.breakLabel || 'Break', breakType: b.breakType },
      ];
      halves[idx].remaining = 0;
    }
  });

  const halvesByKey: Record<string, HalfState> = {};
  halves.forEach((h) => {
    const key = `${h.hour}:${h.minute.toString().padStart(2, '0')}`;
    halvesByKey[key] = h;
  });

  return { halvesByKey, hourRows, autoBreakKeys };
}, [tasks, timeSlots, breaks, hourRows]);

  const completedTasks = tasks.filter(t => t.completed);
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;

const getSegmentsForHalf = (hour: number, minute: 0 | 30) => {
  const key = `${hour}:${minute.toString().padStart(2, '0')}`;
  return scheduleResult.halvesByKey[key]?.segments || [];
};

  const getBreakIcon = (type: string) => {
    switch (type) {
      case 'exercise': return <Dumbbell className="w-3 h-3" />;
      case 'nap': return <div className="w-3 h-3 rounded-full bg-current" />;
      case 'food': return <Utensils className="w-3 h-3" />;
      case 'meeting': return <Users className="w-3 h-3" />;
      default: return <Coffee className="w-3 h-3" />;
    }
  };

  const addBreak = () => {
    if (newBreakTime && newBreakLabel) {
      const [hour, minute] = newBreakTime.split(':').map(Number);
      const newBreak: TimeSlot = {
        id: `break-${newBreakTime}`,
        time: newBreakTime,
        hour,
        minute: minute as 0 | 30,
        isBreak: true,
        breakType: newBreakType,
        breakLabel: newBreakLabel
      };
      setBreaks(prev => [...prev, newBreak].sort((a, b) => {
        if (a.hour === b.hour) return a.minute - b.minute;
        return a.hour - b.hour;
      }));
      setNewBreakTime('');
      setNewBreakLabel('');
    }
  };

  const removeBreak = (breakId: string) => {
    setBreaks(prev => prev.filter(b => b.id !== breakId));
  };

  return (
    <div className="space-y-6">
      {/* Progress Stats */}
      <Card className="p-6 bg-gradient-to-r from-background to-muted/30 border-0 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Daily Progress
          </h3>
          <div className="text-2xl font-bold text-primary">
            {completedTasks.length}/{totalTasks}
          </div>
        </div>
        <Progress value={completionRate} className="h-3 progress-gradient" />
        <p className="text-sm text-muted-foreground mt-2">
          {completionRate.toFixed(0)}% completed • Keep up the great work!
        </p>
      </Card>

      {/* Add Break Section */}
      <Card className="p-4 border-0 shadow-lg bg-muted/30">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Break
        </h4>
        <div className="grid grid-cols-4 gap-2">
          <Select value={newBreakTime} onValueChange={setNewBreakTime}>
            <SelectTrigger>
              <SelectValue placeholder="Time" />
            </SelectTrigger>
            <SelectContent>
              {timeSlots.map((slot) => (
                <SelectItem key={slot.id} value={slot.time}>
                  {slot.time}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={newBreakType} onValueChange={(value: any) => setNewBreakType(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="exercise">Exercise</SelectItem>
              <SelectItem value="nap">Nap</SelectItem>
              <SelectItem value="food">Food</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          
          <Input
            placeholder="Label (e.g., Lunch)"
            value={newBreakLabel}
            onChange={(e) => setNewBreakLabel(e.target.value)}
          />
          
          <Button onClick={addBreak} size="sm">
            Add Break
          </Button>
        </div>
      </Card>

      {/* Calendar Schedule */}
      <Card className="p-6 border-0 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Energy-Optimized Schedule</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Start time</span>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-8 w-28" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-1">
          {hourRows.map((hour) => {
            const isCurrentHour = new Date().getHours() === hour;
            const firstHalfKey = `${hour}:00`;
            const secondHalfKey = `${hour}:30`;
            const firstSegments = scheduleResult.halvesByKey[firstHalfKey]?.segments || [];
            const secondSegments = scheduleResult.halvesByKey[secondHalfKey]?.segments || [];

            return (
              <div
                key={hour}
                className={cn(
                  "relative flex items-stretch gap-3 py-2 border-t border-muted-foreground/20",
                  isCurrentHour && "time-slot-current"
                )}
              >
                <div className="w-16 -mt-1 text-sm font-medium text-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3 opacity-70" />
                  {hour}:00
                </div>

                <div className="flex-1 grid grid-cols-2 gap-2">
                  {[{ key: firstHalfKey, segments: firstSegments }, { key: secondHalfKey, segments: secondSegments }].map((half) => (
                    <div key={half.key} className="relative h-20 rounded-md bg-muted/30 border border-muted-foreground/10 overflow-hidden">
                      <div className="absolute inset-x-0 top-0 text-[10px] text-muted-foreground/70 px-2 pt-1 flex justify-between">
                        <span>{half.key}</span>
                        <span>30m</span>
                      </div>
                      <div className="absolute inset-0 flex flex-col">
                        {half.segments.length === 0 ? (
                          <div className="m-1 rounded bg-background/40 border border-dashed border-muted-foreground/20" />
                        ) : (
                          half.segments.map((seg, i) => (
                            <div
                              key={i}
                              style={{ height: `${(seg.minutes / 30) * 100}%` }}
                              className={cn(
                                "w-full px-2 py-1 text-xs flex items-center justify-between border-b border-background/10",
                                seg.kind === 'task' ? getWorkTypeColor(seg.task!.workType) : "bg-amber-500/20"
                              )}
                            >
                              <span className="truncate">
                                {seg.kind === 'task' ? seg.task!.title : (seg.label || 'Break')}
                              </span>
                              <span className="opacity-70 ml-2">{seg.minutes}m</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Legend */}
      <Card className="p-4 bg-muted/30 border-0">
        <h4 className="font-medium mb-3 text-sm">Energy Cycle Legend</h4>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full task-deep"></div>
            <span>Deep Work (Morning)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full task-light"></div>
            <span>Light Work (Midday)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full task-admin"></div>
            <span>Admin Work (Afternoon)</span>
          </div>
        </div>
      </Card>
    </div>
  );
}