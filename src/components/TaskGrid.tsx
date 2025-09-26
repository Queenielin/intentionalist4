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
      'Strategy & Problem-Solving',
      'Creative Production', 
      'Research & Learning',
      'Building & Designing'
    ]
  },
  light: {
    title: 'Light Work',
    subcategories: [
      'Communication',
      'Review & Feedback',
      'Organizing & Planning', 
      'Follow-Ups & Coordination'
    ]
  },
  admin: {
    title: 'Admin',
    subcategories: [
      'Documentation & Data Entry',
      'Scheduling & Calendar',
      'File & Tool Maintenance',
      'Routine Operations'
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

  if (dayTasks.length === 0) {
    return (
      <Card className="p-8 text-center bg-muted/30 border-dashed border-2">
        <p className="text-muted-foreground text-lg">No tasks for {day}</p>
        <p className="text-sm text-muted-foreground mt-2">
          Add your first task above to get started with energy-optimized planning
        </p>
      </Card>
    );
  }

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

      <div className="space-y-4">
        {/* Column headers */}
        <div className="grid grid-cols-4 gap-4">
          <div></div> {/* Empty cell for row labels */}
          {WORK_TYPES.map((workType) => {
            const config = WORK_TYPE_CONFIG[workType];
            const workTypeTasks = dayTasks.filter(task => task.workType === workType && !task.completed);
            
            return (
              <div key={workType} className="text-center p-3 rounded-lg bg-muted/50">
                <h3 className="text-sm font-semibold capitalize text-foreground">
                  {config.title}
                </h3>
                <Badge variant="secondary" className="text-xs mt-1">
                  {workTypeTasks.length} tasks
                </Badge>
              </div>
            );
          })}
        </div>

        {/* Grid rows */}
        {allSubcategories.map((subcategory) => {
          // Determine which work type this subcategory belongs to
          const workType = WORK_TYPES.find(wt => {
            const config = WORK_TYPE_CONFIG[wt];
            return config.subcategories.some(sub => sub === subcategory);
          });
          
          if (!workType) return null;

          return (
            <div key={subcategory} className="grid grid-cols-4 gap-4">
              {/* Row label */}
              <div className="flex items-center p-3 text-sm font-medium text-muted-foreground bg-muted/30 rounded-lg">
                <div className="truncate" title={subcategory}>
                  {subcategory}
                </div>
              </div>

              {/* Cells for each work type */}
              {WORK_TYPES.map((cellWorkType) => {
                const isCorrectColumn = cellWorkType === workType;
                const cellTasks = isCorrectColumn ? getTasksForCell(cellWorkType, subcategory) : [];
                const cellTotal = isCorrectColumn ? getCellTotal(cellWorkType, subcategory) : 0;
                const cellId = `${cellWorkType}-${subcategory}`;

                return (
                  <Card 
                    key={cellWorkType}
                    className={cn(
                      "min-h-[150px] p-3 transition-all duration-200",
                      "border border-muted-foreground/20",
                      isCorrectColumn 
                        ? cn("hover:border-muted-foreground/40", getWorkTypeColor(cellWorkType))
                        : "bg-muted/10 opacity-30",
                    )}
                  >
                    {isCorrectColumn ? (
                      <div className="space-y-2">
                        {/* Cell header */}
                        {cellTotal > 0 && (
                          <div className="text-center text-xs text-white/70">
                            {cellTotal.toFixed(1)}h total
                          </div>
                        )}

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
                                  onAddTask(title, cellWorkType, 30, day);
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-muted-foreground/50">
                        N/A
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}