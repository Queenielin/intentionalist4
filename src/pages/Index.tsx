import { useState } from 'react';
import { Task, WorkType } from '@/types/task';
import TaskInput from '@/components/TaskInput';
import TaskList from '@/components/TaskList';
import CalendarView from '@/components/CalendarView';
import TaskGrid from '@/components/TaskGrid';
import WorkloadSummary from '@/components/WorkloadSummary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ListTodo, Calendar, Brain } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { toast } = useToast();

  const handleAddTask = (title: string, workType: WorkType, duration: 15 | 30 | 60) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      workType,
      duration,
      completed: false,
      scheduledDay: 'today',
      createdAt: new Date(),
    };

    setTasks(prev => [...prev, newTask]);
    toast({
      title: "Task added!",
      description: `Categorized as ${workType} work (${duration} min)`,
    });
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
          <TaskInput onAddTask={handleAddTask} />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="planning" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-12 bg-muted/50 rounded-xl">
            <TabsTrigger 
              value="planning" 
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <ListTodo className="w-4 h-4" />
              Task Planning
            </TabsTrigger>
            <TabsTrigger 
              value="tasks" 
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <ListTodo className="w-4 h-4" />
              Task List
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
            <div className="grid md:grid-cols-2 gap-8">
              {/* Today */}
              <div className="space-y-4">
                <TaskGrid
                  tasks={tasks}
                  day="today"
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                  onDuplicateTask={handleDuplicateTask}
                  onCompleteTask={handleCompleteTask}
                />
                <WorkloadSummary tasks={tasks} day="today" />
              </div>

              {/* Tomorrow */}
              <div className="space-y-4">
                <TaskGrid
                  tasks={tasks}
                  day="tomorrow"
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                  onDuplicateTask={handleDuplicateTask}
                  onCompleteTask={handleCompleteTask}
                />
                <WorkloadSummary tasks={tasks} day="tomorrow" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="mt-6">
            <TaskList
              tasks={tasks}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onCompleteTask={handleCompleteTask}
            />
          </TabsContent>

          <TabsContent value="calendar" className="mt-6">
            <CalendarView tasks={tasks} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;