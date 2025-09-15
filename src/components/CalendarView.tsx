import { useMemo, useState } from 'react';
import { Task, TimeSlot } from '@/types/task';
import { Card } from '@/components/ui/card';
import { getWorkTypeColor } from '@/utils/taskAI';
import { Progress } from '@/components/ui/progress';
import { Clock, Trophy, Target, Coffee, Dumbbell, Utensils, Users, Plus, Star, Zap, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DndContext, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { toast } from 'sonner';

interface CalendarViewProps {
  tasks: Task[];
  onTaskUpdate: (tasks: Task[]) => void;
}

export default function CalendarView({ tasks, onTaskUpdate }: CalendarViewProps) {
  const [breaks, setBreaks] = useState<TimeSlot[]>([]);
  const [newBreakTime, setNewBreakTime] = useState('');
  const [newBreakType, setNewBreakType] = useState<'exercise' | 'nap' | 'food' | 'meeting' | 'other'>('food');
  const [newBreakLabel, setNewBreakLabel] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  // Build hours and 15-minute slots for the day
  const dayLength = 18; // hours
  const hourRows = useMemo(() => {
    const [startHour] = startTime.split(':').map(Number);
    return Array.from({ length: dayLength }, (_, i) => startHour + i);
  }, [startTime]);

  const timeSlots = useMemo(() => {
    // 15-minute granularity for flexible scheduling
    return hourRows.flatMap((hour) => [
      { id: `${hour}:00`, time: `${hour}:00`, hour, minute: 0 },
      { id: `${hour}:15`, time: `${hour}:15`, hour, minute: 15 },
      { id: `${hour}:30`, time: `${hour}:30`, hour, minute: 30 },
      { id: `${hour}:45`, time: `${hour}:45`, hour, minute: 45 },
    ]);
  }, [hourRows]);

const scheduleResult = useMemo(() => {
  type ScheduledItem = {
    kind: 'task' | 'break';
    task?: Task;
    label?: string;
    breakType?: 'exercise' | 'nap' | 'food' | 'meeting' | 'other';
    startTime: number; // minutes from day start
    duration: number; // minutes
  };

  const [startHour] = startTime.split(':').map(Number);
  const dayStartMinutes = startHour * 60;
  
  let scheduledItems: ScheduledItem[] = [];
  let currentTime = dayStartMinutes;

  const scheduled = tasks.filter((t) => !t.completed);
  const deepTasks = scheduled.filter((t) => t.workType === 'deep');
  const lightTasks = scheduled.filter((t) => t.workType === 'light');
  const adminTasks = scheduled.filter((t) => t.workType === 'admin');

  const addTask = (task: Task) => {
    if (task.duration === 60) {
      // Single 50min block for 1-hour tasks
      scheduledItems.push({
        kind: 'task',
        task,
        startTime: currentTime,
        duration: 50
      });
      currentTime += 50;
      // Add automatic 10min break after
      scheduledItems.push({
        kind: 'break',
        label: 'Break',
        startTime: currentTime,
        duration: 10
      });
      currentTime += 10;
    } else {
      scheduledItems.push({
        kind: 'task',
        task,
        startTime: currentTime,
        duration: task.duration
      });
      currentTime += task.duration;
    }
  };

  // Schedule deep work first
  deepTasks.forEach(addTask);
  
  // Add 1-hour break between deep and light work
  if (deepTasks.length > 0) {
    scheduledItems.push({
      kind: 'break',
      label: 'Break',
      startTime: currentTime,
      duration: 60
    });
    currentTime += 60;
  }
  
  // Then light and admin work
  lightTasks.forEach(addTask);
  adminTasks.forEach(addTask);

  // Overlay user-added breaks
  breaks.forEach((b) => {
    const breakStartMinutes = b.hour * 60 + b.minute;
    scheduledItems.push({
      kind: 'break',
      label: b.breakLabel || 'Break',
      breakType: b.breakType,
      startTime: breakStartMinutes,
      duration: 30
    });
  });

  // Sort by start time
  scheduledItems.sort((a, b) => a.startTime - b.startTime);

  return { scheduledItems, hourRows };
}, [tasks, breaks, hourRows, startTime]);

  const completedTasks = tasks.filter(t => t.completed);
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;

const getItemsForTimeRange = (startMinutes: number, endMinutes: number) => {
  return scheduleResult.scheduledItems.filter(item => 
    item.startTime < endMinutes && (item.startTime + item.duration) > startMinutes
  );
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

  const handleTaskComplete = (taskId: string) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId ? { ...task, completed: true } : task
    );
    onTaskUpdate(updatedTasks);
    
    // Gamification toast
    const completedTask = tasks.find(t => t.id === taskId);
    if (completedTask) {
      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <div>
            <div className="font-medium">Task Completed! 🎉</div>
            <div className="text-sm text-muted-foreground">
              +{completedTask.duration} XP • {completedTask.workType} work
            </div>
          </div>
        </div>
      );
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const taskId = active.id as string;
    const newTimeSlot = over.id as string;
    
    // Extract hour and minute from time slot
    const [hour, minute] = newTimeSlot.split(':').map(Number);
    const newStartTime = hour * 60 + minute;
    
    // Update task timing (this is a simplified version - you might want more complex logic)
    toast.info('Task moved to ' + newTimeSlot);
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
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
        <div className="space-y-0">
          {hourRows.map((hour) => {
            const isCurrentHour = new Date().getHours() === hour;
            const hourStartMinutes = hour * 60;
            const hourEndMinutes = (hour + 1) * 60;
            const itemsInHour = getItemsForTimeRange(hourStartMinutes, hourEndMinutes);
            
            // Split hour into two 30-minute rows
            const firstHalfItems = getItemsForTimeRange(hourStartMinutes, hourStartMinutes + 30);
            const secondHalfItems = getItemsForTimeRange(hourStartMinutes + 30, hourEndMinutes);

            return (
              <div key={hour} className="relative">
                {/* Hour label aligned on the line */}
                <div className="absolute left-0 top-0 -mt-2 text-sm font-medium text-foreground flex items-center gap-1 bg-background pr-2">
                  <Clock className="w-3 h-3 opacity-70" />
                  {hour}:00
                </div>
                
                {/* Hour divider line */}
                <div className={cn(
                  "border-t border-muted-foreground/20 w-full",
                  isCurrentHour && "border-primary/50"
                )} />
                
                {/* First 30-minute slot */}
                <div className="pl-20 py-2 min-h-[60px] flex flex-col gap-1">
                  {firstHalfItems.map((item, i) => {
                    const startMinutesInSlot = Math.max(0, item.startTime - hourStartMinutes);
                    const endMinutesInSlot = Math.min(30, item.startTime + item.duration - hourStartMinutes);
                    const durationInSlot = endMinutesInSlot - startMinutesInSlot;
                    const startTime = Math.floor(item.startTime / 60);
                    const startMinute = item.startTime % 60;
                    
                    if (durationInSlot <= 0) return null;
                    
                    return (
                      <div
                        key={`${item.kind}-${i}`}
                        className={cn(
                          "rounded px-3 py-2 text-xs flex items-center justify-between border border-background/20",
                          item.kind === 'task' ? getWorkTypeColor(item.task!.workType) : "bg-amber-500/20"
                        )}
                        style={{ height: `${Math.max(24, (durationInSlot / 30) * 60)}px` }}
                      >
                        <span className="truncate font-medium">
                          {item.kind === 'task' ? item.task!.title : (item.label || 'Break')}
                        </span>
                        <div className="flex items-center gap-2 text-xs opacity-70">
                          <span>{startTime}:{startMinute.toString().padStart(2, '0')}</span>
                          <span>{durationInSlot}m</span>
                          {item.kind === 'break' && item.breakType && getBreakIcon(item.breakType)}
                        </div>
                      </div>
                    );
                  })}
                  {firstHalfItems.length === 0 && (
                    <div className="rounded bg-background/40 border border-dashed border-muted-foreground/20 h-8" />
                  )}
                </div>
                
                {/* Second 30-minute slot */}
                <div className="pl-20 py-2 min-h-[60px] flex flex-col gap-1">
                  {secondHalfItems.map((item, i) => {
                    const startMinutesInSlot = Math.max(0, item.startTime - (hourStartMinutes + 30));
                    const endMinutesInSlot = Math.min(30, item.startTime + item.duration - (hourStartMinutes + 30));
                    const durationInSlot = endMinutesInSlot - startMinutesInSlot;
                    const startTime = Math.floor(item.startTime / 60);
                    const startMinute = item.startTime % 60;
                    
                    if (durationInSlot <= 0) return null;
                    
                    return (
                      <div
                        key={`${item.kind}-${i}`}
                        className={cn(
                          "rounded px-3 py-2 text-xs flex items-center justify-between border border-background/20",
                          item.kind === 'task' ? getWorkTypeColor(item.task!.workType) : "bg-amber-500/20"
                        )}
                        style={{ height: `${Math.max(24, (durationInSlot / 30) * 60)}px` }}
                      >
                        <span className="truncate font-medium">
                          {item.kind === 'task' ? item.task!.title : (item.label || 'Break')}
                        </span>
                        <div className="flex items-center gap-2 text-xs opacity-70">
                          <span>{startTime}:{startMinute.toString().padStart(2, '0')}</span>
                          <span>{durationInSlot}m</span>
                          {item.kind === 'break' && item.breakType && getBreakIcon(item.breakType)}
                        </div>
                      </div>
                    );
                  })}
                  {secondHalfItems.length === 0 && (
                    <div className="rounded bg-background/40 border border-dashed border-muted-foreground/20 h-8" />
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
    </DndContext>
  );
}

// Draggable Task Component
function DraggableTask({ 
  task, 
  startTime, 
  startMinute, 
  duration, 
  durationInSlot, 
  onComplete 
}: {
  task: Task;
  startTime: number;
  startMinute: number;
  duration: number;
  durationInSlot: number;
  onComplete: (taskId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{ 
        ...style,
        height: `${Math.max(24, Math.round((durationInSlot / 15) * 20))}px`,
        opacity: isDragging ? 0.5 : 1
      }}
      {...listeners}
      {...attributes}
      className={cn(
        "rounded px-3 py-2 text-xs flex items-center justify-between border border-background/20 cursor-grab active:cursor-grabbing",
        getWorkTypeColor(task.workType),
        task.completed && "opacity-60 line-through"
      )}
    >
      <span className="truncate font-medium">{task.title}</span>
      <div className="flex items-center gap-2 text-xs opacity-70">
        <span>{startTime}:{startMinute.toString().padStart(2, '0')}</span>
        <span>{duration}m</span>
        {!task.completed && (
          <Button
            size="sm"
            variant="ghost"
            className="w-5 h-5 p-0 hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              onComplete(task.id);
            }}
          >
            <CheckCircle className="w-3 h-3" />
          </Button>
        )}
        {task.completed && <Star className="w-3 h-3 text-yellow-400 fill-current" />}
      </div>
    </div>
  );
}

// Time Slot Drop Zone Component  
function TimeSlotDropZone({ timeSlot, children }: { timeSlot: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: timeSlot,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[40px] transition-colors",
        isOver && "bg-primary/10 rounded"
      )}
    >
      {children}
    </div>
  );
}