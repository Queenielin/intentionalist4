import { Task, WorkType } from '@/types/task';
import TaskCard from './TaskCard';

interface SubcategoryTaskListProps {
  tasks: Task[];
  groupTitle: string;
  workType: WorkType;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onDuplicateTask: (task: Task) => void;
  onCompleteTask: (taskId: string) => void;
  onAddTask: (title: string, workType: WorkType, duration: 15 | 30 | 60, scheduledDay?: 'today' | 'tomorrow') => void;
}

export default function SubcategoryTaskList({
  tasks,
  groupTitle,
  workType,
  onUpdateTask,
  onDeleteTask,
  onDuplicateTask,
  onCompleteTask,
  onAddTask
}: SubcategoryTaskListProps) {
  return (
    <div className="space-y-2">
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