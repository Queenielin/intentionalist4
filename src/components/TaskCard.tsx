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
        'p-3 transition-all duration-300 cursor-move group hover:scale-102 border-0',
        colorClass,
        task.completed && 'task-completed',
        isDragging && 'task-dragging'
      )}
    >
      <div className="flex items-center gap-2">
        <Grip className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onComplete(task.id)}
          className={cn(
            'p-1 h-6 w-6 transition-all duration-300',
            task.completed ? 'text-current' : 'text-white/70 hover:text-white'
          )}
        >
          <CheckCircle2 className={cn('w-4 h-4', task.completed && 'fill-current')} />
        </Button>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyPress}
              onBlur={handleSaveEdit}
              className="text-xs bg-white/20 border-white/30 text-white placeholder:text-white/70 h-6"
              autoFocus
            />
          ) : (
            <div>
              <p className={cn('font-medium text-xs', task.completed && 'line-through opacity-70')}>
                {task.title}
                {task.isCategorizing && (
                  <span className="ml-1 text-xs opacity-75 animate-pulse">...</span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Duration */}
        <div className="flex items-center gap-1 text-xs opacity-90">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onUpdate(task.id, { duration: cycleDuration(task.duration) })}
            className="h-5 px-1.5 text-xs bg-white/20 border border-white/30 text-white hover:bg-white/30 transition-colors"
          >
            {task.duration}m
          </Button>
        </div>

        {/* Edit/Delete controls */}
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="p-1 h-5 w-5 text-white/70 hover:text-white"
          >
            <Edit3 className="w-2.5 h-2.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(task.id)}
            className="p-1 h-5 w-5 text-white/70 hover:text-white"
          >
            <Trash2 className="w-2.5 h-2.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
