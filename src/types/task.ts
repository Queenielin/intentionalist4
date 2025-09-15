export type WorkType = 'deep' | 'light' | 'admin';

export interface Task {
  id: string;
  title: string;
  workType: WorkType;
  duration: 15 | 30 | 60; // minutes
  completed: boolean;
  timeSlot?: string; // ISO string for scheduled time
  createdAt: Date;
}

export interface TimeSlot {
  id: string;
  time: string;
  hour: number;
  minute: 0 | 30;
  task?: Task;
}