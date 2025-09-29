// src/types/task.ts

// 8-category label returned by the backend AI
export type Category8 =
  | "Analytical × Strategic"
  | "Creative × Generative"
  | "Learning × Absorptive"
  | "Constructive × Building"
  | "Social & Relational"
  | "Critical & Structuring"
  | "Clerical & Admin Routines"
  | "Logistics & Maintenance";

// --- add below your Category8 / Task exports ---

// 3-bucket rollup used for capacity math (not for UI grouping)
export type WorkBucket = "deep" | "light" | "admin";

// Map each AI category to a bucket
export const CATEGORY_TO_BUCKET: Record<Category8, WorkBucket> = {
  "Analytical × Strategic": "deep",
  "Creative × Generative": "deep",
  "Learning × Absorptive": "deep",
  "Constructive × Building": "deep",

  "Social & Relational": "light",
  "Critical & Structuring": "light",

  "Clerical & Admin Routines": "admin",
  "Logistics & Maintenance": "admin",
};


// Convenience: full list you can iterate over in the UI (e.g., columns)
export const CATEGORIES_8: Category8[] = [
  "Analytical × Strategic",
  "Creative × Generative",
  "Learning × Absorptive",
  "Constructive × Building",
  "Social & Relational",
  "Critical & Structuring",
  "Clerical & Admin Routines",
  "Logistics & Maintenance",
];

// Core Task model used across the app
export type Task = {
  id: string;                    // stable client id
  title: string;                 // task title (can be cleaned by AI)
  category?: Category8;          // set by backend AI; undefined while "Categorizing..."
  duration: 15 | 30 | 60;        // minutes block
  completed: boolean;            // completion toggle

  // Optional UI helpers
  taskType?: string;             // if you mirror category for display, keep this
  isCategorizing?: boolean;      // show "Categorizing..." spinner while awaiting AI
};

// Single item the backend AI returns for each input task
export type AICategoryResult = {
  title: string;                 // cleaned title from AI
  category: Category8;           // one of the 8 categories
  duration: 15 | 30 | 60;        // 15/30/60 minutes
};

// Optional: shape produced by the client parser before AI call
export type ParsedTaskInput = {
  title: string;                 // cleaned by client (time tokens stripped)
  duration: 15 | 30 | 60;        // provisional duration hint (can be overridden by AI)
};

export interface Task {
  id: string;
  title: string;
  category: Category8;              // ⬅️ NEW, replaces workType
  duration: 15 | 30 | 60;           // minutes
  completed: boolean;
  timeSlot?: string;                // ISO string for scheduled time
  scheduledDay?: 'today' | 'tomorrow';
  priority?: number;                // 1 = highest priority (ordering index within its cell)
  isPriority?: boolean;             // visual priority badge
  createdAt: Date;
  groupId?: string;                 // ID of the group this task belongs to
  isGrouped?: boolean;              // Whether this task is part of a group
  isCategorizing?: boolean;         // Whether this task is being categorized by AI
  taskType?: string;                // AI-classified subcategory (optional)
}

export interface TaskGroup {
  id: string;
  title: string;
  category: Category8;              // ⬅️ NEW, replaces workType
  duration: 15 | 30 | 60;
  taskIds: string[];
  completed: boolean;
  scheduledDay?: 'today' | 'tomorrow';
  priority?: number;
  isPriority?: boolean;
  createdAt: Date;
  isExpanded?: boolean;             // Whether the group is showing individual tasks
}

export interface TimeSlot {
  id: string;
  time: string;
  hour: number;
  minute: 0 | 30;
  task?: Task;                       // ⬅️ Will now carry category instead of workType
  isBreak?: boolean;
  breakType?: 'exercise' | 'nap' | 'food' | 'meeting' | 'other';
  breakLabel?: string;
}
