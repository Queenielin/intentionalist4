import React, { useState, useEffect } from 'react';
import { Task } from '../types/task';
import TaskInput from '../components/TaskInput';
import TaskList from '../components/TaskList';
import CalendarView from '../components/CalendarView';
import WorkloadSummary from '../components/WorkloadSummary';
import { Button } from '../components/ui/button';
import { Calendar, List } from 'lucide-react';

const Index = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentView, setCurrentView] = useState<'planning' | 'schedule'>('planning');

  const addTask = (task: Task) => {
    setTasks(prev => [...prev, task]);
  };

  const updateTask = (updatedTask: Task) => {
    setTasks(prev => prev.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    ));
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
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
            <TaskList 
              tasks={tasks} 
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
            />
          ) : (
            <CalendarView 
              tasks={tasks}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;