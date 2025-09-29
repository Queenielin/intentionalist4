// src/types/task.ts

// ─────────────────────────────────────────────────────────────
// 8-category label returned by the backend AI
// ─────────────────────────────────────────────────────────────
export type Category8 =
  | "Analytical × Strategic"
  | "Creative × Generative"
  | "Learning × Absorptive"
  | "Constructive × Building"
  | "Social & Relational"
  | "Critical & Structuring"
  | "Clerical & Admin Routines"
  | "Logistics & Maintenance";

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

// ─────────────────────────────────────────────────────────────
/** 3-bucket rollup used for capacity math (not for UI grouping) */
// ─────────────────────────────────────────────────────────────
export type WorkBucket = "deep" | "light" | "admin";

export const CATEGORY_TO_BUCKET: Record<Category8, WorkBucket> = {
  // deep
  "Analytical × Strategic": "deep",
  "Creative × Generative": "deep",
  "Learning × Absorptive": "deep",
  "Constructive × Building": "deep",
  // light
  "Social & Relational": "light",
  "Critical & Structuring": "light",
  // admin
  "Clerical & Admin Routines": "admin",
  "Logistics & Maintenance": "admin",
};

// Tiny helper to derive the bucket for any task/category
export const getBucketForCategory = (cat: Category8): WorkBucket =>
  CATEGORY_TO_BUCKET[cat];

// ─────────────────────────────────────────────────────────────
/** Slot = the container card in a category column (replaces TaskGroup) */
// ─────────────────────────────────────────────────────────────
export interface Slot {
  id: string;
  title: string;                // e.g., "Strategy Slot 1"
  category: Category8;          // which column it appears in (all child tasks must match)
  taskIds: string[];            // tasks inside this slot
  duration?: 15 | 30 | 60;      // optional default block for the slot
  isExpanded?: boolean;         // UI expand/collapse
  scheduledDay?: "today" | "tomorrow";
  priority?: number;            // order among slots in same column
  isPriority?: boolean;         // visual priority badge
  createdAt: Date;
  completed?: boolean;          // mark whole slot as done (optional)
}

// ─────────────────────────────────────────────────────────────
/** Task = a single item that belongs to exactly one Slot */
// ─────────────────────────────────────────────────────────────
export interface Task {
  id: string;
  title: string;
  category: Category8;          // MUST match its slot.category
  duration: 15 | 30 | 60;       // minutes
  completed: boolean;

  // Link to the container slot (replaces groupId/isGrouped)
  slotId: string;

  // Optional UI metadata
  scheduledDay?: "today" | "tomorrow";
  scheduledStart?: string;      // ISO date string for calendar scheduling
  priority?: number;
  isPriority?: boolean;
  createdAt: Date;

  // Optional while AI is running
  isCategorizing?: boolean;
  // Optional: keep if you show a raw label from AI separate from category
  taskType?: string;
}

// ─────────────────────────────────────────────────────────────
/** CalendarSlot = where tasks get scheduled on a day/time grid */
// ─────────────────────────────────────────────────────────────
export interface CalendarSlot {
  id: string;
  date: string;                 // ISO date (e.g., "2025-09-29")
  hour: number;                 // 0..23
  minute: 0 | 30;               // half-hour steps
  task?: Task;                  // the task scheduled in this slot (optional)
  isBreak?: boolean;
  breakType?: "exercise" | "nap" | "food" | "meeting" | "other";
  breakLabel?: string;
}

// ─────────────────────────────────────────────────────────────
/** Shapes used when talking to the backend / parsing input */
// ─────────────────────────────────────────────────────────────
export type AICategoryResult = {
  title: string;                // cleaned title from AI
  category: Category8;          // one of the 8 categories
  duration: 15 | 30 | 60;       // 15/30/60 minutes
};

export type ParsedTaskInput = {
  title: string;                // cleaned by client (time tokens stripped)
  duration: 15 | 30 | 60;       // provisional duration hint (can be overridden by AI)
};
