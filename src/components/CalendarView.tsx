import { useMemo, useState } from 'react';
import { Task, Category8, CATEGORY_TO_BUCKET } from '@/types/task';
import { Card } from '@/components/ui/card';
import { Clock, Trophy, Target, Coffee, Dumbbell, Utensils, Users, Plus, Star, CheckCircle, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from '@dnd-kit/core';
import { toast } from 'sonner';

interface CalendarViewProps {
  tasks: Task[];
  onTaskUpdate: (tasks: Task[]) => void;
}

type BreakType = 'exercise' | 'nap' | 'food' | 'meeting' | 'other';

type LocalBreak = {
  id: string;
  time: string;
  hour: number;
  minute: 0 | 15 | 30 | 45;
  isBreak: true;
  breakType: BreakType;
  breakLabel: string;
};

export default function CalendarView({ tasks, onTaskUpdate }: CalendarViewProps) {
  const [breaks, setBreaks] = useState<LocalBreak[]>([]);
  const [newBreakTime, setNewBreakTime] = useState('');
  const [newBreakType, setNewBreakType] = useState<BreakType>('food');
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
    return hourRows.flatMap((hour) => ([
      { id: `${hour}:00`, time: `${hour}:00`, hour, minute: 0 as const },
      { id: `${hour}:15`, time: `${hour}:15`, hour, minute: 15 as const },
      { id: `${hour}:30`, time: `${hour}:30`, hour, minute: 30 as const },
      { id: `${hour}:45`, time: `${hour}:45`, hour, minute: 45 as const },
    ]));
  }, [hourRows]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Helper: map bucket → CSS bg class
  const bucketBg = (category?: Category8) => {
    if (!category) return 'task-light';
    const bucket = CATEGORY_TO_BUCKET[category];
    if (bucket === 'deep') return 'task-deep';
    if (bucket === 'admin') return 'task-admin';
    return 'task-light';
  };

  // Build today’s schedule with simple energy-aware ordering
  const scheduleResult = useMemo(() => {
    type ScheduledItem =
      | { kind: 'task'; task: Task; startTime: number; duration: number }
      | { kind: 'break'; label: string; breakType?: BreakType; startTime: number; duration: number };

    const [startHour] = startTime.split(':').map(Number);
    const dayStartMinutes = startHour * 60;

    const today = tasks.filter(t => t.scheduledDay === 'today' && !t.completed);

    // Separate tasks with manual scheduledStart vs auto
    const withManual = today.filter(t => !!t.scheduledStart);
    const toAuto = today.filter(t => !t.scheduledStart);

    const items: ScheduledItem[] = [];

    // 1) Place manual tasks exactly where requested
    for (const t of withManual) {
      const dt = new Date(t.scheduledStart!);
      const startMin = dt.getHours() * 60 + dt.getMinutes();
      if (t.duration === 60) {
        items.push({ kind: 'task', task: t, startTime: startMin, duration: 50 });
        items.push({ kind: 'break', label: 'Break', startTime: startMin + 50, duration: 10 });
      } else {
        items.push({ kind: 'task', task: t, startTime: startMin, duration: t.duration });
      }
    }

    // 2) Auto order: deep → light → admin using CATEGORY_TO_BUCKET
    const byBucketOrder = (list: Task[]) => {
      const bucketRank = (c?: Category8) => {
        if (!c) return 99;
        const b = CATEGORY_TO_BUCKET[c];
        return b === 'deep' ? 0 : b === 'light' ? 1 : 2;
      };
      return [...list].sort((a, b) => {
        const ra = bucketRank(a.category);
        const rb = bucketRank(b.category);
        if (ra !== rb) return ra - rb;
        // Duration longest first inside a bucket feels better for morning focus
        if (a.duration !== b.duration) return b.duration - a.duration;
        return a.title.localeCompare(b.title);
      });
    };

    const auto = byBucketOrder(toAuto);

    // Fill timeline after the last manual block or from day start
    const usedUntil = items.reduce((max, it) => Math.max(max, it.startTime + it.duration), dayStartMinutes);
    let cursor = Math.max(dayStartMinutes, usedUntil);

    const addTask = (t: Task) => {
      if (t.duration === 60) {
        items.push({ kind: 'task', task: t, startTime: cursor, duration: 50 });
        cursor += 50;
        items.push({ kind: 'break', label: 'Break', startTime: cursor, duration: 10 });
        cursor += 10;
      } else {
        items.push({ kind: 'task', task: t, startTime: cursor, duration: t.duration });
        cursor += t.duration;
      }
    };

    // Schedule by bucket order
    for (const t of auto) addTask(t);

    // Overlay user-added fixed breaks
    for (const b of breaks) {
      const startMin = b.hour * 60 + b.minute;
      items.push({ kind: 'break', label: b.breakLabel || 'Break', breakType: b.breakType, startTime: startMin, duration: 30 });
    }

    items.sort((a, b) => a.startTime - b.startTime);

    return { items, hourRows };
  }, [tasks, breaks, hourRows, startTime]);

  const completedTasks = tasks.filter(t => t.completed);
  const totalTasks = tasks.length;
  const completionRate = totalTasks ? (completedTasks.length / totalTasks) * 100 : 0;

  const progressTasks = useMemo(
    () => scheduleResult.items.filter((i): i is Extract<typeof i, { kind: 'task' }>) => i.kind === 'task'),
    [scheduleResult.items]
  ) as Array<{ kind: 'task'; task: Task; startTime: number; duration: number }>;

  const totalProgressMinutes = useMemo(
    () => progressTasks.reduce((sum, i) => sum + i.duration, 0),
    [progressTasks]
  );

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
      const b: LocalBreak = {
        id: `break-${newBreakTime}-${Math.random().toString(36).slice(2, 7)}`,
        time: newBreakTime,
        hour,
        minute: (minute as 0 | 15 | 30 | 45),
        isBreak: true,
        breakType: newBreakType,
        breakLabel: newBreakLabel
      };
      setBreaks(prev => [...prev, b].sort((a, b) => (a.hour - b.hour) || (a.minute - b.minute)));
      setNewBreakTime('');
      setNewBreakLabel('');
    }
  };

  const removeBreak = (breakId: string) => {
    setBreaks(prev => prev.filter(b => b.id !== breakId));
  };

  const handleTaskComplete = (taskId: string) => {
    const updated = tasks.map(t => (t.id === taskId ? { ...t, completed: !t.completed } : t));
    onTaskUpdate(updated);

    const t = tasks.find(t => t.id === taskId);
    if (t) {
      if (!t.completed) {
        toast.success(
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <div className="font-medium">Task Completed! 🎉</div>
              <div className="text-sm text-muted-foreground">
                +{t.duration} XP • {CATEGORY_TO_BUCKET[t.category!]} bucket
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

    const taskId = String(active.id);
    const overId = String(over.id);
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Dropped on a time marker like "13:30"
    if (overId.includes(':')) {
      const [h, m] = overId.split(':').map(Number);
      const iso = new Date(2024, 0, 1, h, m, 0, 0).toISOString();
      const updated = tasks.map(t => t.id === taskId ? { ...t, scheduledStart: iso } : t);
      onTaskUpdate(updated);
      toast.success(`Task scheduled at ${h}:${m.toString().padStart(2, '0')}`);
      return;
    }

    toast.info('Task dragged');
  };

  // Visual scale: 20px per 15 minutes
  const PX_PER_MIN = 20 / 15;

  // Build a single-column timeline: gaps + items
  const timeline = useMemo(() => {
    const [startHourNum] = startTime.split(':').map(Number);
    const dayStart = startHourNum * 60;
    const dayEnd = dayStart + dayLength * 60;

    type Segment =
      | { kind: 'gap'; startTime: number; duration: number }
      | { kind: 'break'; label: string; breakType?: BreakType; startTime: number; duration: number }
      | { kind: 'task'; task: Task; startTime: number; duration: number };

    const segments: Segment[] = [];
    let cursor = dayStart;

    for (const it of scheduleResult.items) {
      if (it.startTime > cursor) {
        segments.push({ kind: 'gap', startTime: cursor, duration: it.startTime - cursor });
      }
      if (it.kind === 'task') {
        segments.push({ kind: 'task', task: it.task, startTime: it.startTime, duration: it.duration });
      } else {
        segments.push({ kind: 'break', label: it.label, breakType: it.breakType, startTime: it.startTime, duration: it.duration });
      }
      cursor = it.startTime + it.duration;
    }

    if (cursor < dayEnd) {
      segments.push({ kind: 'gap', startTime: cursor, duration: dayEnd - cursor });
    }

    return { segments, startHourNum, dayStart, dayEnd };
  }, [scheduleResult.items, startTime, dayLength]);

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        {/* Progress */}
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
                const widthPercent = totalProgressMinutes ? (it.duration / totalProgressMinutes) * 100 : 0;
                const isPriority = !!it.task.isPriority;
                return (
                  <div
                    key={idx}
                    className={cn(
                      "h-full border-r last:border-r-0 border-border/50 relative flex items-center justify-center text-xs font-medium",
                      bucketBg(it.task.category),
                      it.task.completed && "opacity-40 line-through"
                    )}
                    style={{ width: `${widthPercent}%` }}
                    title={`${it.task.title} • ${it.duration}m${isPriority ? ' • Priority' : ''}`}
                  >
                    {isPriority && <Star className="w-3 h-3 text-orange-200 fill-orange-200 absolute top-0.5 right-0.5" />}
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

        {/* Add Break */}
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

            <Select value={newBreakType} onValueChange={(v: BreakType) => setNewBreakType(v)}>
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

            <Button onClick={addBreak} size="sm">Add Break</Button>
          </div>
        </Card>

        {/* Timeline */}
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

          <Timeline hourRows={hourRows} timeline={timeline} onComplete={handleTaskComplete} />
        </Card>

        {/* Legend */}
        <Card className="p-4 bg-muted/30 border-0">
          <h4 className="font-medium mb-3 text-sm">Energy Cycle Legend</h4>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full task-deep"></div>
              <span>Deep (Morning)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full task-light"></div>
              <span>Light (Midday)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full task-admin"></div>
              <span>Admin (Afternoon)</span>
            </div>
          </div>
        </Card>
      </div>
    </DndContext>
  );
}

function Timeline({
  hourRows,
  timeline,
  onComplete,
}: {
  hourRows: number[];
  timeline: {
    segments: Array<
      | { kind: 'gap'; startTime: number; duration: number }
      | { kind: 'break'; label: string; breakType?: BreakType; startTime: number; duration: number }
      | { kind: 'task'; task: Task; startTime: number; duration: number }
    >;
    startHourNum: number;
    dayStart: number;
    dayEnd: number;
  };
  onComplete: (taskId: string) => void;
}) {
  const PX_PER_MIN = 20 / 15;

  return (
    <div className="relative">
      {/* hour grid */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: hourRows.length + 1 }).map((_, i) => {
          const hour = timeline.startHourNum + i;
          const top = i * 60 * PX_PER_MIN;
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

      {/* column */}
      <div className="pl-20">
        {timeline.segments.map((seg, i) => {
          if (seg.kind === 'gap') {
            const gapHeight = Math.max(20, seg.duration * PX_PER_MIN);
            const h = Math.floor(seg.startTime / 60);
            const m = seg.startTime % 60;
            return (
              <TimeSlotDropZone key={`gap-${i}`} timeSlot={`${h}:${m.toString().padStart(2, '0')}`}>
                <div style={{ height: `${gapHeight}px` }} className="relative group">
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
                    {seg.breakType && (
                      seg.breakType === 'exercise' ? <Dumbbell className="w-3 h-3" /> :
                      seg.breakType === 'food' ? <Utensils className="w-3 h-3" /> :
                      seg.breakType === 'meeting' ? <Users className="w-3 h-3" /> :
                      seg.breakType === 'nap' ? <div className="w-3 h-3 rounded-full bg-current" /> :
                      <Coffee className="w-3 h-3" />
                    )}
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
              onComplete={onComplete}
            />
          );
        })}
      </div>
    </div>
  );
}

// Draggable Task
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
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const bucketBg = (category?: Category8) => {
    if (!category) return 'task-light';
    const bucket = CATEGORY_TO_BUCKET[category];
    if (bucket === 'deep') return 'task-deep';
    if (bucket === 'admin') return 'task-admin';
    return 'task-light';
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, height: `${blockHeight}px`, opacity: isDragging ? 0.5 : 1 }}
      {...listeners}
      {...attributes}
      className={cn(
        "rounded px-3 py-2 text-xs flex items-center justify-between border border-background/20 cursor-grab active:cursor-grabbing",
        bucketBg(task.category),
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
            onClick={(e) => { e.stopPropagation(); onComplete(task.id); }}
          >
            <CheckCircle className="w-3 h-3" />
          </Button>
        )}
        {task.completed && <Star className="w-3 h-3 text-yellow-400 fill-current" />}
      </div>
    </div>
  );
}

// Drop zone per time marker
function TimeSlotDropZone({ timeSlot, children }: { timeSlot: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: timeSlot });

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
