// src/utils/taskAI.ts
import type { Category8, ParsedTaskInput, CATEGORIES_8 } from "@/types/task";
import { CATEGORY_TO_BUCKET, getBucketForCategory } from "@/types/task";

/**
 * Split a free-text input into individual task strings.
 * Supports numbered lists, bullets, semicolons, commas (for tasky phrases), and line breaks.
 */
export function breakDownTasks(input: string): string[] {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return [];

  const listPatterns: RegExp[] = [
    /^\d+\.\s*/gm,        // 1. numbered lists
    /^[-*•]\s*/gm,        // - bullet points
    /^[•▪▫]\s*/gm,        // • other bullets
    /;\s*(?=\w)/g,        // ; separators
    /,\s*(?=\w.*(?:work|task|write|code|call|meeting|email))/gi, // commas for task-like items
  ];

  for (const pattern of listPatterns) {
    const pieces = trimmed.split(pattern).map(s => s.trim()).filter(Boolean);
    if (pieces.length > 1) return pieces.filter(p => p.length > 2);
  }

  // Multi-line fallback
  const lines = trimmed.split("\n").map(s => s.trim()).filter(Boolean);
  if (lines.length > 1) return lines;

  // Single task
  return [trimmed];
}

/**
 * Extract a likely task duration (15/30/60) from user text.
 * - If it looks like the user is saying how long the *task* will take, strip it from the title.
 * - If it looks like content length (e.g., “record a 5-minute video”), keep it in the title.
 */
export function extractTimeDuration(title: string): {
  cleanTitle: string;
  duration?: 15 | 30 | 60;
  isTaskDuration: boolean;
} {
  const t = String(title ?? "");
  const lower = t.toLowerCase();

  // Content duration (don’t strip from title)
  const contentHints: RegExp[] = [
    /(?:write|create|record|film|make|produce|draft)\s+(?:a\s+)?\d+\s*(?:min|minute|hour|hr)s?\s+(?:video|song|skit|episode|clip|piece|article|post)/i,
    /\d+\s*(?:min|minute|hour|hr)s?\s+(?:video|song|skit|episode|clip|piece|article|post|presentation|meeting|call)/i,
    /(?:video|song|skit|episode|clip|piece|article|post)\s+(?:of|lasting|for)\s+\d+\s*(?:min|minute|hour|hr)s?/i,
  ];
  if (contentHints.some(r => r.test(t))) {
    return { cleanTitle: t.trim(), isTaskDuration: false };
  }

  // Task duration patterns (strip from title)
  const patterns: Array<{ re: RegExp; unit?: "m" | "h" }> = [
    // Prefix
    { re: /^(\d+)\s*(?:hours?|hrs?|h)\s*[-:]?\s*/i, unit: "h" },
    { re: /^(\d+)\s*(?:minutes?|mins?|m)\s*[-:]?\s*/i, unit: "m" },
    // Suffix
    { re: /\s*[-:]\s*(\d+)\s*(?:hours?|hrs?|h)$/i, unit: "h" },
    { re: /\s*[-:]\s*(\d+)\s*(?:minutes?|mins?|m)$/i, unit: "m" },
    // Phrases
    { re: /(?:takes?|will take|need|needs|requires?|allocate|spend)\s*(\d+)\s*(?:hours?|hrs?|h|minutes?|mins?|m)\b/i },
    { re: /(?:in|within|over)\s*(\d+)\s*(?:hours?|hrs?|h)\b/i, unit: "h" },
    { re: /(?:in|within|over)\s*(\d+)\s*(?:minutes?|mins?|m)\b/i, unit: "m" },
  ];

  for (const { re, unit } of patterns) {
    const m = t.match(re);
    if (m) {
      const num = Number(m[1]);
      const minutes = unit === "h" || /hour|hr|(^\d+\s*h)/i.test(m[0]) ? num * 60 : num;
      // Round to 15/30/60
      const rounded: 15 | 30 | 60 = minutes <= 22 ? 15 : minutes <= 45 ? 30 : 60;
      const cleaned = t.replace(m[0], "").replace(/\s+/g, " ").trim();
      return { cleanTitle: cleaned || t.trim(), duration: rounded, isTaskDuration: true };
    }
  }

  return { cleanTitle: t.trim(), isTaskDuration: false };
}

/**
 * Parse a large input string into a list of provisional tasks (title + optional duration hint).
 * (The real category comes from the backend AI; this only helps with title cleaning & quick duration.)
 */
export function parseTaskInput(input: string): ParsedTaskInput[] {
  return breakDownTasks(input).map(title => {
    const { cleanTitle, duration, isTaskDuration } = extractTimeDuration(title);
    return {
      title: cleanTitle,
      duration: (isTaskDuration && duration) ? duration : 30, // default 30m if none found
    };
  });
}

/**
 * Category color helper for cards/chips. Tailwind/utility class names only.
 * (Adjust to your theme file as needed.)
 */
export function getCategoryColor(cat: Category8): string {
  switch (cat) {
    // deep
    case "Analytical × Strategic":   return "bg-indigo-600/30 border-indigo-400/50";
    case "Creative × Generative":    return "bg-purple-600/30 border-purple-400/50";
    case "Learning × Absorptive":    return "bg-blue-600/30 border-blue-400/50";
    case "Constructive × Building":  return "bg-emerald-600/30 border-emerald-400/50";
    // light
    case "Social & Relational":      return "bg-rose-600/30 border-rose-400/50";
    case "Critical & Structuring":   return "bg-amber-600/30 border-amber-400/50";
    // admin
    case "Clerical & Admin Routines":return "bg-slate-600/30 border-slate-400/50";
    case "Logistics & Maintenance":  return "bg-zinc-600/30 border-zinc-400/50";
  }
}

/**
 * Optional label helper if you need a short chip title.
 */
export function getCategoryLabel(cat: Category8): string {
  return cat; // or shorten here if you want
}

/**
 * Export bucket helpers so components (like WorkloadSummary) can do capacity math
 * without ever storing a bucket on the Task.
 */
export { CATEGORY_TO_BUCKET, getBucketForCategory };
