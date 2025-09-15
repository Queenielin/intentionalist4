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
const timeSlots = useMemo(() => {
  const [startHour] = startTime.split(':').map(Number);
  const slots: TimeSlot[] = [];
  const dayLength = 9; // hours
  for (let i = 0; i < dayLength; i++) {
    const hour = startHour + i;
    slots.push({ id: `${hour}:00`, time: `${hour}:00`, hour, minute: 0 });
  }
  return slots;
}, [startTime]);

const scheduleResult = useMemo(() => {
  const slots = timeSlots;
  const scheduled = tasks.filter(t => !t.completed).map(t => ({ ...t } as Task));
  let currentSlotIndex = 0;

  // Schedule deep work first
  const deepTasks = scheduled.filter(t => t.workType === 'deep');
  deepTasks.forEach(task => {
    if (currentSlotIndex < slots.length) {
      task.timeSlot = slots[currentSlotIndex]?.time;
      currentSlotIndex += 1; // hourly view: each task takes one slot
    }
  });

  // Automatic 1h break between deep and light
  const autoBreakTime = slots[currentSlotIndex]?.time;
  if (currentSlotIndex < slots.length) currentSlotIndex += 1;

  // Schedule light work
  const lightTasks = scheduled.filter(t => t.workType === 'light');
  lightTasks.forEach(task => {
    if (currentSlotIndex < slots.length) {
      task.timeSlot = slots[currentSlotIndex]?.time;
      currentSlotIndex += 1;
    }
  });

  // Schedule admin work
  const adminTasks = scheduled.filter(t => t.workType === 'admin');
  adminTasks.forEach(task => {
    if (currentSlotIndex < slots.length) {
      task.timeSlot = slots[currentSlotIndex]?.time;
      currentSlotIndex += 1;
    }
  });

  return { scheduled, autoBreakTime };
}, [tasks, timeSlots]);

  const completedTasks = tasks.filter(t => t.completed);
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;

const getTaskForSlot = (time: string) => {
  return scheduleResult.scheduled.find(task => task.timeSlot === time);
};

  const getBreakForSlot = (time: string) => {
    return breaks.find(breakSlot => breakSlot.time === time);
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
        <div className="grid grid-cols-1 gap-2">
          {timeSlots.map((slot) => {
            const task = getTaskForSlot(slot.time);
            const breakSlot = getBreakForSlot(slot.time);
            const isCurrentHour = new Date().getHours() === slot.hour;
            
            return (
              <div
                key={slot.id}
                className={cn(
                  "relative flex items-start gap-3 pt-3 pb-4 border-t border-muted-foreground/20",
                  isCurrentHour && "time-slot-current"
                )}
              >
                <div className="w-16 -mt-3 text-sm font-medium text-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3 opacity-70" />
                  {slot.time}
                </div>
                
                <div className="flex-1">
                  {(() => {
                    const isAutoBreak = scheduleResult.autoBreakTime === slot.time;
                    if (breakSlot || isAutoBreak) {
                      return (
                        <div className="p-3 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getBreakIcon(breakSlot?.breakType || 'food')}
                            <span className="font-medium text-sm text-foreground">
                              {breakSlot ? breakSlot.breakLabel : 'Break'}
                            </span>
                          </div>
                          {breakSlot && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeBreak(breakSlot.id)}
                              className="h-6 w-6 p-0"
                            >
                              ×
                            </Button>
                          )}
                        </div>
                      );
                    }
                    return task ? (
                      <div className={cn(
                        "p-3 rounded-lg transition-all duration-300",
                        getWorkTypeColor(task.workType),
                        task.completed && "task-completed"
                      )}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{task.title}</span>
                          <span className="text-xs opacity-75">
                            {task.duration}min • {task.workType}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 text-muted-foreground text-sm italic">
                        Free time
                      </div>
                    );
                  })()}
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