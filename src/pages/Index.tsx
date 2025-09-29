import { useState, useCallback } from 'react';
import { Task, Category8 } from '@/types/task';
import TaskInput from '@/components/TaskInput';
import TaskList from '@/components/TaskList';
import WorkloadSummary from '@/components/WorkloadSummary';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function Index() {
  const [tasks, setTasks] = useState<Task[]>([]);

  const handleAddTask = useCallback((title: string, duration: 15 | 30 | 60, scheduledDay?: 'today' | 'tomorrow') => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      category: 'Clerical & Admin Routines' as Category8, // Default category until AI categorizes
      duration,
      completed: false,
      slotId: 'default-slot',
      scheduledDay,
      createdAt: new Date(),
      isCategorizing: true, // Show loading state while AI processes
    };

    setTasks(prev => [...prev, newTask]);
  }, []);

  const handleUpdateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    ));
  }, []);

  const handleDeleteTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  }, []);

  const handleCompleteTask = useCallback((taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Energy-Optimized Task Manager
          </h1>
          <p className="text-muted-foreground">
            Plan your day with cognitive load balancing and productivity limits
          </p>
        </header>

        <div className="space-y-6">
          {/* Task Input */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Add New Tasks</h2>
            <TaskInput onAddTask={handleAddTask} />
          </Card>

          {/* Workload Summary */}
          <WorkloadSummary tasks={tasks} />

          <Separator />

          {/* Task List */}
          <TaskList 
            tasks={tasks}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onCompleteTask={handleCompleteTask}
          />
        </div>
      </div>
    </div>
  );
}