import React, { useState } from 'react';
import { Task } from '../types/task';
import { supabase } from '../integrations/supabase/client';
import TaskInput from '../components/TaskInput';
import TaskGrid from '../components/TaskGrid';
import CalendarView from '../components/CalendarView';
import WorkloadSummary from '../components/WorkloadSummary';
import CommitmentPanel from '../components/CommitmentPanel';
import { Button } from '../components/ui/button';
import { Calendar, List } from 'lucide-react';
import { toast } from 'sonner';

const Index = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentView, setCurrentView] = useState<'planning' | 'schedule'>('planning');

  // NEW: committed targets for the day
  const [targets, setTargets] = useState<{ sleep: number; deep: number; nutrition: number }>({
    sleep: 8,
    deep: 5,
    nutrition: 2,
  });

  // ... your addTask / updateTask / delete / complete / duplicate unchanged ...

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar - Task Input */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Task</h2>
          <TaskInput onAddTask={addTask} />
        </div>
        <div className="flex-1 overflow-y-auto p-6" />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* ✅ Commitment segment BEFORE headers */}
        <div className="px-6 py-4 bg-white border-b border-gray-200">
          <CommitmentPanel initial={targets} onCommit={setTargets} />
        </div>

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

        {/* Planning Label */}
        {currentView === 'planning' && (
          <div className="px-6 py-2 bg-white border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Planning</h2>
          </div>
        )}

        {/* ✅ Summary under headers, above the 8-category grid */}
        {currentView === 'planning' && (
          <div className="px-6 py-4 bg-white border-b border-gray-200">
            <WorkloadSummary tasks={tasks} targets={targets} />
          </div>
        )}

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
            <CalendarView tasks={tasks} onTaskUpdate={setTasks} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
