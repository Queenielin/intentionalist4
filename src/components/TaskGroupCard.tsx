import { useState } from 'react';
import { Task, TaskGroup, WorkType } from '@/types/task';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Copy, Trash2, Calendar, AlertTriangle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getWorkTypeColor } from '@/utils/taskAI';
import { Input } from '@/components/ui/input';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TaskGroupCardProps {
  group: TaskGroup;
  tasks: Task[]; // All tasks to find the ones in this group
  onUpdateGroup: (groupId: string, updates: Partial<TaskGroup>) => void;
  onDeleteGroup: (groupId: string) => void;
  onDuplicateGroup: (group: TaskGroup) => void;
  onRemoveTaskFromGroup: (groupId: string, taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  isSelected: boolean;
  onClick: (e?: React.MouseEvent) => void;
}

export default function TaskGroupCard({
  group,
  tasks,
  onUpdateGroup,
  onDeleteGroup,
  onDuplicateGroup,
  onRemoveTaskFromGroup,
  onUpdateTask,
  isSelected,
  onClick
}: TaskGroupCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(group.title);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: group.id,
    data: {
      type: 'group',
      group: group
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const groupTasks = tasks.filter(task => group.taskIds.includes(task.id));
  const completedCount = groupTasks.filter(task => task.completed).length;
  const totalDuration = group.taskIds.length * group.duration;

  const handleSaveEdit = () => {
    if (editTitle.trim()) {
      onUpdateGroup(group.id, { title: editTitle.trim() });
    }
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditTitle(group.title);
    }
  };

  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateGroup(group.id, { isExpanded: !group.isExpanded });
  };

  const togglePriority = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateGroup(group.id, { isPriority: !group.isPriority });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group relative rounded-lg backdrop-blur-sm border transition-all cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50 z-50",
        isSelected && "ring-2 ring-primary/50",
        group.isPriority 
          ? "bg-orange-500/30 border-orange-400/50 hover:bg-orange-500/40" 
          : "bg-white/20 border-white/30 hover:bg-white/30"
      )}
      onClick={onClick}
    >
      {/* Group Header */}
      <div className="p-3 border-b border-white/20">
        <div className="flex items-center gap-2">
          {/* Priority indicator */}
          <div
            className="w-3 h-3 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
            onClick={togglePriority}
          >
            {group.isPriority ? (
              <AlertTriangle className="w-3 h-3 text-orange-200 fill-orange-200" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-white/60" />
            )}
          </div>

          {/* Expand/collapse button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleExpanded}
            className="h-4 w-4 p-0 text-white/70 hover:text-white"
          >
            {group.isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </Button>

          {/* Group icon */}
          <Users className="w-3 h-3 text-white/70" />

          {/* Group title */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={handleKeyPress}
                onBlur={handleSaveEdit}
                className="text-xs h-6 bg-white/30 border-white/40 text-white"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <p 
                className={cn(
                  "text-xs font-medium truncate hover:text-white/80 cursor-text",
                  group.isPriority ? "text-orange-100" : "text-white"
                )}
                onDoubleClick={(e) => { 
                  e.stopPropagation(); 
                  setIsEditing(true); 
                  setEditTitle(group.title); 
                }}
              >
                {group.title}
              </p>
            )}
          </div>

          {/* Group stats */}
          <div className="flex items-center gap-1 text-xs text-white/70">
            <span>{completedCount}/{group.taskIds.length}</span>
            <span>•</span>
            <span>{Math.round(totalDuration)}min</span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateGroup(group.id, { scheduledDay: 'tomorrow' });
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
                onDuplicateGroup(group);
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
                onDeleteGroup(group.id);
              }}
              className="h-5 w-5 p-0 text-white/70 hover:text-white"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Individual tasks (when expanded) */}
      {group.isExpanded && (
        <div className="p-2 space-y-1">
          {groupTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-2 p-2 rounded bg-white/10 hover:bg-white/20 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Task completion checkbox */}
              <div
                className="w-3 h-3 rounded border border-white/40 flex items-center justify-center cursor-pointer hover:bg-white/20"
                onClick={() => onUpdateTask(task.id, { completed: !task.completed })}
              >
                {task.completed && (
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                )}
              </div>

              {/* Task title */}
              <span className={cn(
                "flex-1 text-xs",
                task.completed ? "text-white/50 line-through" : "text-white/90"
              )}>
                {task.title}
              </span>

              {/* Remove from group button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveTaskFromGroup(group.id, task.id)}
                className="h-4 w-4 p-0 text-white/50 hover:text-white/70 opacity-0 group-hover:opacity-100"
                title="Remove from group"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}