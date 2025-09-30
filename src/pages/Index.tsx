import React, { useState, useEffect } from 'react';
import { Task, Category8, CATEGORIES_8 } from '../types/task';
import { supabase } from '../integrations/supabase/client';
import TaskInput from '../components/TaskInput';
import TaskGrid from '../components/TaskGrid';
import CalendarView from '../components/CalendarView';
import { Button } from '../components/ui/button';
import { Calendar, List } from 'lucide-react';
import { toast } from 'sonner';
import CommitSection from '../components/CommitSection';

const Index = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentView, setCurrentView] = useState<'planning' | 'schedule'>('planning');
  const [commitments, setCommitments] = useState({
    focusTime: 0,
    sleep: 8,
    nutrition: 2,
    movement: 1,
    downtime: 1,
  });

  const addTask = async (title: string, duration?: number, scheduledDay?: 'today' | 'tomorrow') => {
    const hasManualDuration = duration !== undefined;
    
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
                duration: hasManualDuration ? (duration || 30) : classification.duration
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

  const updateCommitment = (
    type: 'focusTime' | 'sleep' | 'nutrition' | 'movement' | 'downtime',
    hours: number
  ) => {
    setCommitments(prev => ({
      ...prev,
      [type]: hours
    }));
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar - Task Input */}
      <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">COMMIT</h2>
          <CommitSection 
            commitments={commitments}
            onUpdateCommitment={updateCommitment}
          />
        </div>
      
      
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Task</h2>
          <TaskInput onAddTask={addTask} />
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

        {/* Planning Label */}
        {currentView === 'planning' && (
          <>
            {/* Daily Commitment Bar */}
            <div className="px-6 py-4 bg-white border-b border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Daily Commitment</h3>
                <span className="text-sm text-gray-500">
                  {(commitments.focusTime + commitments.sleep + commitments.nutrition + commitments.movement + commitments.downtime).toFixed(1)}/24 hours
                </span>
              </div>

              {/* 24h translucent target bar */}
              <div className="w-full h-4 rounded-full overflow-hidden bg-muted/30 ring-1 ring-border/50 flex">
                {/* Sleep (grey) */}
                {commitments.sleep > 0 && (
                  <div className="bg-zinc-400/40 h-full" style={{ width: `${(commitments.sleep / 24) * 100}%` }} title={`Sleep: ${commitments.sleep}h`} />
                )}
                {/* Focus (deep tint) */}
                {commitments.focusTime > 0 && (
                  <div className="bg-blue-500/25 h-full" style={{ width: `${(commitments.focusTime / 24) * 100}%` }} title={`Focus: ${commitments.focusTime}h`} />
                )}
                {/* Nutrition (violet tint) */}
                {commitments.nutrition > 0 && (
                  <div className="bg-violet-500/25 h-full" style={{ width: `${(commitments.nutrition / 24) * 100}%` }} title={`Nutrition: ${commitments.nutrition}h`} />
                )}
                {/* Movement (emerald tint) */}
                {commitments.movement > 0 && (
                  <div className="bg-emerald-500/25 h-full" style={{ width: `${(commitments.movement / 24) * 100}%` }} title={`Movement: ${commitments.movement}h`} />
                )}
                {/* Downtime (sky tint) */}
                {commitments.downtime > 0 && (
                  <div className="bg-sky-500/25 h-full" style={{ width: `${(commitments.downtime / 24) * 100}%` }} title={`Downtime: ${commitments.downtime}h`} />
                )}
                {/* Remainder */}
                {(() => {
                  const used = commitments.focusTime + commitments.sleep + commitments.nutrition + commitments.movement + commitments.downtime;
                  const remain = Math.max(0, 24 - used);
                  return remain > 0 ? (
                    <div className="bg-muted/40 h-full" style={{ width: `${(remain / 24) * 100}%` }} title={`Unallocated: ${remain}h`} />
                  ) : null;
                })()}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 text-xs text-gray-600 mt-2">
                {commitments.sleep > 0 && <Legend color="bg-zinc-400/40" label={`Sleep (${commitments.sleep}h)`} />}
                {commitments.focusTime > 0 && <Legend color="bg-blue-500/25" label={`Focus (${commitments.focusTime}h)`} />}
                {commitments.nutrition > 0 && <Legend color="bg-violet-500/25" label={`Nutrition (${commitments.nutrition}h)`} />}
                {commitments.movement > 0 && <Legend color="bg-emerald-500/25" label={`Movement (${commitments.movement}h)`} />}
                {commitments.downtime > 0 && <Legend color="bg-sky-500/25" label={`Downtime (${commitments.downtime}h)`} />}
              </div>
            </div>

          <div className="px-6 py-2 bg-white border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Planning</h2>
          </div>
          </>
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

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className={`w-3 h-3 rounded ${color}`} />
      <span>{label}</span>
    </div>
  );
}

export default Index;