import { useMemo, useState } from 'react';
import { Task, TimeSlot } from '@/types/task';
import { Card } from '@/components/ui/card';
import { getWorkTypeColor } from '@/utils/taskAI';
import { Progress } from '@/components/ui/progress';
import { Clock, Trophy, Target, Coffee, Dumbbell, Utensils, Users, Plus, Star, Zap, CheckCircle, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DndContext, DragEndEvent, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
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
  const [scheduleAffectsPlanningOrder, setScheduleAffectsPlanningOrder] = useState(false);
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

const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

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

  const scheduled = tasks.filter(t => t.scheduledDay === 'today' && !t.completed);
  
  // Separate tasks with specific time slots from auto-scheduled tasks
  const tasksWithTimeSlots = scheduled.filter(t => t.timeSlot);
  const tasksForAutoScheduling = scheduled.filter(t => !t.timeSlot);
  
  // Add manually scheduled tasks first
  tasksWithTimeSlots.forEach(task => {
    if (task.timeSlot) {
      const taskTime = new Date(task.timeSlot);
      const startTimeMinutes = taskTime.getHours() * 60 + taskTime.getMinutes();
      
      if (task.duration === 60) {
        // Single 50min block for 1-hour tasks
        scheduledItems.push({
          kind: 'task',
          task,
          startTime: startTimeMinutes,
          duration: 50
        });
        // Add automatic 10min break after
        scheduledItems.push({
          kind: 'break',
          label: 'Break',
          startTime: startTimeMinutes + 50,
          duration: 10
        });
      } else {
        scheduledItems.push({
          kind: 'task',
          task,
          startTime: startTimeMinutes,
          duration: task.duration
        });
      }
    }
  });

  // Auto-schedule remaining tasks
  const BUCKETS: Array<15 | 30 | 60> = [60, 30, 15];
  const orderByBuckets = (arr: Task[]) => BUCKETS.flatMap((d) =>
    arr
      .filter((t) => t.duration === d)
      .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999))
  );
  const deepTasks = orderByBuckets(tasksForAutoScheduling.filter((t) => t.workType === 'deep'));
  const lightTasks = orderByBuckets(tasksForAutoScheduling.filter((t) => t.workType === 'light'));
  const adminTasks = orderByBuckets(tasksForAutoScheduling.filter((t) => t.workType === 'admin'));

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

  const progressTasks = useMemo(() => scheduleResult.scheduledItems
    .filter((i: any) => i.kind === 'task') as Array<{ task: Task; startTime: number; duration: number }>,
  [scheduleResult.scheduledItems]);
  const totalProgressMinutes = useMemo(() => progressTasks.reduce((sum, i) => sum + i.duration, 0), [progressTasks]);

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
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    onTaskUpdate(updatedTasks);
    
    const t = tasks.find(t => t.id === taskId);
    if (t) {
      if (!t.completed) {
        // Just marked complete
        toast.success(
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <div className="font-medium">Task Completed! 🎉</div>
              <div className="text-sm text-muted-foreground">
                +{t.duration} XP • {t.workType} work
              </div>
            </div>
          </div>
        );
      } else {
        toast.info('Task marked as incomplete');
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const taskId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find((t) => t.id === taskId);

    if (!activeTask) return;

    // Handle time slot drops (when dropping on a time slot)
    if (typeof overId === 'string' && overId.includes(':')) {
      const [hour, minute] = overId.split(':').map(Number);
      
      // Update task with new time slot
      const updatedTasks = tasks.map(task =>
        task.id === taskId 
          ? { ...task, timeSlot: new Date(2024, 0, 1, hour, minute).toISOString() }
          : task
      );
      onTaskUpdate(updatedTasks);
      
      toast.success(`Task moved to ${hour}:${minute.toString().padStart(2, '0')}`);
      return;
    }

    // Reorder within same bucket by dropping over another task
    const overTask = tasks.find((t) => t.id === overId);

    if (activeTask && overTask && activeTask.id !== overTask.id && 
        activeTask.workType === overTask.workType && activeTask.duration === overTask.duration) {
      
      if (!scheduleAffectsPlanningOrder) {
        toast.info('Enable "Affect Planning Order" to reorder tasks');
        return;
      }

      // Clear any existing timeSlot when reordering (return to auto-schedule)
      const updatedTask = { ...activeTask, timeSlot: undefined };
      
      const cellTasks = tasks
        .filter((t) => t.workType === activeTask.workType && t.duration === activeTask.duration && !t.completed)
        .sort((a, b) => (a.priority || 999) - (b.priority || 999));
      const filtered = cellTasks.filter((t) => t.id !== activeTask.id);
      const activeIndex = cellTasks.findIndex((t) => t.id === activeTask.id);
      const overIndex = filtered.findIndex((t) => t.id === overTask.id);
      let insertIndex = Math.max(0, overIndex);
      if (activeIndex !== -1 && activeIndex < cellTasks.findIndex((t) => t.id === overTask.id)) {
        insertIndex = overIndex + 1; // moving downward -> insert after
      }
      const newOrderIds = [
        ...filtered.slice(0, insertIndex).map((t) => t.id),
        activeTask.id,
        ...filtered.slice(insertIndex).map((t) => t.id),
      ];
      const updated = tasks.map((t) => {
        const idx = newOrderIds.indexOf(t.id);
        if (idx !== -1) {
          const newTask = t.id === activeTask.id ? updatedTask : t;
          return { ...newTask, priority: idx + 1 };
        }
        return t;
      });
      onTaskUpdate(updated);
      toast.success('Task order updated in planning list');
      return;
    }

    toast.info('Task dragged');
  };

  // Visual scale: 20px per 15 minutes
  const PX_PER_MIN = 20 / 15;

  // Build a single-column timeline: gaps + items (tasks/breaks)
  const timeline = useMemo(() => {
    const [startHourNum] = startTime.split(':').map(Number);
    const dayStart = startHourNum * 60;
    const dayEnd = dayStart + dayLength * 60;

    type Segment =
      | { kind: 'gap'; startTime: number; duration: number }
      | { kind: 'break'; label?: string; breakType?: 'exercise' | 'nap' | 'food' | 'meeting' | 'other'; startTime: number; duration: number }
      | { kind: 'task'; task: Task; startTime: number; duration: number };

    const segments: Segment[] = [];
    let cursor = dayStart;

    for (const item of scheduleResult.scheduledItems) {
      if (item.startTime > cursor) {
        segments.push({ kind: 'gap', startTime: cursor, duration: item.startTime - cursor });
      }
      if (item.kind === 'task') {
        segments.push({ kind: 'task', task: item.task!, startTime: item.startTime, duration: item.duration });
      } else {
        segments.push({ kind: 'break', label: item.label, breakType: item.breakType, startTime: item.startTime, duration: item.duration });
      }
      cursor = item.startTime + item.duration;
    }

    if (cursor < dayEnd) {
      segments.push({ kind: 'gap', startTime: cursor, duration: dayEnd - cursor });
    }

    return { segments, startHourNum, dayStart, dayEnd };
  }, [scheduleResult.scheduledItems, startTime, dayLength]);
  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
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
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 h-8 rounded-lg border border-border bg-muted/30 overflow-hidden">
            {progressTasks.map((it, idx) => {
              const widthPercent = totalProgressMinutes > 0 ? (it.duration / totalProgressMinutes) * 100 : 0;
              const isPriority = !!it.task.isPriority;
              return (
                <div
                  key={idx}
                  className={cn(
                    "h-full border-r last:border-r-0 border-border/50 relative flex items-center justify-center text-xs font-medium",
                    getWorkTypeColor(it.task.workType),
                    it.task.completed && "opacity-40 line-through"
                  )}
                  style={{ width: `${widthPercent}%` }}
                  title={`${it.task.title} • ${it.duration}m${isPriority ? ' • Priority' : ''}`}
                >
                  {isPriority && (
                    <Star className="w-3 h-3 text-orange-200 fill-orange-200 absolute top-0.5 right-0.5" />
                  )}
                  <span className="truncate px-1 text-white">
                    {it.task.title.length > 8 ? it.task.title.substring(0, 8) + '...' : it.task.title}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-sm text-muted-foreground">
            {completionRate.toFixed(0)}% completed • Keep up the great work!
          </p>
        </div>
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
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="schedule-affects-order" className="text-sm">Affect Planning Order</Label>
              <Switch 
                id="schedule-affects-order"
                checked={scheduleAffectsPlanningOrder}
                onCheckedChange={setScheduleAffectsPlanningOrder}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Start time</span>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-8 w-28" />
            </div>
          </div>
        </div>
        <div className="relative">
          {/* Overlay hour grid with labels aligned to the line (left) */}
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: dayLength + 1 }).map((_, i) => {
              const hour = timeline.startHourNum + i;
              const top = i * 60 * PX_PER_MIN; // px from day start
              const isCurrentHour = new Date().getHours() === hour;
              return (
                <div key={hour} className="absolute left-0 right-0" style={{ top }}>
                  <div className="absolute left-0 -mt-2 text-sm font-medium text-foreground flex items-center gap-1 bg-background pr-2">
                    <Clock className="w-3 h-3 opacity-70" />
                    {hour}:00
                  </div>
                  <div className={cn(
                    "border-t border-muted-foreground/20 w-full",
                    isCurrentHour && "border-primary/50"
                  )} />
                </div>
              );
            })}
          </div>

          {/* Single column stacked timeline */}
          <div className="pl-20">
            {timeline.segments.map((seg, i) => {
              if (seg.kind === 'gap') {
                const gapHeight = Math.max(20, seg.duration * PX_PER_MIN); // Minimum 20px for drop targets
                const h = Math.floor(seg.startTime / 60);
                const m = seg.startTime % 60;
                
                return (
                  <TimeSlotDropZone 
                    key={`gap-${i}`} 
                    timeSlot={`${h}:${m.toString().padStart(2, '0')}`}
                  >
                    <div
                      style={{ height: `${gapHeight}px` }}
                      className="relative group"
                    >
                      {gapHeight >= 40 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-xs text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
                            Drop here for {h}:{m.toString().padStart(2, '0')}
                          </div>
                        </div>
                      )}
                    </div>
                  </TimeSlotDropZone>
                );
              }

              if (seg.kind === 'break') {
                const h = Math.floor(seg.startTime / 60);
                const m = seg.startTime % 60;
                return (
                  <div
                    key={`break-${i}`}
                    className="rounded text-xs flex items-center justify-between border border-background/20 bg-amber-500/20"
                    style={{ height: `${seg.duration * PX_PER_MIN}px` }}
                  >
                    <div className="w-full h-full px-3 py-2 flex items-center justify-between">
                      <span className="truncate font-medium">{seg.label || 'Break'}</span>
                      <div className="flex items-center gap-2 text-xs opacity-70">
                        <span>{h}:{m.toString().padStart(2, '0')}</span>
                        <span>{seg.duration}m</span>
                        {seg.breakType && getBreakIcon(seg.breakType)}
                      </div>
                    </div>
                  </div>
                );
              }

              const h = Math.floor(seg.startTime / 60);
              const m = seg.startTime % 60;
              return (
                <DraggableTask
                  key={`task-${seg.task.id}-${i}`}
                  task={seg.task}
                  startTime={h}
                  startMinute={m}
                  duration={seg.duration}
                  blockHeight={seg.duration * PX_PER_MIN}
                  onComplete={handleTaskComplete}
                />
              );
            })}
          </div>
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
  blockHeight, 
  onComplete 
}: {
  task: Task;
  startTime: number;
  startMinute: number;
  duration: number;
  blockHeight: number;
  onComplete: (taskId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: task.id });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{ 
        ...style,
        height: `${blockHeight}px`,
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
        "transition-colors rounded",
        isOver && "bg-primary/10 border-2 border-primary/30 border-dashed"
      )}
    >
      {children}
    </div>
  );
}