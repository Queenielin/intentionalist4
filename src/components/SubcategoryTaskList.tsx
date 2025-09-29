// src/components/SubcategoryTaskList.tsx
import TaskCard from './TaskCard';
import type { Task } from '@/types/task';

interface SubcategoryTaskListProps {
  tasks: Task[];
  // If you want to show a small header above the list, keep this.
  title?: string;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
}

export default function SubcategoryTaskList({
  tasks,
  title,
  onUpdateTask,
  onDeleteTask,
  onCompleteTask,
}: SubcategoryTaskListProps) {
  return (
    <div className="space-y-2">
      {title && (
        <div className="px-1 py-1 text-xs font-medium text-white/80">
          {title}
        </div>
      )}

      {tasks.map((task) => (
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
