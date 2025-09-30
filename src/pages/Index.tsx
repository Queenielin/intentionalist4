import React, { useState, useEffect } from 'react';
import { Task, Category8, CATEGORIES_8 } from '../types/task';
import { supabase } from '../integrations/supabase/client';
import TaskInput from '../components/TaskInput';
import TaskGrid from '../components/TaskGrid';
import CalendarView from '../components/CalendarView';
import WorkloadSummary from '../components/WorkloadSummary';
import { parseTaskInput } from '../utils/taskAI';
import { Button } from '../components/ui/button';
import { Calendar, List } from 'lucide-react';
import { toast } from 'sonner';

const Index = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentView, setCurrentView] = useState<'planning' | 'schedule'>('planning');

  const addTask = async (title: string, duration?: 15 | 30 | 60, scheduledDay?: 'today' | 'tomorrow') => {
    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      category: 'Social & Relational', // Default category while AI processes
      duration: duration || 30, // Default to 30 if not provided
      completed: false,
      slotId: '',
      scheduledDay: scheduledDay || 'today',
      createdAt: new Date(),
      isCategorizing: true,
    };

    setTasks(prev => [...prev, newTask]);

    // Call the actual edge function for categorization
    try {
      const { data, error } = await supabase.functions.invoke('categorize-tasks', {
        body: {
          tasks: [title],
          stream: false
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      console.log('Edge function response data:', data);
      const classification = data.classifications?.[0];
      
      if (classification) {
        setTasks(prev => prev.map(t => 
          t.id === newTask.id 
            ? { 
                ...t, 
                isCategorizing: false, 
                category: classification.category,
                title: classification.title, // Use cleaned title from AI
                duration: classification.duration
              } 
            : t
        ));
      } else {
        // Fallback if no classification returned
        setTasks(prev => prev.map(t => 
          t.id === newTask.id 
            ? { ...t, isCategorizing: false } 
            : t
        ));
      }
    } catch (error) {
      console.error('Error calling categorization function:', error);
      // Fallback on error
      setTasks(prev => prev.map(t => 
        t.id === newTask.id 
          ? { ...t, isCategorizing: false } 
          : t
      ));
      toast.error('Failed to categorize task');
    }
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    ));
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  };

  const completeTask = (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const duplicateTask = (task: Task) => {
    const newTask: Task = {
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      completed: false,
      createdAt: new Date(),
    };
    setTasks(prev => [...prev, newTask]);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar - Task Input */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Task</h2>
          <TaskInput onAddTask={addTask} />
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <WorkloadSummary tasks={tasks} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header with View Toggle */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Task Manager</h1>
          
          <div className="flex items-center space-x-2">
            <Button
              variant={currentView === 'planning' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentView('planning')}
              className="flex items-center space-x-2"
            >
              <List className="w-4 h-4" />
              <span>Planning</span>
            </Button>
            <Button
              variant={currentView === 'schedule' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentView('schedule')}
              className="flex items-center space-x-2"
            >
              <Calendar className="w-4 h-4" />
              <span>Schedule</span>
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentView === 'planning' ? (
            <TaskGrid
              tasks={tasks} 
              day="today"
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
              onDuplicateTask={duplicateTask}
              onCompleteTask={completeTask}
              onAddTask={addTask}
            />
          ) : (
            <CalendarView 
              tasks={tasks}
              onTaskUpdate={setTasks}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;