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

  const timeSlots = useMemo(() => {
    const slots: TimeSlot[] = [];
    for (let hour = 9; hour < 18; hour++) {
      slots.push(
        { id: `${hour}:00`, time: `${hour}:00`, hour, minute: 0 },
        { id: `${hour}:30`, time: `${hour}:30`, hour, minute: 30 }
      );
    }
    return slots;
  }, []);

  const scheduledTasks = useMemo(() => {
    const incompleteTasks = tasks.filter(t => !t.completed);
    const scheduled = [...incompleteTasks];
    
    // Simple scheduling algorithm: deep work in morning, light work midday, admin work afternoon
    let currentSlotIndex = 0;
    
    // Schedule deep work first (9:00 AM - 12:00 PM)
    const deepTasks = scheduled.filter(t => t.workType === 'deep');
    deepTasks.forEach(task => {
      if (currentSlotIndex < 6) { // First 6 slots (9:00-12:00)
        task.timeSlot = timeSlots[currentSlotIndex]?.time;
        const slotsNeeded = task.duration === 60 ? 2 : 1;
        currentSlotIndex += slotsNeeded;
      }
    });

    // Schedule light work (12:00 PM - 3:00 PM)
    const lightTasks = scheduled.filter(t => t.workType === 'light');
    lightTasks.forEach(task => {
      if (currentSlotIndex < 12) { // Slots 6-12 (12:00-15:00)
        task.timeSlot = timeSlots[currentSlotIndex]?.time;
        const slotsNeeded = task.duration === 60 ? 2 : 1;
        currentSlotIndex += slotsNeeded;
      }
    });

    // Schedule admin work (3:00 PM - 6:00 PM)
    const adminTasks = scheduled.filter(t => t.workType === 'admin');
    adminTasks.forEach(task => {
      if (currentSlotIndex < timeSlots.length) {
        task.timeSlot = timeSlots[currentSlotIndex]?.time;
        const slotsNeeded = task.duration === 60 ? 2 : task.duration === 30 ? 1 : 1;
        currentSlotIndex += slotsNeeded;
      }
    });

    return scheduled;
  }, [tasks, timeSlots]);

  const completedTasks = tasks.filter(t => t.completed);
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;

  const getTaskForSlot = (time: string) => {
    return scheduledTasks.find(task => {
      if (task.timeSlot === time) return true;
      // Check if this is the second slot of a 60-minute task
      const taskTime = task.timeSlot;
      if (taskTime && task.duration === 60) {
        const [hour, minute] = taskTime.split(':').map(Number);
        const nextSlotTime = minute === 30 ? `${hour + 1}:00` : `${hour}:30`;
        return nextSlotTime === time;
      }
      return false;
    });
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
        <div className="flex items-center gap-2 mb-6">
          <Target className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Energy-Optimized Schedule</h3>
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
                  "time-slot flex items-center gap-3 p-3 rounded-lg",
                  isCurrentHour && "time-slot-current"
                )}
              >
                <div className="w-16 text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {slot.time}
                </div>
                
                <div className="flex-1">
                  {breakSlot ? (
                    <div className="p-3 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getBreakIcon(breakSlot.breakType!)}
                        <span className="font-medium text-sm text-amber-200">{breakSlot.breakLabel}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBreak(breakSlot.id)}
                        className="h-6 w-6 p-0 text-amber-300 hover:text-amber-100"
                      >
                        ×
                      </Button>
                    </div>
                  ) : task ? (
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
                  )}
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