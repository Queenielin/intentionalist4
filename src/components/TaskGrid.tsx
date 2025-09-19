import { useState, useEffect } from 'react';
import { Task, TaskGroup, WorkType } from '@/types/task';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Trash2, Calendar, AlertTriangle, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getWorkTypeColor } from '@/utils/taskAI';
import { Input } from '@/components/ui/input';
import { createTaskGroups, areTasksSimilar, canAddTaskToGroup, addTaskToGroup, removeTaskFromGroup } from '@/utils/taskGrouping';
import TaskGroupCard from './TaskGroupCard';
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
  } = useSortable({ 
    id: task.id,
    data: {
      type: 'task',
      task: task
    }
  });

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
      data-task-id={task.id}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(e) => {
        e.preventDefault();
        const draggedTaskId = e.dataTransfer.getData('text/plain');
        const draggedTask = dayTasks.find(t => t.id === draggedTaskId);
        
        // If dropping a task from a group onto this individual task, ungroup it
        if (draggedTask && draggedTask.isGrouped && draggedTask.id !== task.id) {
          onUpdateTask(draggedTaskId, { isGrouped: false, groupId: undefined });
        }
      }}
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
              // Turn off priority and move to end of non-priority tasks
              const priorityTasks = cellTasks.filter((t) => t.id !== task.id && !!t.isPriority);
              const nonPriorityTasks = cellTasks.filter((t) => t.id !== task.id && !t.isPriority);
              
              // Update priorities for all tasks in cell
              priorityTasks.forEach((t, index) => {
                onUpdateTask(t.id, { priority: index + 1 });
              });
              
              // Move this task to end of non-priority section
              nonPriorityTasks.forEach((t, index) => {
                onUpdateTask(t.id, { priority: priorityTasks.length + index + 1 });
              });
              
              onUpdateTask(task.id, { 
                isPriority: false, 
                priority: priorityTasks.length + nonPriorityTasks.length + 1 
              });
            } else {
              // Make priority: position at end of existing priority tasks
              const priorityTasks = cellTasks.filter((t) => t.id !== task.id && !!t.isPriority);
              const nonPriorityTasks = cellTasks.filter((t) => t.id !== task.id && !t.isPriority);
              
              // Update priorities for non-priority tasks (shift them down)
              nonPriorityTasks.forEach((t, index) => {
                onUpdateTask(t.id, { priority: priorityTasks.length + 2 + index });
              });
              
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
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [newTaskTitles, setNewTaskTitles] = useState<Record<string, string>>({});
  const [taskGroups, setTaskGroups] = useState<TaskGroup[]>([]);
  const [autoGrouping, setAutoGrouping] = useState(true);
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

  // Auto-group similar tasks
  useEffect(() => {
    if (autoGrouping) {
      const uncompletedTasks = dayTasks.filter(task => !task.completed && !task.isGrouped);
      const { groups, ungroupedTasks } = createTaskGroups(uncompletedTasks);
      setTaskGroups(groups);
      
      // Mark grouped tasks
      groups.forEach(group => {
        group.taskIds.forEach(taskId => {
          onUpdateTask(taskId, { isGrouped: true, groupId: group.id });
        });
      });
    }
  }, [dayTasks.length, autoGrouping]);

  // Auto-assign priority to first task in 60min deep and light work cells
  useEffect(() => {
    WORK_TYPES.forEach(workType => {
      if (workType === 'deep' || workType === 'light') {
        const cellTasks = dayTasks.filter(task => 
          task.workType === workType && 
          task.duration === 60 && 
          !task.completed &&
          !task.isGrouped
        ).sort((a, b) => (a.priority || 999) - (b.priority || 999));

        // Auto-priority the first task if no tasks have priority
        if (cellTasks.length > 0 && !cellTasks.some(task => task.isPriority)) {
          onUpdateTask(cellTasks[0].id, { isPriority: true, priority: 1 });
        }
      }
    });
  }, [dayTasks]);

  const getTasksForCell = (workType: WorkType, duration: number) => {
    return dayTasks.filter(task => 
      task.workType === workType && 
      task.duration === duration && 
      !task.completed &&
      !task.isGrouped // Exclude grouped tasks from individual display
    ).sort((a, b) => (a.priority || 999) - (b.priority || 999));
  };

  const getGroupsForCell = (workType: WorkType, duration: number) => {
    return taskGroups.filter(group => 
      group.workType === workType && 
      group.duration === duration &&
      !group.completed
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

  const handleGroupClick = (group: TaskGroup, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (e?.ctrlKey || e?.metaKey) {
      const next = new Set(selectedGroups);
      if (next.has(group.id)) next.delete(group.id); else next.add(group.id);
      setSelectedGroups(next);
    } else {
      setSelectedGroups(new Set([group.id]));
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

  // Group management functions
  const handleUpdateGroup = (groupId: string, updates: Partial<TaskGroup>) => {
    setTaskGroups(prev => prev.map(group => 
      group.id === groupId ? { ...group, ...updates } : group
    ));
  };

  const handleDeleteGroup = (groupId: string) => {
    const group = taskGroups.find(g => g.id === groupId);
    if (group) {
      // Ungroup all tasks in this group
      group.taskIds.forEach(taskId => {
        onUpdateTask(taskId, { isGrouped: false, groupId: undefined });
      });
      setTaskGroups(prev => prev.filter(g => g.id !== groupId));
    }
  };

  const handleDuplicateGroup = (group: TaskGroup) => {
    // Duplicate all tasks in the group
    const groupTasks = dayTasks.filter(task => group.taskIds.includes(task.id));
    groupTasks.forEach(task => {
      onDuplicateTask(task);
    });
  };

  const handleRemoveTaskFromGroup = (groupId: string, taskId: string) => {
    const updatedGroup = removeTaskFromGroup(taskGroups.find(g => g.id === groupId)!, taskId);
    
    if (updatedGroup) {
      setTaskGroups(prev => prev.map(g => g.id === groupId ? updatedGroup : g));
    } else {
      // Group dissolved, remove it and ungroup remaining task
      const group = taskGroups.find(g => g.id === groupId);
      if (group) {
        group.taskIds.forEach(id => {
          onUpdateTask(id, { isGrouped: false, groupId: undefined });
        });
        setTaskGroups(prev => prev.filter(g => g.id !== groupId));
      }
    }
    
    // Ungroup the removed task
    onUpdateTask(taskId, { isGrouped: false, groupId: undefined });
  };

  const toggleAutoGrouping = () => {
    if (autoGrouping) {
      // Disable grouping - ungroup all tasks
      taskGroups.forEach(group => {
        group.taskIds.forEach(taskId => {
          onUpdateTask(taskId, { isGrouped: false, groupId: undefined });
        });
      });
      setTaskGroups([]);
    }
    setAutoGrouping(!autoGrouping);
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

    // Check if dragging a task
    const activeTask = dayTasks.find(task => task.id === activeId);
    const activeGroup = taskGroups.find(group => group.id === activeId);
    
    if (!activeTask && !activeGroup) {
      setActiveId(null);
      return;
    }

    // Handle dragging task onto a group
    if (activeTask && taskGroups.some(g => g.id === overId)) {
      const targetGroup = taskGroups.find(g => g.id === overId);
      if (targetGroup && canAddTaskToGroup(targetGroup, activeTask)) {
        // Add task to group
        const updatedGroup = addTaskToGroup(targetGroup, activeTask);
        setTaskGroups(prev => prev.map(g => g.id === targetGroup.id ? updatedGroup : g));
        onUpdateTask(activeId, { isGrouped: true, groupId: targetGroup.id });
        setSelectedTasks(new Set());
        setActiveId(null);
        return;
      }
    }

    // Handle dragging task or group to a cell
    const selectedIds = activeTask ? 
      (selectedTasks.has(activeId) ? Array.from(selectedTasks) : [activeId]) :
      (selectedGroups.has(activeId) ? Array.from(selectedGroups) : [activeId]);
    
    const orderedSelectedIds = dayTasks.filter(t => selectedIds.includes(t.id)).map(t => t.id);

    const buildNewOrder = (cellTasks: Task[], cellGroups: TaskGroup[], insertIndex: number, targetWorkType: WorkType, targetDuration: typeof DURATIONS[number]) => {
      // Filter out selected items from current cell
      const filteredTasks = cellTasks.filter(t => !orderedSelectedIds.includes(t.id));
      const filteredGroups = cellGroups.filter(g => !selectedIds.includes(g.id));
      
      // Combine tasks and groups, maintaining their order
      const combinedItems = [
        ...filteredGroups.map(g => ({ type: 'group', id: g.id, priority: g.priority || 999 })),
        ...filteredTasks.map(t => ({ type: 'task', id: t.id, priority: t.priority || 999 }))
      ].sort((a, b) => a.priority - b.priority);

      // Insert selected items at the specified index
      const selectedItems = activeTask ? 
        orderedSelectedIds.map(id => ({ type: 'task', id })) :
        [{ type: 'group', id: activeId }];

      const newOrder = [
        ...combinedItems.slice(0, insertIndex),
        ...selectedItems,
        ...combinedItems.slice(insertIndex)
      ];

      // Update priorities and properties
      newOrder.forEach((item, i) => {
        const newPriority = i + 1;
        
        if (item.type === 'task') {
          // Check if task should auto-get priority based on position
          const shouldBePriority = (targetWorkType === 'deep' || targetWorkType === 'light') && 
                                   targetDuration === 60 && 
                                   i === 0; // First position in 60min deep/light work
          
          onUpdateTask(item.id, {
            workType: targetWorkType,
            duration: targetDuration,
            scheduledDay: day,
            priority: newPriority,
            isPriority: shouldBePriority || (i < newOrder.findIndex(item => 
              item.type === 'task' && 
              dayTasks.find(t => t.id === item.id && !t.isPriority)
            ) && newOrder.findIndex(item => 
              item.type === 'task' && 
              dayTasks.find(t => t.id === item.id && t.isPriority)
            ) !== -1)
          });
        } else {
          // Update group
          setTaskGroups(prev => prev.map(g => 
            g.id === item.id ? {
              ...g,
              workType: targetWorkType,
              duration: targetDuration,
              scheduledDay: day,
              priority: newPriority
            } : g
          ));
        }
      });
    };

    // If dropped on a cell container (e.g., "deep-60" or "deep-60-top")
    const isCellTarget = WORK_TYPES.some((wt) => overId.startsWith(`${wt}-`));
    if (isCellTarget) {
      const { workType, duration } = parseCellId(overId);
      const targetCellTasks = getTasksForCell(workType, duration);
      const targetCellGroups = getGroupsForCell(workType, duration);
      const droppingOnTop = overId.endsWith('-top');
      const insertIndex = droppingOnTop ? 0 : targetCellTasks.length + targetCellGroups.length;

      buildNewOrder(targetCellTasks, targetCellGroups, insertIndex, workType, duration);
      setSelectedTasks(new Set());
      setSelectedGroups(new Set());
      setActiveId(null);
      return;
    }

    // If dropped on another task or group, move to that position
    if (overId !== activeId) {
      const overTask = dayTasks.find(task => task.id === overId);
      const overGroup = taskGroups.find(group => group.id === overId);
      
      if (overTask || overGroup) {
        const targetWorkType = overTask ? overTask.workType : overGroup!.workType;
        const targetDuration = overTask ? overTask.duration : overGroup!.duration;
        
        const cellTasks = getTasksForCell(targetWorkType, targetDuration);
        const cellGroups = getGroupsForCell(targetWorkType, targetDuration);
        
        // Find position of target item
        const combinedItems = [
          ...cellGroups.map(g => ({ type: 'group', id: g.id, priority: g.priority || 999 })),
          ...cellTasks.map(t => ({ type: 'task', id: t.id, priority: t.priority || 999 }))
        ].sort((a, b) => a.priority - b.priority);
        
        const overIndex = combinedItems.findIndex(item => item.id === overId);
        const insertIndex = Math.max(0, overIndex);
        
        buildNewOrder(cellTasks, cellGroups, insertIndex, targetWorkType, targetDuration);
        setSelectedTasks(new Set());
        setSelectedGroups(new Set());
      }
    }

    setActiveId(null);
  };

  // Calculate total time for each work type (including groups)
  const getWorkTypeTotal = (workType: WorkType) => {
    const taskTotal = dayTasks
      .filter(task => task.workType === workType && !task.completed && !task.isGrouped)
      .reduce((sum, task) => sum + (task.duration / 60), 0);
    
    const groupTotal = taskGroups
      .filter(group => group.workType === workType && !group.completed)
      .reduce((sum, group) => sum + (group.taskIds.length * group.duration / 60), 0);
    
    return taskTotal + groupTotal;
  };

  // Calculate total time for a specific cell (including groups)
  const getCellTotal = (workType: WorkType, duration: number) => {
    const cellTasks = getTasksForCell(workType, duration);
    const cellGroups = getGroupsForCell(workType, duration);
    const taskTime = (cellTasks.length * duration) / 60;
    const groupTime = cellGroups.reduce((sum, group) => sum + (group.taskIds.length * duration / 60), 0);
    return taskTime + groupTime;
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
      onClick={() => {
        setSelectedTasks(new Set());
        setSelectedGroups(new Set());
      }}
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
            
            <div className="flex items-center gap-3">
              {/* Auto-grouping toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAutoGrouping}
                className={cn(
                  "text-xs h-7",
                  autoGrouping ? "bg-primary/20 border-primary/30" : "bg-muted/50"
                )}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                {autoGrouping ? 'Grouping On' : 'Grouping Off'}
              </Button>
              
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
                  const cellGroups = getGroupsForCell(workType, duration);
                  const cellTotal = getCellTotal(workType, duration);
                  const cellId = `${workType}-${duration}`;
                  
                  return (
                    <DroppableCell id={cellId} key={cellId}>
                        <Card 
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
                        
                          {/* Groups and Tasks */}
                          <SortableContext 
                            id={cellId}
                            items={[
                              ...cellGroups.map(group => group.id),
                              ...cellTasks.map(task => task.id)
                            ]}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-2">
                              {/* Top drop zone to allow placing at first position */}
                              <DroppableCell id={`${cellId}-top`}>
                                <div className="h-6 -mt-2" />
                              </DroppableCell>
                              
                              {/* Render Groups */}
                              {cellGroups.map((group) => (
                                <TaskGroupCard
                                  key={group.id}
                                  group={group}
                                  tasks={dayTasks}
                                  onUpdateGroup={handleUpdateGroup}
                                  onDeleteGroup={handleDeleteGroup}
                                  onDuplicateGroup={handleDuplicateGroup}
                                  onRemoveTaskFromGroup={handleRemoveTaskFromGroup}
                                  onUpdateTask={onUpdateTask}
                                  isSelected={selectedGroups.has(group.id)}
                                  onClick={(e) => handleGroupClick(group, e)}
                                />
                              ))}
                              
                              {/* Render Individual Tasks */}
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
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                const draggedTaskId = e.dataTransfer.getData('text/plain');
                                const draggedTask = dayTasks.find(t => t.id === draggedTaskId);
                                
                                // If dropping a grouped task onto an empty cell, ungroup it
                                if (draggedTask && draggedTask.isGrouped) {
                                  onUpdateTask(draggedTaskId, { 
                                    isGrouped: false, 
                                    groupId: undefined,
                                    workType,
                                    duration,
                                    scheduledDay: day
                                  });
                                }
                              }}
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
          ) : activeId && taskGroups.find(g => g.id === activeId) ? (
            <div className="bg-white/30 backdrop-blur-sm border border-white/50 p-2 rounded-lg">
              <p className="text-xs font-medium text-white">
                {taskGroups.find(g => g.id === activeId)?.title}
              </p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}