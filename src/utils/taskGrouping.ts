import { Task, Slot, Category8 } from "@/types/task";

// ─────────────────────────────────────────────────────────────
// Rules
// ─────────────────────────────────────────────────────────────
const MAX_SLOT_MINUTES = 75; // 1h + 15m
const SIMILARITY_THRESHOLD = 0.6;

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Build Slots from a flat list of tasks with these constraints:
 * - Tasks in the same Slot must share the same category.
 * - Slot total minutes <= 75.
 * - Solo 60m tasks are put first. If there's a spare 15m, we pair
 *   exactly one 15m with one 60m in the same category to make 75m.
 * - Small tasks (15/30) are clustered by title similarity and packed.
 */
export function createSlots(tasks: Task[]): { slots: Slot[]; unassignedTasks: Task[] } {
  const active = tasks.filter((t) => !t.completed);
  const byCat = groupBy(active, (t) => t.category);

  const allSlots: Slot[] = [];
  const unassigned: Task[] = [];

  for (const [category, list] of Object.entries(byCat) as [Category8, Task[]][]) {
    // Split by duration class
    const sixty = list.filter((t) => t.duration === 60);
    const thirty = list.filter((t) => t.duration === 30);
    const fifteen = list.filter((t) => t.duration === 15);

    // 1) Create solo 60m slots first
    const sixtySlots = sixty.map((t) =>
      makeSlot(category, [t], `${category}-60solo-${t.id}`)
    );

    // 2) Try to pair one 15m with one 60m (same category) if we have leftovers
    //    to avoid a dangling single 15m slot.
    const paired = new Set<string>(); // task ids we’ve consumed from fifteen[]
    const sixtyToAugment = [...sixtySlots]; // copy to mutate
    let fi = 0;
    for (let i = 0; i < sixtyToAugment.length && fi < fifteen.length; i++) {
      const slot = sixtyToAugment[i];
      const f = fifteen[fi];
      if (!f) break;
      // if we can add 15m to this 60m slot → do it once
      if (sumDuration([f]) + slotDuration(slot, tasks) <= MAX_SLOT_MINUTES) {
        slot.taskIds.push(f.id);
        slot.title = bumpCountInTitle(slot.title, slot.taskIds.length) ?? slot.title;
        paired.add(f.id);
        fi++;
      }
    }

    // Filter out paired 15s from the remaining small tasks
    const remaining15 = fifteen.filter((t) => !paired.has(t.id));

    // 3) Cluster remaining 15/30 by title similarity and pack into 75m slots
    const small = [...thirty, ...remaining15];
    const smallClusters = clusterBySimilarity(small);
    const smallSlots: Slot[] = [];
    for (const cluster of smallClusters) {
      const packed = packIntoSlots(cluster, MAX_SLOT_MINUTES);
      packed.forEach((tasksInSlot, idx) => {
        // keep related clusters close with a stable id stem
        smallSlots.push(
          makeSlot(category, tasksInSlot, `${category}-small-${cluster.key}-${idx}`)
        );
      });
    }

    // Order within category:
    //   A) 60m solos (and any 60+15) first
    //   B) then cluster-based small slots
    allSlots.push(...sixtyToAugment, ...smallSlots);
  }

  // Anything completed or filtered out would be "unassigned" (none in this flow),
  // but we keep the return shape.
  return { slots: allSlots, unassignedTasks: unassigned };
}

/** Can a task be added to a Slot (same category + total <= 75m)? */
export function canAddTaskToSlot(slot: Slot, task: Task, allTasks: Task[]): boolean {
  if (task.category !== slot.category) return false;
  const total = slotDuration(slot, allTasks) + task.duration;
  return total <= MAX_SLOT_MINUTES;
}

/** Add task to Slot (throws if not allowed). */
export function addTaskToSlot(slot: Slot, task: Task, allTasks: Task[]): Slot {
  if (!canAddTaskToSlot(slot, task, allTasks)) {
    throw new Error("Cannot add task to slot: category mismatch or >75m total.");
  }
  const nextTaskIds = [...slot.taskIds, task.id];
  return {
    ...slot,
    taskIds: nextTaskIds,
    title: bumpCountInTitle(slot.title, nextTaskIds.length) ?? slot.title,
  };
}

/** Remove task from Slot. If none left, return null to signal deletion. */
export function removeTaskFromSlot(slot: Slot, taskId: string): Slot | null {
  const next = slot.taskIds.filter((id) => id !== taskId);
  if (next.length === 0) return null;
  return {
    ...slot,
    taskIds: next,
    title: bumpCountInTitle(slot.title, next.length) ?? slot.title,
  };
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function groupBy<T, K extends string | number>(
  arr: T[],
  keyer: (t: T) => K
): Record<K, T[]> {
  return arr.reduce((acc, item) => {
    const k = keyer(item);
    (acc[k] ||= []).push(item);
    return acc;
  }, {} as Record<K, T[]>);
}

function slotDuration(slot: Slot, allTasks: Task[]): number {
  const map = new Map(allTasks.map((t) => [t.id, t]));
  return slot.taskIds.reduce((sum, id) => sum + (map.get(id)?.duration ?? 0), 0);
}

function sumDuration(list: Task[]): number {
  return list.reduce((s, t) => s + t.duration, 0);
}

function normalizeTitle(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

function similarity(a: string, b: string): number {
  const A = normalizeTitle(a);
  const B = normalizeTitle(b);
  if (A === B) return 1;

  const longer = A.length >= B.length ? A : B;
  const shorter = A.length >= B.length ? B : A;
  if (longer.length === 0) return 1;

  // Levenshtein
  const dist = (() => {
    const m = Array.from({ length: shorter.length + 1 }, () =>
      Array<number>(longer.length + 1).fill(0)
    );
    for (let i = 0; i <= longer.length; i++) m[0][i] = i;
    for (let j = 0; j <= shorter.length; j++) m[j][0] = j;
    for (let j = 1; j <= shorter.length; j++) {
      for (let i = 1; i <= longer.length; i++) {
        if (longer[i - 1] === shorter[j - 1]) m[j][i] = m[j - 1][i - 1];
        else m[j][i] = Math.min(m[j - 1][i - 1] + 1, m[j][i - 1] + 1, m[j - 1][i] + 1);
      }
    }
    return m[shorter.length][longer.length];
  })();

  return (longer.length - dist) / longer.length;
}

/** Cluster by (normalized) seed title; only same-category tasks are passed in. */
function clusterBySimilarity(tasks: Task[]): Array<{ key: string; tasks: Task[] }> {
  const remaining = [...tasks];
  const clusters: Array<{ key: string; tasks: Task[] }> = [];

  while (remaining.length) {
    const seed = remaining.shift()!;
    const key = normalizeTitle(seed.title) || `misc-${seed.id}`;

    const bucket: Task[] = [seed];
    for (let i = remaining.length - 1; i >= 0; i--) {
      const t = remaining[i];
      if (similarity(seed.title, t.title) >= SIMILARITY_THRESHOLD) {
        bucket.push(t);
        remaining.splice(i, 1);
      }
    }
    clusters.push({ key, tasks: bucket });
  }
  return clusters;
}

/** Greedy pack into bins with capacity cap (75m). */
function packIntoSlots(items: Task[], cap: number): Task[][] {
  const slots: Task[][] = [];
  const sorted = [...items].sort((a, b) => b.duration - a.duration); // 30s before 15s

  for (const t of sorted) {
    let placed = false;
    for (const s of slots) {
      const total = sumDuration(s);
      if (total + t.duration <= cap) {
        s.push(t);
        placed = true;
        break;
      }
    }
    if (!placed) slots.push([t]);
  }
  return slots;
}

/** Build a Slot with a reasonable title. */
function makeSlot(category: Category8, tasksInSlot: Task[], idSeed: string): Slot {
  const count = tasksInSlot.length;
  const allTitles = tasksInSlot.map((t) => normalizeTitle(t.title));
  const allSameEmail = allTitles.every((t) => /(reply|respond|email|inbox|message)/.test(t));
  const allSameSocial = allTitles.every((t) => /(linkedin|facebook|x|twitter|instagram|social|post|comment)/.test(t));
  const allAdmin = allTitles.every((t) => /(invoice|expense|form|paperwork|file|organize|schedule|calendar|booking)/.test(t));
  const allWrite = allTitles.every((t) => /(write|draft|compose|blog|article|content)/.test(t));
  const allMeet = allTitles.every((t) => /(meeting|call|discuss|sync|standup|interview)/.test(t));
  const allFile = allTitles.every((t) => /(organize|sort|clean|backup|upload|download|file|folder)/.test(t));

  let label =
    (allSameEmail && "Email") ||
    (allSameSocial && "Social media") ||
    (allAdmin && "Admin") ||
    (allWrite && "Writing") ||
    (allMeet && "Meetings") ||
    (allFile && "File mgmt") ||
    category;

  return {
    id: `slot-${idSeed}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: `${label} (${count})`,
    category,
    taskIds: tasksInSlot.map((t) => t.id),
    createdAt: new Date(),
    isExpanded: true,
  };
}

/** Update trailing "(n)" if present. */
function bumpCountInTitle(title: string, n: number): string | null {
  if (/\(\d+\)$/.test(title)) return title.replace(/\(\d+\)$/, `(${n})`);
  return null;
}
