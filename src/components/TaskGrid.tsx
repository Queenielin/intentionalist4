import { useState } from 'react';
import { Task, WorkType } from '@/types/task';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Trash2, Calendar, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getWorkTypeColor } from '@/utils/taskAI';
import { Input } from '@/components/ui/input';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TaskGridProps {
  tasks: Task[];
  day: 'today' | 'tomorrow';
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onDuplicateTask: (task: Task) => void;
  onCompleteTask: (taskId: string) => void;
  onAddTask: (title: string, workType: WorkType, duration: typeof DURATIONS[number], scheduledDay?: 'today' | 'tomorrow') => void;
}

const WORK_TYPES: WorkType[] = ['deep', 'light', 'admin'];
const DURATIONS = [60, 30, 15] as const;

// Research-based productivity limits (in hours)
const WORK_TYPE_LIMITS = {
  deep: 4,    // 4 hours max deep work per day
  light: 6,   // 6 hours max light work per day
  admin: 2    // 2 hours max admin work per day
};

interface DraggableTaskProps {
  task: Task;
  index: number;
  editingTask: string | null;
  editTitle: string;
  selectedTasks: Set<string>;
  isPriority: boolean;
  dayTasks: Task[];
  onTaskClick: (task: Task, e?: React.MouseEvent) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onDuplicateTask: (task: Task) => void;
  onSaveEdit: (taskId: string) => void;
  onKeyPress: (e: React.KeyboardEvent, taskId: string) => void;
  setEditTitle: (title: string) => void;
  setSelectedTasks: (tasks: Set<string>) => void;
  setEditingTask: (taskId: string | null) => void;
}

// Droppable cell wrapper to allow dropping into empty areas
function DroppableCell({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id });
  return <div ref={setNodeRef}>{children}</div>;
}

function parseCellId(id: string): { workType: WorkType; duration: typeof DURATIONS[number] } {
  const base = id.endsWith('-top') ? id.slice(0, -4) : id;
  const [workType, durationStr] = base.split('-');
  const d = Number(durationStr) as typeof DURATIONS[number];
  return { workType: workType as WorkType, duration: d };
}

function DraggableTask({ 
  task, 
  index, 
  editingTask, 
  editTitle, 
  selectedTasks,
  isPriority,
  dayTasks,
  onTaskClick, 
  onUpdateTask, 
  onDeleteTask, 
  onDuplicateTask, 
  onSaveEdit, 
  onKeyPress, 
  setEditTitle,
  setSelectedTasks,
  setEditingTask
}: DraggableTaskProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };




  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group relative p-2 rounded-lg backdrop-blur-sm",
        "border transition-all cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50 z-50",
        selectedTasks.has(task.id) && "ring-2 ring-primary/50",
        isPriority 
          ? "bg-orange-500/30 border-orange-400/50 hover:bg-orange-500/40" 
          : "bg-white/20 border-white/30 hover:bg-white/30"
      )}
      onClick={(e) => onTaskClick(task, e)}
    >
      <div className="flex items-center gap-2">
        
        <div
          className="w-3 h-3 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
          aria-hidden
          onClick={(e) => {
            e.stopPropagation();
            const cellTasks = dayTasks
              .filter(
                (t) => t.workType === task.workType && t.duration === task.duration && !t.completed
              )
              .sort((a, b) => (a.priority || 999) - (b.priority || 999));

            const isCurrentlyPriority = !!task.isPriority;

            if (isCurrentlyPriority) {
              // Turn off priority but keep current position
              onUpdateTask(task.id, { isPriority: false });
            } else {
              // Make priority: position below existing priority tasks in this cell
              const priorityTasks = cellTasks.filter((t) => t.id !== task.id && !!t.isPriority);
              onUpdateTask(task.id, { isPriority: true, priority: priorityTasks.length + 1 });
            }
          }}
        >
          {isPriority ? (
            <AlertTriangle className="w-3 h-3 text-orange-200 fill-orange-200" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-white/60" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          {editingTask === task.id ? (
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => onKeyPress(e, task.id)}
              onBlur={() => onSaveEdit(task.id)}
              className="text-xs h-6 bg-white/30 border-white/40 text-white"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <p 
              className={cn(
                "text-xs font-medium truncate hover:text-white/80 cursor-text",
                isPriority ? "text-orange-100" : "text-white"
              )}
              onDoubleClick={(e) => { e.stopPropagation(); setEditingTask(task.id); setEditTitle(task.title); }}
            >
              {task.title}
            </p>
          )}
        </div>
        
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onUpdateTask(task.id, { scheduledDay: 'tomorrow' });
            }}
            className="h-5 w-5 p-0 text-white/70 hover:text-white"
            title="Move to Tomorrow"
          >
            <Calendar className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicateTask(task);
            }}
            className="h-5 w-5 p-0 text-white/70 hover:text-white"
          >
            <Copy className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteTask(task.id);
            }}
            className="h-5 w-5 p-0 text-white/70 hover:text-white"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function TaskGrid({ 
  tasks, 
  day, 
  onUpdateTask, 
  onDeleteTask, 
  onDuplicateTask, 
  onCompleteTask, 
  onAddTask
}: TaskGridProps) {
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [newTaskTitles, setNewTaskTitles] = useState<Record<string, string>>({});
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const dayTasks = tasks.filter(task => 
    day === 'today' ? !task.scheduledDay || task.scheduledDay === 'today' : task.scheduledDay === 'tomorrow'
  );

  const getTasksForCell = (workType: WorkType, duration: number) => {
    return dayTasks.filter(task => 
      task.workType === workType && 
      task.duration === duration && 
      !task.completed
    ).sort((a, b) => (a.priority || 999) - (b.priority || 999));
  };

  const handleTaskClick = (task: Task, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const cellTasks = getTasksForCell(task.workType, task.duration);
    const ids = cellTasks.map(t => t.id);

    if (e?.shiftKey && lastSelectedId && ids.includes(lastSelectedId)) {
      const start = ids.indexOf(lastSelectedId);
      const end = ids.indexOf(task.id);
      if (end !== -1) {
        const [a, b] = start < end ? [start, end] : [end, start];
        const range = ids.slice(a, b + 1);
        setSelectedTasks(new Set(range));
        setLastSelectedId(task.id);
        return;
      }
    }

    if (e?.ctrlKey || e?.metaKey) {
      const next = new Set(selectedTasks);
      if (next.has(task.id)) next.delete(task.id); else next.add(task.id);
      setSelectedTasks(next);
      setLastSelectedId(task.id);
    } else {
      setSelectedTasks(new Set([task.id]));
      setLastSelectedId(task.id);
    }
  };

  const handleSaveEdit = (taskId: string) => {
    if (editTitle.trim()) {
      onUpdateTask(taskId, { title: editTitle.trim() });
    }
    setEditingTask(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent, taskId: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(taskId);
    } else if (e.key === 'Escape') {
      setEditingTask(null);
      setEditTitle('');
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = dayTasks.find(task => task.id === activeId);
    if (!activeTask) {
      setActiveId(null);
      return;
    }

    const selectedIds = selectedTasks.has(activeId) ? Array.from(selectedTasks) : [activeId];
    const orderedSelectedIds = dayTasks.filter(t => selectedIds.includes(t.id)).map(t => t.id);

    const buildNewOrder = (cellTasks: Task[], insertIndex: number, targetWorkType: WorkType, targetDuration: typeof DURATIONS[number]) => {
      const filtered = cellTasks.filter(t => !orderedSelectedIds.includes(t.id));
      const newOrderIds = [
        ...filtered.slice(0, insertIndex).map(t => t.id),
        ...orderedSelectedIds,
        ...filtered.slice(insertIndex).map(t => t.id)
      ];
      newOrderIds.forEach((id: string, i) => {
        onUpdateTask(id, {
          workType: targetWorkType,
          duration: targetDuration,
          scheduledDay: day,
          priority: i + 1,
        });
      });
    };

    // If dropped on a cell container (e.g., "deep-60" or "deep-60-top")
    const isCellTarget = WORK_TYPES.some((wt) => overId.startsWith(`${wt}-`));
    if (isCellTarget) {
      const { workType, duration } = parseCellId(overId);
      const targetCellTasks = getTasksForCell(workType, duration);
      const droppingOnTop = overId.endsWith('-top');
      const insertIndex = droppingOnTop ? 0 : targetCellTasks.length;

      buildNewOrder(targetCellTasks, insertIndex, workType, duration);
      setSelectedTasks(new Set());
      setActiveId(null);
      return;
    }

    // If dropped on another task, move to that task's cell and reorder (supports multi-select)
    if (overId !== activeId) {
      const overTask = dayTasks.find(task => task.id === overId);
      if (overTask) {
        const cellTasks = getTasksForCell(overTask.workType, overTask.duration);
        const filteredCell = cellTasks.filter(t => !orderedSelectedIds.includes(t.id));
        const overIndex = filteredCell.findIndex(task => task.id === overId);
        const isSameCell = activeTask.workType === overTask.workType && activeTask.duration === overTask.duration;
        const originalActiveIndex = cellTasks.findIndex(t => t.id === activeId);
        const originalOverIndex = cellTasks.findIndex(t => t.id === overId);
        let insertIndex = Math.max(0, overIndex);
        if (isSameCell && originalActiveIndex !== -1 && originalOverIndex !== -1 && originalActiveIndex < originalOverIndex) {
          insertIndex = overIndex + 1;
        }
        insertIndex = Math.min(insertIndex, filteredCell.length);
        buildNewOrder(cellTasks, insertIndex, overTask.workType, overTask.duration);
        setSelectedTasks(new Set());
      }
    }

    setActiveId(null);
  };

  // Calculate total time for each work type
  const getWorkTypeTotal = (workType: WorkType) => {
    const total = dayTasks
      .filter(task => task.workType === workType && !task.completed)
      .reduce((sum, task) => sum + (task.duration / 60), 0);
    return total;
  };

  // Calculate total time for a specific cell
  const getCellTotal = (workType: WorkType, duration: number) => {
    const cellTasks = getTasksForCell(workType, duration);
    return (cellTasks.length * duration) / 60; // Convert to hours
  };

  // Get total workload across all work types
  const getTotalWorkload = () => {
    return WORK_TYPES.reduce((sum, workType) => sum + getWorkTypeTotal(workType), 0);
  };

  const draggedTask = activeId ? dayTasks.find(task => task.id === activeId) : null;

  const deepTotal = getWorkTypeTotal('deep');
  const lightAdminTotal = getWorkTypeTotal('light') + getWorkTypeTotal('admin');
  
  return (
    <div 
      className="space-y-4"
      onClick={() => setSelectedTasks(new Set())}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold capitalize">{day}</h3>
            
            {/* Research-based limits */}
            <div className={cn(
              "px-3 py-1 rounded-lg text-sm font-semibold border text-foreground",
              getTotalWorkload() > 8 
                ? "bg-red-500/20 border-red-400/30"
                : getTotalWorkload() < 4
                ? "bg-amber-500/20 border-amber-400/30"
                : "bg-muted border-border"
            )}>
              Total: {getTotalWorkload().toFixed(1)}h / 4-8h (Research Limit)
            </div>
          </div>
        
        <div className="grid grid-cols-3 gap-4">
          {WORK_TYPES.map((workType) => {
            const workTypeTotal = getWorkTypeTotal(workType);
            const isOverLimit = workType === 'deep' ? workTypeTotal > WORK_TYPE_LIMITS.deep : lightAdminTotal > 4;
            const isTooLow = workType === 'deep' ? workTypeTotal < 2 : lightAdminTotal < 2;
            
            return (
              <div key={workType} className="space-y-4">
                {/* Column header with totals */}
                <div className={cn(
                  "text-center p-3 rounded-lg transition-all",
                  isOverLimit
                    ? "bg-red-500/20 border border-red-400/30"
                    : isTooLow
                    ? "bg-amber-500/20 border border-amber-400/30"
                    : "bg-muted/50"
                )}>
                  <h4 className="text-sm font-semibold capitalize text-foreground">
                    {workType} Work
                  </h4>
                  <div className={cn(
                    "text-xs mt-1",
                    isOverLimit ? "text-red-300" : isTooLow ? "text-amber-300" : "text-muted-foreground"
                  )}>
                    {workType === 'deep'
                      ? `${workTypeTotal.toFixed(1)}h (target 2-4h)`
                      : `${workTypeTotal.toFixed(1)}h (combined ${lightAdminTotal.toFixed(1)}h / 4h)`}
                  </div>
                </div>
                
                {/* Duration cells for this work type */}
                {DURATIONS.map((duration) => {
                  const cellTasks = getTasksForCell(workType, duration);
                  const cellTotal = getCellTotal(workType, duration);
                  const cellId = `${workType}-${duration}`;
                  
                  return (
                    <DroppableCell id={cellId}>
                        <Card 
                        key={cellId}
                        className={cn(
                          "min-h-[200px] p-4 transition-all duration-200",
                          "border border-muted-foreground/20",
                          "hover:border-muted-foreground/40",
                          getWorkTypeColor(workType)
                        )}
                      >
                        <div className="space-y-3">
                          {/* Duration header with cell total */}
                          <div className="text-center">
                            <div className="text-sm font-semibold text-white/90">
                              {duration}min
                            </div>
                            {cellTotal > 0 && (
                              <div className="text-xs text-white/70 mt-1">
                                {cellTotal.toFixed(1)}h total
                              </div>
                            )}
                          </div>
                        
                          {/* Tasks */}
                          <SortableContext 
                            id={cellId}
                            items={cellTasks.map(task => task.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-2">
                              {/* Top drop zone to allow placing at first position */}
                              <DroppableCell id={`${cellId}-top`}>
                                <div className="h-6 -mt-2" />
                              </DroppableCell>
                              {cellTasks.map((task, index) => (
                                <DraggableTask
                                  key={task.id}
                                  task={task}
                                  index={index}
                                  editingTask={editingTask}
                                  editTitle={editTitle}
                                  selectedTasks={selectedTasks}
                                  isPriority={!!task.isPriority}
                                  dayTasks={dayTasks}
                                  onTaskClick={handleTaskClick}
                                  onUpdateTask={onUpdateTask}
                                  onDeleteTask={onDeleteTask}
                                  onDuplicateTask={onDuplicateTask}
                                  onSaveEdit={handleSaveEdit}
                                  onKeyPress={handleKeyPress}
                                  setEditTitle={setEditTitle}
                                  setSelectedTasks={setSelectedTasks}
                                  setEditingTask={setEditingTask}
                                />
                              ))}

                              {/* Blank input area for adding/dragging */}
                              <div className="rounded-lg transition-all p-2">
                                <Input
                                  value={newTaskTitles[cellId] ?? ''}
                                  onChange={(e) => setNewTaskTitles(prev => ({ ...prev, [cellId]: e.target.value }))}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const title = (newTaskTitles[cellId] ?? '').trim();
                                      if (title) {
                                        onAddTask(title, workType, duration, day);
                                        setNewTaskTitles(prev => ({ ...prev, [cellId]: '' }));
                                      }
                                    }
                                  }}
                                  placeholder="+ add task or drag here"
                                  className="h-8 text-xs bg-white/20 text-white placeholder:text-white/60 focus:bg-white/30"
                                  onClick={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onPointerDown={(e) => e.stopPropagation()}
                                />
                              </div>
                              
                            </div>
                          </SortableContext>
                        </div>
                      </Card>
                    </DroppableCell>
                  );
                })}
              </div>
            );
          })}
          </div>
        </div>
        
        <DragOverlay>
          {draggedTask ? (
            <div className="bg-white/30 backdrop-blur-sm border border-white/50 p-2 rounded-lg">
              <p className="text-xs font-medium text-white">
                {draggedTask.title}
              </p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}