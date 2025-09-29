import { useState, useCallback } from 'react';
import { Task, Category8 } from '@/types/task';
import TaskInput from '@/components/TaskInput';
import TaskGrid from '@/components/TaskGrid';
import CalendarView from '@/components/CalendarView';
import WorkloadSummary from '@/components/WorkloadSummary';
import { categorizeTasksWithAI } from '@/utils/aiCategorization';
import { parseTaskInput } from '@/utils/taskAI';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, List } from 'lucide-react';
import { toast } from 'sonner';

export default function Index() {
  const [tasks, setTasks] = useState<Task[]>([]);

  const handleAddTask = useCallback(async (input: string) => {
    if (!input.trim()) return;

    // Parse the input into individual tasks
    const parsedTasks = parseTaskInput(input);
    if (parsedTasks.length === 0) return;

    // Create temporary tasks with loading state
    const tempTasks: Task[] = parsedTasks.map(parsed => ({
      id: crypto.randomUUID(),
      title: parsed.title,
      category: 'Social & Relational' as Category8, // Temporary default
      duration: parsed.duration,
      completed: false,
      slotId: 'default-slot',
      scheduledDay: 'today' as const,
      createdAt: new Date(),
      isCategorizing: true,
    }));

    // Add temporary tasks to state
    setTasks(prev => [...prev, ...tempTasks]);

    try {
      // Get AI categorization
      const taskTitles = parsedTasks.map(t => t.title);
      const classifications = await categorizeTasksWithAI(taskTitles);

      // Update tasks with AI results
      setTasks(prev => prev.map(task => {
        const tempIndex = tempTasks.findIndex(t => t.id === task.id);
        if (tempIndex !== -1 && classifications[tempIndex]) {
          const classification = classifications[tempIndex];
          return {
            ...task,
            title: classification.title,
            category: classification.category,
            duration: classification.duration,
            isCategorizing: false,
          };
        }
        return task;
      }));

      toast.success(`Added ${classifications.length} task${classifications.length > 1 ? 's' : ''} and categorized with AI`);
    } catch (error) {
      console.error('Failed to categorize tasks:', error);
      // Remove loading state even if categorization failed
      setTasks(prev => prev.map(task => {
        if (tempTasks.some(t => t.id === task.id)) {
          return { ...task, isCategorizing: false };
        }
        return task;
      }));
      toast.error('Failed to categorize tasks with AI, using defaults');
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