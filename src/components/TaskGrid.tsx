import { Task, WorkType } from '@/types/task';
import TaskCard from './TaskCard';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getWorkTypeColor } from '@/utils/taskAI';

interface TaskGridProps {
  tasks: Task[];
  day: 'today' | 'tomorrow';
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onDuplicateTask: (task: Task) => void;
  onCompleteTask: (taskId: string) => void;
  onAddTask: (title: string, workType: WorkType, duration: 15 | 30 | 60, scheduledDay?: 'today' | 'tomorrow') => void;
}

const WORK_TYPE_CONFIG = {
  deep: {
    title: 'Deep Work',
    subcategories: [
      'Analytical × Strategic',
      'Creative × Generative',
      'Learning × Absorptive',
      'Constructive × Building'
    ]
  },
  light: {
    title: 'Light Work',
    subcategories: [
      'Social & Relational',
      'Critical & Structuring'
    ]
  },
  admin: {
    title: 'Admin',
    subcategories: [
      'Clerical & Admin Routines',
      'Logistics & Maintenance'
    ]
  }
} as const;

const WORK_TYPES: WorkType[] = ['deep', 'light', 'admin'];

export default function TaskGrid({ 
  tasks, 
  day, 
  onUpdateTask, 
  onDeleteTask, 
  onDuplicateTask, 
  onCompleteTask,
  onAddTask 
}: TaskGridProps) {
  const dayTasks = tasks.filter(task => task.scheduledDay === day);
  
  // Get all unique subcategories in order
  const allSubcategories = [
    ...WORK_TYPE_CONFIG.deep.subcategories,
    ...WORK_TYPE_CONFIG.light.subcategories,
    ...WORK_TYPE_CONFIG.admin.subcategories,
  ];

  const getTasksForCell = (workType: WorkType, subcategory: string) => {
    return dayTasks.filter(task => 
      task.workType === workType && 
      task.taskType === subcategory && 
      !task.completed
    );
  };

  const getCellTotal = (workType: WorkType, subcategory: string) => {
    const cellTasks = getTasksForCell(workType, subcategory);
    return cellTasks.reduce((sum, task) => sum + (task.duration / 60), 0);
  };

  // Always show the grid, even if empty

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold capitalize">{day}'s Tasks</h2>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-xs">
            {dayTasks.filter(t => !t.completed).length} remaining
          </Badge>
          <Badge variant="outline" className="text-xs">
            {dayTasks.filter(t => t.completed).length} completed
          </Badge>
        </div>
      </div>

      {/* Work type columns */}
      <div className="grid grid-cols-3 gap-6">
        {WORK_TYPES.map((workType) => {
          const config = WORK_TYPE_CONFIG[workType];
          const workTypeTasks = dayTasks.filter(task => task.workType === workType && !task.completed);
          
          return (
            <div key={workType} className="space-y-4">
              {/* Column header */}
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <h3 className="text-sm font-semibold capitalize text-foreground">
                  {config.title}
                </h3>
                <Badge variant="secondary" className="text-xs mt-1">
                  {workTypeTasks.length} tasks
                </Badge>
              </div>

              {/* Subcategory cards */}
              <div className="space-y-3">
                {config.subcategories.map((subcategory) => {
                  const cellTasks = getTasksForCell(workType, subcategory);
                  const cellTotal = getCellTotal(workType, subcategory);

                  return (
                    <Card 
                      key={subcategory}
                      className={cn(
                        "min-h-[180px] p-4 transition-all duration-200",
                        "border border-muted-foreground/20",
                        "hover:border-muted-foreground/40", 
                        getWorkTypeColor(workType)
                      )}
                    >
                      <div className="space-y-3">
                        {/* Subcategory header */}
                        <div className="text-center">
                          <h4 className="text-sm font-medium text-white/90 mb-1">
                            {subcategory}
                          </h4>
                          {cellTotal > 0 && (
                            <div className="text-xs text-white/70">
                              {cellTotal.toFixed(1)}h total
                            </div>
                          )}
                        </div>

                        {/* Tasks */}
                        <div className="space-y-2">
                          {cellTasks.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              onUpdate={onUpdateTask}
                              onDelete={onDeleteTask}
                              onComplete={onCompleteTask}
                            />
                          ))}

                          {/* Add task input */}
                          <Input
                            placeholder={`Add ${subcategory.toLowerCase()} task...`}
                            className="text-xs bg-white/20 border-white/30 text-white placeholder:text-white/50"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const title = (e.target as HTMLInputElement).value.trim();
                                if (title) {
                                  onAddTask(title, workType, 30, day);
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
          );
        })}
      </div>
    </div>
  );
}