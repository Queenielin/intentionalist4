import { useState } from 'react';
import { Task, WorkType } from '@/types/task';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, GripVertical, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getWorkTypeColor } from '@/utils/taskAI';
import { Input } from '@/components/ui/input';

interface TaskGridProps {
  tasks: Task[];
  day: 'today' | 'tomorrow';
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onDuplicateTask: (task: Task) => void;
  onCompleteTask: (taskId: string) => void;
}

const WORK_TYPES: WorkType[] = ['deep', 'light', 'admin'];
const DURATIONS = [60, 30, 15] as const;

export default function TaskGrid({ 
  tasks, 
  day, 
  onUpdateTask, 
  onDeleteTask, 
  onDuplicateTask, 
  onCompleteTask 
}: TaskGridProps) {
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

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

  const handleTaskClick = (task: Task) => {
    setEditingTask(task.id);
    setEditTitle(task.title);
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

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold capitalize">{day}</h3>
      
      <div className="grid grid-cols-4 gap-3">
        {/* Header Row */}
        <div className="font-medium text-sm text-muted-foreground"></div>
        <div className="text-center font-medium text-sm">Deep Work</div>
        <div className="text-center font-medium text-sm">Light Work</div>
        <div className="text-center font-medium text-sm">Admin Work</div>

        {/* Duration Rows */}
        {DURATIONS.map(duration => (
          <div key={duration} className="contents">
            <div className="flex items-center justify-center font-medium text-sm text-muted-foreground">
              {duration}min
            </div>
            
            {WORK_TYPES.map(workType => {
              const cellTasks = getTasksForCell(workType, duration);
              
              return (
                <Card 
                  key={`${workType}-${duration}`}
                  className={cn(
                    "min-h-[120px] p-3 transition-all duration-200",
                    "border-2 border-dashed border-muted-foreground/20",
                    "hover:border-muted-foreground/40",
                    cellTasks.length > 0 && "border-solid",
                    getWorkTypeColor(workType)
                  )}
                >
                  <div className="space-y-2">
                    {cellTasks.map((task, index) => (
                      <div
                        key={task.id}
                        className={cn(
                          "group relative p-2 rounded-lg bg-white/20 backdrop-blur-sm",
                          "border border-white/30 hover:bg-white/30 transition-all",
                          "cursor-pointer"
                        )}
                        onClick={() => handleTaskClick(task)}
                      >
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full bg-white/60"
                            title={`Priority ${(task.priority || index + 1)}`}
                          />
                          
                          <div className="flex-1 min-w-0">
                            {editingTask === task.id ? (
                              <Input
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyDown={(e) => handleKeyPress(e, task.id)}
                                onBlur={() => handleSaveEdit(task.id)}
                                className="text-xs h-6 bg-white/30 border-white/40 text-white"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <p className="text-xs font-medium text-white truncate hover:text-white/80">
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
                        
                        {/* Priority indicator */}
                        {index === 0 && cellTasks.length > 1 && (
                          <div className="absolute -top-1 -right-1">
                            <Badge variant="secondary" className="h-4 text-xs bg-white/80 text-gray-800">
                              High
                            </Badge>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {cellTasks.length === 0 && (
                      <div className="flex items-center justify-center h-16 text-white/50 text-xs">
                        Drop tasks here
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}