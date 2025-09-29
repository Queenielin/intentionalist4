// REMOVE the old WorkType type entirely
// export type WorkType = "deep" | "light" | "admin";

export type Category8 =
  | "Analytical × Strategic"
  | "Creative × Generative"
  | "Learning × Absorptive"
  | "Constructive × Building"
  | "Social & Relational"
  | "Critical & Structuring"
  | "Clerical & Admin Routines"
  | "Logistics & Maintenance";

export type Task = {
  id: string;
  title: string;
  category?: Category8;          // <-- AI sets this later
  duration: 15 | 30 | 60;        // minutes
  completed: boolean;

  // Optional UI helpers
  taskType?: string;             // same as category if you want
  isCategorizing?: boolean;      // spinner while waiting for AI
};


// src/utils/taskAI.ts

// ✅ Split input into tasks + strip duration hints.
// ❌ No more client-side heuristics, no WorkType, no 3-bucket logic.

export type ParsedTaskInput = {
  title: string;              // cleaned title after removing time tokens
  duration: 15 | 30 | 60;     // provisional duration hint (AI can override)
};

// Public API: parse a blob of text into clean tasks with a duration hint.
export function parseTaskInput(input: string): ParsedTaskInput[] {
  const tasks = breakDownTasks(input);
  return tasks.map((task) => {
    const { cleanTitle, duration } = extractTimeDuration(task);
    return { title: cleanTitle, duration: duration ?? 30 }; // default to 30 if no hint
  });
}

// --- helpers ---

// Break down input into individual tasks
export function breakDownTasks(input: string): string[] {
  const trimmed = input.trim();

  const listPatterns = [
    /^\d+\.\s*/gm,        // 1. numbered lists
    /^[-*•]\s*/gm,        // - bullet points
    /^[•▪▫]\s*/gm,        // • different bullets
    /;\s*(?=\w)/g,        // ; semicolon separation
    /,\s*(?=\w.*(?:work|task|write|code|call|meeting|email))/gi, // comma for task-like items
  ];

  for (const pattern of listPatterns) {
    const parts = trimmed.split(pattern).map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1) return parts.filter((t) => t.length > 3);
  }

  const lines = trimmed.split("\n").map((l) => l.trim()).filter((l) => l.length > 3);
  if (lines.length > 1 && lines.every((l) => /\w/.test(l))) return lines;

  return [trimmed];
}

// Extract task-duration hints (leave content durations intact)
export function extractTimeDuration(
  title: string
): { cleanTitle: string; duration?: 15 | 30 | 60; isTaskDuration: boolean } {
  const taskDurationPatterns = [
    { pattern: /(?:takes?|will take|need|needs|requires?|allocate|spend)\s*(\d+)\s*(?:hours?|hrs?|h|minutes?|mins?|m)\b/i, multiplier: 60 },
    { pattern: /(?:in|within|over)\s*(\d+)\s*(?:hours?|hrs?|h)\b/i, multiplier: 60 },
    { pattern: /(?:in|within|over)\s*(\d+)\s*(?:minutes?|mins?|m)\b/i, multiplier: 1 },
    { pattern: /^(\d+)\s*(?:hours?|hrs?|h)\s*[-:]?\s*/i, multiplier: 60 },
    { pattern: /^(\d+)\s*(?:minutes?|mins?|m)\s*[-:]?\s*/i, multiplier: 1 },
    { pattern: /\s*[-:]\s*(\d+)\s*(?:hours?|hrs?|h)$/i, multiplier: 60 },
    { pattern: /\s*[-:]\s*(\d+)\s*(?:minutes?|mins?|m)$/i, multiplier: 1 },
  ];

  const contentDurationPatterns = [
    { pattern: /(?:write|create|record|film|make|produce|draft)\s+(?:a\s+)?(\d+)\s*(?:min(?:ute)?|hour|hr?)\s+(?:video|song|skit|episode|clip|piece|article|post)/i },
    { pattern: /(\d+)\s*(?:min(?:ute)?|hour|hr?)\s+(?:video|song|skit|episode|clip|piece|article|post|presentation|meeting|call)/i },
    { pattern: /(?:video|song|skit|episode|clip|piece|article|post)\s+(?:of|lasting|for)\s+(\d+)\s*(?:min(?:ute)?s?|hour|hr?s?)/i },
  ];

  for (const { pattern } of contentDurationPatterns) {
    if (pattern.test(title)) {
      return { cleanTitle: title, isTaskDuration: false };
    }
  }

  for (const { pattern } of taskDurationPatterns) {
    const match = title.match(pattern);
    if (match) {
      const matched = match[0].toLowerCase();
      const isHours =
        matched.includes("hour") ||
        matched.includes("hr") ||
        (matched.includes("h") && !matched.includes("m"));

      const minutes = parseInt(match[1], 10) * (isHours ? 60 : 1);
      const cleanTitle = title.replace(match[0], "").replace(/\s+/g, " ").trim();

      let rounded: 15 | 30 | 60;
      if (minutes <= 22) rounded = 15;
      else if (minutes <= 45) rounded = 30;
      else rounded = 60;

      return { cleanTitle, duration: rounded, isTaskDuration: true };
    }
  }

  return { cleanTitle: title, isTaskDuration: false };
}


// src/utils/productivity.ts
import { Task, CATEGORY_TO_BUCKET, WorkBucket } from "@/types/task";

export const PRODUCTIVITY_LIMITS = {
  deep: {
    beginner: { min: 1, max: 2 },   // hours/day
    trained:  { min: 3, max: 4 },
    ceiling:  5,
  },
  light: {
    daily:   { min: 4, max: 6 },
    ceiling: 6,
  },
  total: {
    daily:   { min: 5, max: 7 },
    ceiling: 7,
  },
} as const;

export type BucketSummary = {
  15: number;
  30: number;
  60: number;
  totalHours: number; // sum in hours
};

export type WorkloadSummary = Record<WorkBucket, BucketSummary> & {
  grandTotalHours: number;
};

const emptyBucket = (): BucketSummary => ({ 15: 0, 30: 0, 60: 0, totalHours: 0 });

/**
 * Roll up tasks (by category) into 3 buckets for capacity math.
 * Completed tasks are ignored.
 */
export function summarizeByBucket(tasks: Task[]): WorkloadSummary {
  const summary: WorkloadSummary = {
    deep:  emptyBucket(),
    light: emptyBucket(),
    admin: emptyBucket(),
    grandTotalHours: 0,
  };

  for (const t of tasks) {
    if (t.completed) continue;
    // If category missing (still categorizing), skip it from capacity
    if (!t.category) continue;

    const bucket = CATEGORY_TO_BUCKET[t.category];
    const b = summary[bucket];

    if (t.duration === 15 || t.duration === 30 || t.duration === 60) {
      b[t.duration] += 1;
      b.totalHours += t.duration / 60;
      summary.grandTotalHours += t.duration / 60;
    }
  }

  return summary;
}

export type WorkloadWarning = {
  type: "deep" | "light" | "total";
  message: string;
  severity: "warning" | "error";
};

/**
 * Convert a summary into user-facing warnings against your limits.
 */
export function getWorkloadWarnings(summary: WorkloadSummary): WorkloadWarning[] {
  const warnings: WorkloadWarning[] = [];

  // Deep
  if (summary.deep.totalHours > PRODUCTIVITY_LIMITS.deep.ceiling) {
    warnings.push({
      type: "deep",
      message: `Deep work: ${summary.deep.totalHours.toFixed(1)}h exceeds ceiling (${PRODUCTIVITY_LIMITS.deep.ceiling}h)`,
      severity: "error",
    });
  } else if (summary.deep.totalHours > PRODUCTIVITY_LIMITS.deep.trained.max) {
    warnings.push({
      type: "deep",
      message: `Deep work: ${summary.deep.totalHours.toFixed(1)}h exceeds trained limit (${PRODUCTIVITY_LIMITS.deep.trained.max}h)`,
      severity: "warning",
    });
  }

  // Light
  if (summary.light.totalHours > PRODUCTIVITY_LIMITS.light.ceiling) {
    warnings.push({
      type: "light",
      message: `Light work: ${summary.light.totalHours.toFixed(1)}h exceeds ceiling (${PRODUCTIVITY_LIMITS.light.ceiling}h)`,
      severity: "error",
    });
  }

  // Total
  if (summary.grandTotalHours > PRODUCTIVITY_LIMITS.total.ceiling) {
    warnings.push({
      type: "total",
      message: `Total: ${summary.grandTotalHours.toFixed(1)}h exceeds daily ceiling (${PRODUCTIVITY_LIMITS.total.ceiling}h)`,
      severity: "error",
    });
  }

  return warnings;
}

