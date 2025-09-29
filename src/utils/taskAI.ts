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

// src/utils/taskAI.ts (or wherever this lives)

// Parse multiple tasks from input — NO client-side categorization.
export function parseTaskInput(
  input: string
): Array<{ title: string; duration: 15 | 30 | 60 }> {
  const tasks = breakDownTasks(input);
  return tasks.map((task) => {
    const { cleanTitle, duration } = extractTimeDuration(task);
    return { title: cleanTitle, duration: duration ?? 30 }; // provisional 30 until AI returns
  });
}

// Break down input into individual tasks (keep your current logic)
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
    const matches = trimmed.split(pattern).filter((item) => item.trim().length > 0);
    if (matches.length > 1) {
      return matches.map((task) => task.trim()).filter((task) => task.length > 3);
    }
  }

  const lines = trimmed.split("\n").map((l) => l.trim()).filter((l) => l.length > 3);
  if (lines.length > 1 && lines.every((l) => /\w/.test(l))) {
    return lines;
  }

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
      const matchedText = match[0].toLowerCase();
      const isHours =
        matchedText.includes("hour") ||
        matchedText.includes("hr") ||
        (matchedText.includes("h") && !matchedText.includes("m"));

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





  
  // Check for content duration first (these shouldn't be removed from title)
  for (const { pattern } of contentDurationPatterns) {
    if (pattern.test(title)) {
      return { cleanTitle: title, isTaskDuration: false };
    }
  }
  
  // Check for task duration patterns
  for (const { pattern, multiplier } of taskDurationPatterns) {
    const match = title.match(pattern);
    if (match) {
      // Determine if it's hours or minutes based on the matched text
      const matchedText = match[0].toLowerCase();
      const isHours = matchedText.includes('hour') || matchedText.includes('hr') || (matchedText.includes('h') && !matchedText.includes('m'));
      const duration = parseInt(match[1]) * (isHours ? 60 : 1);
      const cleanTitle = title.replace(match[0], '').replace(/\s+/g, ' ').trim();
      
      // Round to nearest valid duration
      let roundedDuration: 15 | 30 | 60;
      if (duration <= 22) roundedDuration = 15;
      else if (duration <= 45) roundedDuration = 30;
      else roundedDuration = 60;
      
      return { cleanTitle, duration: roundedDuration, isTaskDuration: true };
    }
  }
  
  return { cleanTitle: title, isTaskDuration: false };
}

// Smart AI categorization with context-aware logic
export function categorizeTask


// Research-based productivity limits
export const PRODUCTIVITY_LIMITS = {
  deep: {
    beginner: { min: 1, max: 2 },
    trained: { min: 3, max: 4 },
    ceiling: 5
  },
  light: {
    daily: { min: 4, max: 6 },
    ceiling: 6
  },
  total: {
    daily: { min: 5, max: 7 },
    ceiling: 7
  }
};

export function calculateWorkloadSummary(tasks: any[]) {
  const summary = {
    deep: { 15: 0, 30: 0, 60: 0, total: 0 },
    light: { 15: 0, 30: 0, 60: 0, total: 0 },
    admin: { 15: 0, 30: 0, 60: 0, total: 0 },
    grandTotal: 0
  };

  tasks.forEach(task => {
    if (!task.completed) {
      summary[task.workType][task.duration]++;
      summary[task.workType].total += task.duration / 60;
      summary.grandTotal += task.duration / 60;
    }
  });

  return summary;
}

export function getWorkloadWarnings(summary: ReturnType<typeof calculateWorkloadSummary>) {
  const warnings = [];
  
  if (summary.deep.total > PRODUCTIVITY_LIMITS.deep.ceiling) {
    warnings.push({
      type: 'deep',
      message: `Deep work: ${summary.deep.total.toFixed(1)}h exceeds ceiling (${PRODUCTIVITY_LIMITS.deep.ceiling}h)`,
      severity: 'error'
    });
  } else if (summary.deep.total > PRODUCTIVITY_LIMITS.deep.trained.max) {
    warnings.push({
      type: 'deep',
      message: `Deep work: ${summary.deep.total.toFixed(1)}h exceeds trained limit (${PRODUCTIVITY_LIMITS.deep.trained.max}h)`,
      severity: 'warning'
    });
  }

  if (summary.light.total > PRODUCTIVITY_LIMITS.light.ceiling) {
    warnings.push({
      type: 'light',
      message: `Light work: ${summary.light.total.toFixed(1)}h exceeds ceiling (${PRODUCTIVITY_LIMITS.light.ceiling}h)`,
      severity: 'error'
    });
  }

  if (summary.grandTotal > PRODUCTIVITY_LIMITS.total.ceiling) {
    warnings.push({
      type: 'total',
      message: `Total: ${summary.grandTotal.toFixed(1)}h exceeds daily ceiling (${PRODUCTIVITY_LIMITS.total.ceiling}h)`,
      severity: 'error'
    });
  }

  return warnings;
}