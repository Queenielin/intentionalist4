import { Task, CATEGORY_TO_BUCKET, type WorkBucket } from '@/types/task';
import TaskCard from './TaskCard';
import { Card } from '@/components/ui/card';

interface TaskListProps {
  tasks: Task[];
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
}

export default function TaskList({
  tasks,
  onUpdateTask,
  onDeleteTask,
  onCompleteTask,
}: TaskListProps) {
  // Priority for buckets (derived from category)
  const bucketPriority: Record<WorkBucket, number> = { deep: 0, light: 1, admin: 2 };

  const sortedTasks = [...tasks].sort((a, b) => {
    // 1) incomplete before complete
    if (a.completed !== b.completed) return a.completed ? 1 : -1;

    // 2) bucket priority (derived from category)
    const aBucket = CATEGORY_TO_BUCKET[a.category];
    const bBucket = CATEGORY_TO_BUCKET[b.category];
    if (aBucket !== bBucket) {
      return bucketPriority[aBucket] - bucketPriority[bBucket];
    }

    // 3) optionally: shorter tasks first within same bucket
    if (a.duration !== b.duration) return a.duration - b.duration;

    // 4) finally stable by title
    return a.title.localeCompare(b.title);
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
        Today&apos;s Tasks ({tasks.filter((t) => !t.completed).length} remaining)
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
