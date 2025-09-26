import { useState } from 'react';
import { Task, WorkType } from '@/types/task';
import TaskInput from '@/components/TaskInput';
import TaskList from '@/components/TaskList';
import CalendarView from '@/components/CalendarView';
import TaskGrid from '@/components/TaskGrid';
import WorkloadSummary from '@/components/WorkloadSummary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ListTodo, Calendar, Brain } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { toast } = useToast();

  const handleAddTask = (title: string, workType: WorkType, duration: 15 | 30 | 60, scheduledDay: 'today' | 'tomorrow' = 'today') => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      workType,
      duration,
      completed: false,
      scheduledDay,
      createdAt: new Date(),
    };

    setTasks(prev => [...prev, newTask]);
    toast({
      title: "Task added!",
      description: `Categorized as ${workType} work (${duration} min)`,
    });
  };

  const handleAddMultipleTasks = (newTasks: Array<{title: string; workType: WorkType; duration: 15 | 30 | 60}>) => {
    const tasksToAdd = newTasks.map(task => ({
      id: crypto.randomUUID(),
      title: task.title,
      workType: task.workType,
      duration: task.duration,
      completed: false,
      scheduledDay: 'today' as const,
      createdAt: new Date(),
    }));

    setTasks(prev => [...prev, ...tasksToAdd]);
  };

  const handleDuplicateTask = (task: Task) => {
    const duplicatedTask: Task = {
      ...task,
      id: crypto.randomUUID(),
      title: `${task.title} (copy)`,
      createdAt: new Date(),
    };

    setTasks(prev => [...prev, duplicatedTask]);
    toast({
      title: "Task duplicated!",
      description: "Task copied successfully",
    });
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    ));
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
    toast({
      title: "Task deleted",
      description: "Task removed from your list",
      variant: "destructive",
    });
  };

  const handleCompleteTask = (taskId: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const newCompleted = !task.completed;
        if (newCompleted) {
          toast({
            title: "Great job! 🎉",
            description: "Task completed successfully",
          });
        }
        return { ...task, completed: newCompleted };
      }
      return task;
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Brain className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Energy Cycle Planner
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Optimize your day with AI-powered task categorization based on your natural energy cycles
          </p>
        </header>

        {/* Task Input */}
        <div className="mb-8">
          <TaskInput onAddTask={handleAddTask} onAddMultipleTasks={handleAddMultipleTasks} />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="planning" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/50 rounded-xl">
            <TabsTrigger 
              value="planning" 
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <ListTodo className="w-4 h-4" />
              Task Planning
            </TabsTrigger>
            <TabsTrigger 
              value="calendar" 
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Calendar className="w-4 h-4" />
              Schedule View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="planning" className="mt-6 space-y-8">
            {/* Today's main grid - full width */}
            <TaskGrid
              tasks={tasks}
              day="today"
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onDuplicateTask={handleDuplicateTask}
              onCompleteTask={handleCompleteTask}
              onAddTask={handleAddTask}
            />

            {/* Tomorrow's simple column */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Tomorrow</h3>
              <div className="bg-muted/30 rounded-lg p-4 border-2 border-dashed border-muted-foreground/20">
                <div className="space-y-2">
                  {tasks.filter(task => task.scheduledDay === 'tomorrow' && !task.completed).map(task => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 bg-background rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{task.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {task.workType} work • {task.duration}min
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateTask(task.id, { scheduledDay: 'today' })}
                          className="text-xs"
                        >
                          Move to Today
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                  {tasks.filter(task => task.scheduledDay === 'tomorrow' && !task.completed).length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No tasks scheduled for tomorrow
                    </p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>


          <TabsContent value="calendar" className="mt-6">
            <CalendarView tasks={tasks} onTaskUpdate={setTasks} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;