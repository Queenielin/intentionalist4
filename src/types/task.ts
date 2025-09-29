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

// ─────────────────────────────────────────────────────────────
// A Slot = what you display with TaskGroupCard (container card)
// ─────────────────────────────────────────────────────────────
export interface Slot {
  id: string;
  title: string;          // e.g., "Strategy Slot 1"
  category: Category8;    // which column it appears in (all child tasks must match)
  taskIds: string[];      // tasks inside this slot
  duration?: 15 | 30 | 60; // optional "default" for slot; tasks still have their own durations
  isExpanded?: boolean;   // UI expand/collapse
  scheduledDay?: "today" | "tomorrow";
  priority?: number;      // order among slots in same column
  isPriority?: boolean;   // visual priority badge
  createdAt: Date;
  completed?: boolean;    // mark whole slot as done (optional)
}

// ─────────────────────────────────────────────────────────────
// A Task = a single item that belongs to exactly one Slot
// ─────────────────────────────────────────────────────────────
export interface Task {
  id: string;
  title: string;
  category: Category8;       // MUST match its slot.category
  duration: 15 | 30 | 60;    // minutes
  completed: boolean;

  // Link to the container slot (replaces groupId/isGrouped)
  slotId: string;

  // Optional UI metadata
  scheduledDay?: "today" | "tomorrow";
  priority?: number;
  isPriority?: boolean;
  createdAt: Date;

  // Optional while AI is running
  isCategorizing?: boolean;
  // Optional: keep if you show a raw label from AI separate from category
  taskType?: string;
}

// ─────────────────────────────────────────────────────────────
// (Optional) If you have a calendar/time grid elsewhere, keep this.
// It’s independent from "Slot" (Slot = container card in the category column).
// ─────────────────────────────────────────────────────────────
export interface TimeSlot {
  id: string;
  time: string;            // display label
  hour: number;
  minute: 0 | 30;
  task?: Task;             // carries category now (not workType)
  isBreak?: boolean;
  breakType?: "exercise" | "nap" | "food" | "meeting" | "other";
  breakLabel?: string;
}
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

// ─────────────────────────────────────────────────────────────
// A Task = a single item that belongs to exactly one Slot
// ─────────────────────────────────────────────────────────────
export interface Task {
  id: string;
  title: string;
  category: Category8;       // MUST match its slot.category
  duration: 15 | 30 | 60;    // minutes
  completed: boolean;

  // Link to the container slot (replaces groupId/isGrouped)
  slotId: string;

  // Optional UI metadata
  scheduledDay?: "today" | "tomorrow";
  priority?: number;
  isPriority?: boolean;
  createdAt: Date;

  // Optional while AI is running
  isCategorizing?: boolean;
  // Optional: keep if you show a raw label from AI separate from category
  taskType?: string;
}

// ─────────────────────────────────────────────────────────────
// (Optional) If you have a calendar/time grid elsewhere, keep this.
// It’s independent from "Slot" (Slot = container card in the category column).
// ─────────────────────────────────────────────────────────────
export interface TimeSlot {
  id: string;
  time: string;            // display label
  hour: number;
  minute: 0 | 30;
  task?: Task;             // carries category now (not workType)
  isBreak?: boolean;
  breakType?: "exercise" | "nap" | "food" | "meeting" | "other";
  breakLabel?: string;
}