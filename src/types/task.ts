export type WorkType = 'deep' | 'light' | 'admin';

export interface Task {
  id: string;
  title: string;
  workType: WorkType;
  duration: 15 | 30 | 60; // minutes
  completed: boolean;
  timeSlot?: string; // ISO string for scheduled time
  scheduledDay?: 'today' | 'tomorrow';
  priority?: number; // 1 = highest priority (ordering index within its cell)
  isPriority?: boolean; // visual priority badge
  createdAt: Date;
}

export interface TimeSlot {
  id: string;
  time: string;
  hour: number;
  minute: 0 | 30;
  task?: Task;
  isBreak?: boolean;
  breakType?: 'exercise' | 'nap' | 'food' | 'meeting' | 'other';
  breakLabel?: string;
}