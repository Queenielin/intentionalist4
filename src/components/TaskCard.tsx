import { useState } from 'react';
import { Grip, Clock, CheckCircle2, Edit3, Trash2 } from 'lucide-react';
import { Task, Category8, CATEGORY_TO_BUCKET, WorkBucket } from '@/types/task';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
  onComplete: (taskId: string) => void;
  isDragging?: boolean;
}

/** Map bucket → tailwind class you already use elsewhere */
function getBucketColorClass(bucket: WorkBucket): string {
  switch (bucket) {
    case 'deep':
      return 'task-deep';
    case 'light':
      return 'task-light';
    case 'admin':
      return 'task-admin';
    default:
      return 'task-light';
  }
}

const CATEGORY_OPTIONS: Category8[] = [
  'Analytical × Strategic',
  'Creative × Generative',
  'Learning × Absorptive',
  'Constructive × Building',
  'Social & Relational',
  'Critical & Structuring',
  'Clerical & Admin Routines',
  'Logistics & Maintenance',
];

export default function TaskCard({ task, onUpdate, onDelete, onComplete, isDragging }: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const bucket = CATEGORY_TO_BUCKET[task.category];
  const colorClass = getBucketColorClass(bucket);

  const handleSaveEdit = () => {
    if (editTitle.trim()) {
      onUpdate(task.id, { title: editTitle.trim() });
      setIsEditing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditTitle(task.title);
      setIsEditing(false);
    }
  };

  const cycleDuration = (current: 15 | 30 | 60): 15 | 30 | 60 => {
    if (current === 15) return 30;
    if (current === 30) return 60;
    return 15; // 60 -> 15
  };

  return (
    <Card
      className={cn(
        'p-4 transition-all duration-300 cursor-move group hover:scale-102 border-0',
        colorClass,
        task.completed && 'task-completed',
        isDragging && 'task-dragging'
      )}
    >
      <div className="flex items-center gap-3">
        <Grip className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onComplete(task.id)}
          className={cn(
            'p-1 h-8 w-8 transition-all duration-300',
            task.completed ? 'text-current' : 'text-white/70 hover:text-white'
          )}
        >
          <CheckCircle2 className={cn('w-5 h-5', task.completed && 'fill-current')} />
        </Button>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyPress}
              onBlur={handleSaveEdit}
              className="text-sm bg-white/20 border-white/30 text-white placeholder:text-white/70"
              autoFocus
            />
          ) : (
            <div>
              <p className={cn('font-medium text-sm', task.completed && 'line-through opacity-70')}>
                {task.title}
                {task.isCategorizing && (
                  <span className="ml-2 text-xs opacity-75 animate-pulse">Categorizing...</span>
                )}
              </p>
              {task.taskType && !task.isCategorizing && (
                <p className="text-xs opacity-75 mt-1">{task.taskType}</p>
              )}
            </div>
          )}
        </div>

        {/* Duration */}
        <div className="flex items-center gap-2 text-xs opacity-90">
          <Clock className="w-4 h-4" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onUpdate(task.id, { duration: cycleDuration(task.duration) })}
            className="h-6 px-2 text-xs bg-white/20 border border-white/30 text-white hover:bg-white/30 transition-colors"
          >
            {task.duration}m
          </Button>
        </div>

        {/* Category selector (8 categories) */}
        <Select
          value={task.category}
          onValueChange={(value) => onUpdate(task.id, { category: value as Category8 })}
        >
          <SelectTrigger className="w-56 h-6 text-xs bg-white/20 border-white/30 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Edit/Delete controls */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="p-1 h-6 w-6 text-white/70 hover:text-white"
          >
            <Edit3 className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(task.id)}
            className="p-1 h-6 w-6 text-white/70 hover:text-white"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="mt-2 text-xs opacity-75">
        {task.category} • {bucket.toUpperCase()} • {task.duration} minutes
      </div>
    </Card>
  );
}
