import TaskCard from './TaskCard';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Task,
  Category8,
  CATEGORIES_8,
  CATEGORY_TO_BUCKET,
  WorkBucket,
} from '@/types/task';

interface TaskGridProps {
  tasks: Task[];
  day: 'today' | 'tomorrow';
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onDuplicateTask: (task: Task) => void; // kept if you still call it elsewhere
  onCompleteTask: (taskId: string) => void;
  onAddTask: (
    title: string,
    category: Category8,
    duration: 15 | 30 | 60,
    scheduledDay?: 'today' | 'tomorrow'
  ) => void;
}

/** Map bucket → tailwind class used for color. */
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

export default function TaskGrid({
  tasks,
  day,
  onUpdateTask,
  onDeleteTask,
  onDuplicateTask,
  onCompleteTask,
  onAddTask,
}: TaskGridProps) {
  const dayTasks = tasks.filter((task) => task.scheduledDay === day);

  const getTasksForCategory = (category: Category8) =>
    dayTasks.filter((t) => t.category === category && !t.completed);

  const getHoursTotalForCategory = (category: Category8) =>
    getTasksForCategory(category).reduce((sum, t) => sum + t.duration / 60, 0);

  const remaining = dayTasks.filter((t) => !t.completed).length;
  const completed = dayTasks.filter((t) => t.completed).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {CATEGORIES_8.map((category) => {
          const bucket = CATEGORY_TO_BUCKET[category];
          const colorClass = getBucketColorClass(bucket);
          const catTasks = getTasksForCategory(category);
          const hours = getHoursTotalForCategory(category);

          return (
            <Card
              key={category}
              className={cn(
                'min-h-[300px] p-6 transition-all duration-200 border-0 shadow-lg',
                colorClass
              )}
            >
              <div className="space-y-4">
                {/* Category header */}
                <div className="text-center">
                  <h4 className="text-lg font-bold text-white mb-2">
                    {category}
                  </h4>
                  <div className="flex items-center justify-center">
                    <Badge variant="secondary" className="text-sm bg-white/20 text-white border-white/30">
                      {catTasks.length} tasks
                    </Badge>
                  </div>
                </div>

                {/* Tasks */}
                <div className="space-y-3">
                  {catTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onUpdate={onUpdateTask}
                      onDelete={onDeleteTask}
                      onComplete={onCompleteTask}
                    />
                  ))}

                  {/* Add task input for this category */}
                  <Input
                    placeholder={`Add ${category.toLowerCase().split(' ')[0]} task...`}
                    className="text-sm bg-white/20 border-white/30 text-white placeholder:text-white/60 h-10"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const title = (e.target as HTMLInputElement).value.trim();
                        if (title) {
                          onAddTask(title, category, 30, day);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </Card>
          );
        })}
    </div>
  );
}
