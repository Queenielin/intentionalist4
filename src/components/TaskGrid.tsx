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

/** Get bucket header info */
function getBucketHeader(bucket: WorkBucket): { title: string; colorClass: string } {
  switch (bucket) {
    case 'deep':
      return { title: 'Deep Work', colorClass: 'task-deep' };
    case 'light':
      return { title: 'Light Work', colorClass: 'task-light' };
    case 'admin':
      return { title: 'Admin Work', colorClass: 'task-admin' };
    default:
      return { title: 'Light Work', colorClass: 'task-light' };
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

  // Group categories by bucket
  const bucketGroups: Record<WorkBucket, Category8[]> = {
    deep: [],
    light: [],
    admin: []
  };

  CATEGORIES_8.forEach(category => {
    const bucket = CATEGORY_TO_BUCKET[category];
    bucketGroups[bucket].push(category);
  });
  return (
    <div className="space-y-8">
      {/* Row 1: Deep Work */}
      <div className="space-y-4">
        {/* Deep Work Header */}
        <div className={cn(
          'p-4 rounded-lg text-center',
          getBucketColorClass('deep')
        )}>
          <h3 className="text-xl font-bold text-white">
            Deep Work
          </h3>
        </div>
        
        {/* Deep Work Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {bucketGroups.deep.map((category) => {
            const colorClass = getBucketColorClass('deep');
            const catTasks = getTasksForCategory(category);

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
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <h4 className="text-lg font-bold text-white">
                        {category}
                      </h4>
                      <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">
                        {catTasks.length}
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
      </div>

      {/* Row 2: Light Work and Admin Work */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Light Work Section */}
        <div className="space-y-4">
          {/* Light Work Header */}
          <div className={cn(
            'p-4 rounded-lg text-center',
            getBucketColorClass('light')
          )}>
            <h3 className="text-xl font-bold text-white">
              Light Work
            </h3>
          </div>
          
          {/* Light Work Categories Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {bucketGroups.light.map((category) => {
              const colorClass = getBucketColorClass('light');
              const catTasks = getTasksForCategory(category);

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
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <h4 className="text-lg font-bold text-white">
                          {category}
                        </h4>
                        <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">
                          {catTasks.length}
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
        </div>

        {/* Admin Work Section */}
        <div className="space-y-4">
          {/* Admin Work Header */}
          <div className={cn(
            'p-4 rounded-lg text-center',
            getBucketColorClass('admin')
          )}>
            <h3 className="text-xl font-bold text-white">
              Admin Work
            </h3>
          </div>
          
          {/* Admin Work Categories Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {bucketGroups.admin.map((category) => {
              const colorClass = getBucketColorClass('admin');
              const catTasks = getTasksForCategory(category);

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
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <h4 className="text-lg font-bold text-white">
                          {category}
                        </h4>
                        <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">
                          {catTasks.length}
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
        </div>
      </div>
    </div>
  );
}