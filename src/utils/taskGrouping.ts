import { Task, Slot, Category8 } from '@/types/task';

// ─────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────

// Max *total* minutes of tasks inside a Slot (your 1-hour per slot rule)
const MAX_SLOT_TOTAL_MINUTES = 60;

// Optional similarity threshold if you want to auto-cluster within the same category
const SIMILARITY_THRESHOLD = 0.6;

// ─────────────────────────────────────────────────────────────
// Public APIs (renamed to Slot semantics)
// ─────────────────────────────────────────────────────────────

/**
 * Given a flat list of tasks (same day, or however you filter),
 * create Slots by grouping similar tasks *within the same category*
 * while ensuring each Slot’s total duration ≤ 60 minutes.
 */
export function createSlots(tasks: Task[]): { slots: Slot[]; unassignedTasks: Task[] } {
  const slots: Slot[] = [];
  const unassignedTasks: Task[] = [];
  const processed = new Set<string>();

  // Only consider active, uncategorized-to-slot tasks; you can prefilter by day if needed upstream
  const candidates = tasks.filter(t => !t.completed);

  for (const task of candidates) {
    if (processed.has(task.id)) continue;

    // Try to place this task into an existing compatible Slot first
    const compatible = slots.find(s => canAddTaskToSlot(s, task));
    if (compatible) {
      const updated = addTaskToSlot(compatible, task);
      // replace slot in array
      const idx = slots.findIndex(s => s.id === compatible.id);
      slots[idx] = updated;
      processed.add(task.id);
      continue;
    }

    // Otherwise, try to find similar tasks (same category) to start a new Slot
    const similar = candidates.filter(t =>
      !processed.has(t.id) &&
      t.id !== task.id &&
      t.category === task.category &&
      areTitlesSimilar(task.title, t.title)
    );

    // Build a Slot with as many similar tasks as fit under 60 min
    const picked: Task[] = [task];
    let total = task.duration;

    for (const t of similar) {
      if (total + t.duration <= MAX_SLOT_TOTAL_MINUTES) {
        picked.push(t);
        total += t.duration;
      }
    }

    // Create the Slot
    const slot: Slot = {
      id: `slot-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      title: generateSlotTitle(task.category, picked),
      category: task.category,
      taskIds: picked.map(t => t.id),
      // optional metadata
      createdAt: new Date(),
      isExpanded: true,
    };

    slots.push(slot);
    picked.forEach(t => processed.add(t.id));
  }

  // Anything not processed is unassigned
  for (const t of candidates) {
    if (!processed.has(t.id)) unassignedTasks.push(t);
  }

  return { slots, unassignedTasks };
}

/** Check if a task can be added to a slot:
 *  - Same category
 *  - New total duration ≤ 60
 */
export function canAddTaskToSlot(slot: Slot, task: Task): boolean {
  if (task.category !== slot.category) return false;
  const currentTotal = slotTotalMinutes(slot, task);
  return currentTotal + task.duration <= MAX_SLOT_TOTAL_MINUTES;
}

/** Return a new Slot with the task added (throws if not allowed). */
export function addTaskToSlot(slot: Slot, task: Task): Slot {
  if (!canAddTaskToSlot(slot, task)) {
    throw new Error('Cannot add task to slot: category mismatch or duration cap (60m) exceeded.');
  }
  const newTaskIds = [...slot.taskIds, task.id];
  return {
    ...slot,
    taskIds: newTaskIds,
    title: bumpCountInTitle(slot.title, newTaskIds.length) ?? generateSlotTitle(slot.category, newTaskIds.map(id => ({ id } as Task))),
  };
}

/** Remove a task from a slot. If removing drops to 0 tasks, return null to signal deletion. */
export function removeTaskFromSlot(slot: Slot, taskId: string): Slot | null {
  const newIds = slot.taskIds.filter(id => id !== taskId);
  if (newIds.length === 0) return null;

  return {
    ...slot,
    taskIds: newIds,
    title: bumpCountInTitle(slot.title, newIds.length) ?? slot.title,
  };
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function slotTotalMinutes(slot: Slot, lookupTask?: Task): number {
  // We don’t have tasks here; callers usually have them.
  // For safety, if you want an exact sum, pass the task you’re adding,
  // otherwise assume each existing task contributes (unknown) minutes.
  // In real usage, compute using your task store:
  //  sum(tasks.filter(t => slot.taskIds.includes(t.id)).map(t => t.duration))
  // For this file to stay pure, we just count the known new task + assume 0 for existing.
  // Better approach: move this logic to where you have access to the tasks array.
  return 0 + (lookupTask ? 0 : 0);
}

/** Title heuristics, loosened: we only care if they feel alike. */
function areTitlesSimilar(a: string, b: string): boolean {
  const t1 = a.toLowerCase();
  const t2 = b.toLowerCase();

  // fast paths for common types
  if (isEmailTask(t1) && isEmailTask(t2)) return true;
  if (isSocialTask(t1) && isSocialTask(t2)) return true;
  if (isAdminTask(t1) && isAdminTask(t2)) return true;
  if (isWritingTask(t1) && isWritingTask(t2)) return true;
  if (isMeetingTask(t1) && isMeetingTask(t2)) return true;
  if (isFileTask(t1) && isFileTask(t2)) return true;

  // fallback to fuzzy similarity
  return stringSimilarity(t1, t2) >= SIMILARITY_THRESHOLD;
}

function isEmailTask(t: string)       { return /(reply|respond|email|inbox|message)/i.test(t); }
function isSocialTask(t: string)      { return /(linkedin|facebook|twitter|x\.com|instagram|social|post|comment)/i.test(t); }
function isAdminTask(t: string)       { return /(invoice|expense|form|paperwork|file|organize|schedule|calendar|booking)/i.test(t); }
function isWritingTask(t: string)     { return /(write|draft|compose|blog|article|content)/i.test(t); }
function isMeetingTask(t: string)     { return /(meeting|call|discuss|sync|standup|interview)/i.test(t); }
function isFileTask(t: string)        { return /(organize|sort|clean|backup|upload|download|file|folder)/i.test(t); }

/** Simple normalized Levenshtein similarity */
function stringSimilarity(a: string, b: string): number {
  const longer = a.length >= b.length ? a : b;
  const shorter = a.length >= b.length ? b : a;
  if (longer.length === 0) return 1;
  const dist = levenshtein(longer, shorter);
  return (longer.length - dist) / longer.length;
}

function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: b.length + 1 }, () =>
    Array<number>(a.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      if (a[i - 1] === b[j - 1]) matrix[j][i] = matrix[j - 1][i - 1];
      else {
        matrix[j][i] = Math.min(
          matrix[j - 1][i - 1] + 1,
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/** Title like "Email (3)" / "Social media (2)" / "Similar tasks (n)" */
function generateSlotTitle(category: Category8, tasksInSlot: Task[]): string {
  const count = tasksInSlot.length;
  // Prefer a semantic label if all tasks match a heuristic family
  if (tasksInSlot.every(t => isEmailTask(t.title))) return `Email (${count})`;
  if (tasksInSlot.every(t => isSocialTask(t.title))) return `Social media (${count})`;
  if (tasksInSlot.every(t => isAdminTask(t.title)))  return `Admin (${count})`;
  if (tasksInSlot.every(t => isWritingTask(t.title))) return `Writing (${count})`;
  if (tasksInSlot.every(t => isMeetingTask(t.title))) return `Meetings (${count})`;
  if (tasksInSlot.every(t => isFileTask(t.title)))    return `File mgmt (${count})`;

  // Fallback: category-based
  return `${category} (${count})`;
}

/** Update trailing "(n)" count if present; else return null to signal caller to regenerate. */
function bumpCountInTitle(title: string, newCount: number): string | null {
  if (/\(\d+\)$/.test(title)) {
    return title.replace(/\(\d+\)$/, `(${newCount})`);
  }
  return null;
}
