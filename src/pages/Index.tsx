import { useState, useCallback } from 'react';
import { Task, Category8 } from '@/types/task';
import TaskInput from '@/components/TaskInput';
import TaskGrid from '@/components/TaskGrid';
import CalendarView from '@/components/CalendarView';
import WorkloadSummary from '@/components/WorkloadSummary';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, List } from 'lucide-react';

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
      scheduledDay: scheduledDay || 'today',
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

  const handleDuplicateTask = useCallback((task: Task) => {
    const newTask: Task = {
      ...task,
      id: crypto.randomUUID(),
      title: `${task.title} (copy)`,
      completed: false,
      createdAt: new Date(),
    };
    setTasks(prev => [...prev, newTask]);
  }, []);

  const todayTasks = tasks.filter(t => t.scheduledDay === 'today');
  const remainingTasks = todayTasks.filter(t => !t.completed);
  const completedTasks = todayTasks.filter(t => t.completed);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Task Input Section */}
        <div className="mb-8">
          <TaskInput onAddTask={handleAddTask} />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="planning" className="w-full">
          <div className="flex items-center justify-between mb-6">
            <TabsList className="grid w-auto grid-cols-2">
              <TabsTrigger value="planning" className="flex items-center gap-2">
                <List className="w-4 h-4" />
                Task Planning
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Schedule View
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">{remainingTasks.length} remaining</span>
                <span className="text-muted-foreground">•</span>
                <span className="font-medium">{completedTasks.length} completed</span>
              </div>
            </div>
          </div>

          <TabsContent value="planning" className="space-y-6">
            {/* Workload Summary */}
            <WorkloadSummary tasks={tasks} />

            {/* Today's Tasks Header */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Today's Tasks</h2>
              
              {/* Task Grid */}
              <TaskGrid
                tasks={tasks}
                day="today"
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
                onDuplicateTask={handleDuplicateTask}
                onCompleteTask={handleCompleteTask}
                onAddTask={handleAddTask}
              />
            </div>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6">
            <CalendarView 
              tasks={tasks}
              onTaskUpdate={setTasks}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}