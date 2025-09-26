import { Task, WorkType } from '@/types/task';
import SubcategoryTaskList from './SubcategoryTaskList';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
    color: 'bg-blue-500/10 border-blue-200 dark:border-blue-800',
    subcategories: [
      'Strategy & Problem-Solving',
      'Creative Production', 
      'Research & Learning',
      'Building & Designing'
    ]
  },
  light: {
    title: 'Light Work',
    color: 'bg-green-500/10 border-green-200 dark:border-green-800',
    subcategories: [
      'Communication',
      'Review & Feedback',
      'Organizing & Planning', 
      'Follow-Ups & Coordination'
    ]
  },
  admin: {
    title: 'Admin',
    color: 'bg-yellow-500/10 border-yellow-200 dark:border-yellow-800',
    subcategories: [
      'Documentation & Data Entry',
      'Scheduling & Calendar',
      'File & Tool Maintenance',
      'Routine Operations'
    ]
  }
} as const;

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {(Object.keys(WORK_TYPE_CONFIG) as WorkType[]).map(workType => {
          const config = WORK_TYPE_CONFIG[workType];
          const workTypeTasks = dayTasks.filter(task => task.workType === workType);
          
          return (
            <div key={workType} className={`rounded-lg border-2 ${config.color} p-4`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{config.title}</h3>
                <Badge variant="secondary" className="text-xs">
                  {workTypeTasks.filter(t => !t.completed).length}
                </Badge>
              </div>

              <div className="space-y-4">
                {config.subcategories.map(subcategory => {
                  const subcategoryTasks = workTypeTasks.filter(task => 
                    task.taskType === subcategory
                  );
                  
                  return (
                    <div key={subcategory} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-muted-foreground">
                          {subcategory}
                        </h4>
                        {subcategoryTasks.length > 0 && (
                          <Badge variant="outline" className="text-xs h-5">
                            {subcategoryTasks.length}
                          </Badge>
                        )}
                      </div>
                      
                      {subcategoryTasks.length > 0 ? (
                        <SubcategoryTaskList
                          tasks={subcategoryTasks}
                          groupTitle={subcategory}
                          workType={workType}
                          onUpdateTask={onUpdateTask}
                          onDeleteTask={onDeleteTask}
                          onDuplicateTask={onDuplicateTask}
                          onCompleteTask={onCompleteTask}
                          onAddTask={onAddTask}
                        />
                      ) : (
                        <div className="p-3 border-2 border-dashed border-muted-foreground/20 rounded-lg text-center text-xs text-muted-foreground">
                          No tasks yet
                        </div>
                      )}
                    </div>
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