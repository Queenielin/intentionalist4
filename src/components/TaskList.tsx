import { Task } from '@/types/task';
import TaskCard from './TaskCard';
import { Card } from '@/components/ui/card';

interface TaskListProps {
  tasks: Task[];
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
}

export default function TaskList({ tasks, onUpdateTask, onDeleteTask, onCompleteTask }: TaskListProps) {
  // Sort tasks by work type priority (deep -> light -> admin) and completion status
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    
    const workTypePriority = { deep: 0, light: 1, admin: 2 };
    return workTypePriority[a.workType] - workTypePriority[b.workType];
  });

  if (tasks.length === 0) {
    return (
      <Card className="p-8 text-center bg-muted/30 border-dashed border-2">
        <p className="text-muted-foreground text-lg">No tasks yet</p>
        <p className="text-sm text-muted-foreground mt-2">
          Add your first task above to get started with energy-optimized planning
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Today's Tasks ({tasks.filter(t => !t.completed).length} remaining)
      </h3>
      
      {sortedTasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onUpdate={onUpdateTask}
          onDelete={onDeleteTask}
          onComplete={onCompleteTask}
        />
      ))}
    </div>
  );
}