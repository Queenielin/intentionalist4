import { useState, useCallback } from 'react';
import { Task, Category8 } from '@/types/task';
import TaskInput from '@/components/TaskInput';
import TaskGrid from '@/components/TaskGrid';
import CalendarView from '@/components/CalendarView';
import WorkloadSummary from '@/components/WorkloadSummary';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, List, LayoutGrid } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Index() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentView, setCurrentView] = useState<'planning' | 'schedule'>('planning');

  const handleAddTask = useCallback(async (title: string, duration: 15 | 30 | 60, scheduledDay?: 'today' | 'tomorrow') => {
    // Create temporary task with loading state
    const tempTask: Task = {
      id: crypto.randomUUID(),
      title,
      category: 'Social & Relational' as Category8, // Temporary category
      duration,
      completed: false,
      slotId: 'default-slot',
      scheduledDay: scheduledDay || 'today',
      createdAt: new Date(),
      isCategorizing: true, // Show loading state while AI processes
    };

    setTasks(prev => [...prev, tempTask]);

    try {
      // Call the edge function to categorize the task
      const { data, error } = await supabase.functions.invoke('categorize-tasks', {
        body: { tasks: [title] }
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error('Failed to categorize task');
        // Remove loading state but keep task with default category
        setTasks(prev => prev.map(t => 
          t.id === tempTask.id 
            ? { ...t, isCategorizing: false }
            : t
        ));
        return;
      }

      if (data?.classifications?.[0]) {
        const classification = data.classifications[0];
        console.log('Task classified:', classification);
        
        // Update task with AI classification
        setTasks(prev => prev.map(t => 
          t.id === tempTask.id 
            ? { 
                ...t, 
                title: classification.title || title,
                category: classification.category as Category8,
                duration: classification.duration,
                isCategorizing: false 
              }
            : t
        ));

        toast.success(`Task categorized as "${classification.category}"`);
      } else {
        console.error('No classification returned');
        setTasks(prev => prev.map(t => 
          t.id === tempTask.id 
            ? { ...t, isCategorizing: false }
            : t
        ));
      }
    } catch (err) {
      console.error('Failed to categorize task:', err);
      toast.error('Failed to categorize task');
      setTasks(prev => prev.map(t => 
        t.id === tempTask.id 
          ? { ...t, isCategorizing: false }
          : t
      ));
    }
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
      <div className="flex h-screen">
        {/* Left Sidebar - Task Input */}
        <div className="w-80 border-r border-border bg-muted/30 p-6 overflow-y-auto">
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-primary" />
              Add Tasks
            </h2>
            <TaskInput onAddTask={handleAddTask} />
          </div>
          
          {/* Task Stats */}
          <Card className="p-4 bg-background/50">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remaining:</span>
                <span className="font-medium">{remainingTasks.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completed:</span>
                <span className="font-medium">{completedTasks.length}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-medium">{todayTasks.length}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Header with View Toggle */}
          <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">
                {currentView === 'planning' ? 'Task Planning' : 'Schedule View'}
              </h1>
              
              {/* View Toggle */}
              <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                <Button
                  variant={currentView === 'planning' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentView('planning')}
                  className="flex items-center gap-2"
                >
                  <List className="w-4 h-4" />
                  Planning
                </Button>
                <Button
                  variant={currentView === 'schedule' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentView('schedule')}
                  className="flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Schedule
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {currentView === 'planning' ? (
              <div className="space-y-6">
                {/* Workload Summary */}
                <WorkloadSummary tasks={tasks} />

                {/* Today's Tasks */}
                <div>
                  <h2 className="text-xl font-bold mb-6">Today's Tasks</h2>
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
              </div>
            ) : (
              <CalendarView 
                tasks={tasks}
                onTaskUpdate={setTasks}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

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