import { Task, TaskGroup, WorkType } from '@/types/task';

// Similarity threshold for grouping tasks (0-1, where 1 is identical)
const SIMILARITY_THRESHOLD = 0.6;

// Maximum duration for a group (60 minutes = 1 hour)
const MAX_GROUP_DURATION = 60;

// Detect if tasks are similar enough to be grouped
export function areTasksSimilar(task1: Task, task2: Task): boolean {
  // Must be same work type and duration
  if (task1.workType !== task2.workType || task1.duration !== task2.duration) {
    return false;
  }

  // Check for common patterns in task titles
  const title1 = task1.title.toLowerCase();
  const title2 = task2.title.toLowerCase();

  // Email-related tasks
  if (isEmailTask(title1) && isEmailTask(title2)) {
    return true;
  }

  // Social media tasks
  if (isSocialMediaTask(title1) && isSocialMediaTask(title2)) {
    return true;
  }

  // Administrative tasks
  if (isAdministrativeTask(title1) && isAdministrativeTask(title2)) {
    return true;
  }

  // Writing tasks
  if (isWritingTask(title1) && isWritingTask(title2)) {
    return true;
  }

  // Meeting/call tasks
  if (isMeetingTask(title1) && isMeetingTask(title2)) {
    return true;
  }

  // File management tasks
  if (isFileManagementTask(title1) && isFileManagementTask(title2)) {
    return true;
  }

  // Check string similarity for other tasks
  return calculateSimilarity(title1, title2) >= SIMILARITY_THRESHOLD;
}

function isEmailTask(title: string): boolean {
  return /(?:reply|respond|email|inbox|message)/i.test(title);
}

function isSocialMediaTask(title: string): boolean {
  return /(?:linkedin|facebook|twitter|instagram|social|post|comment)/i.test(title);
}

function isAdministrativeTask(title: string): boolean {
  return /(?:invoice|expense|form|paperwork|file|organize|schedule|calendar|booking)/i.test(title);
}

function isWritingTask(title: string): boolean {
  return /(?:write|draft|compose|blog|article|content)/i.test(title);
}

function isMeetingTask(title: string): boolean {
  return /(?:meeting|call|discuss|sync|standup|interview)/i.test(title);
}

function isFileManagementTask(title: string): boolean {
  return /(?:organize|sort|clean|backup|upload|download|file|folder)/i.test(title);
}

// Calculate string similarity using Levenshtein distance
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[j][i] = matrix[j - 1][i - 1];
      } else {
        matrix[j][i] = Math.min(
          matrix[j - 1][i - 1] + 1,
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Create groups from a list of tasks
export function createTaskGroups(tasks: Task[]): { groups: TaskGroup[]; ungroupedTasks: Task[] } {
  const groups: TaskGroup[] = [];
  const ungroupedTasks: Task[] = [];
  const processedTasks = new Set<string>();

  for (const task of tasks) {
    if (processedTasks.has(task.id) || task.isGrouped) continue;

    // Find similar tasks
    const similarTasks = tasks.filter(t => 
      !processedTasks.has(t.id) && 
      t.id !== task.id && 
      !t.isGrouped &&
      areTasksSimilar(task, t)
    );

    if (similarTasks.length > 0) {
      // Check if total duration would exceed limit
      const totalDuration = (1 + similarTasks.length) * task.duration;
      if (totalDuration <= MAX_GROUP_DURATION) {
        // Create a group
        const allTasks = [task, ...similarTasks];
        const groupTitle = generateGroupTitle(allTasks);
        
        const group: TaskGroup = {
          id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: groupTitle,
          workType: task.workType,
          duration: task.duration,
          taskIds: allTasks.map(t => t.id),
          completed: allTasks.every(t => t.completed),
          scheduledDay: task.scheduledDay,
          priority: Math.min(...allTasks.map(t => t.priority || 999)),
          isPriority: allTasks.some(t => t.isPriority),
          createdAt: new Date(),
          isExpanded: true
        };

        groups.push(group);
        allTasks.forEach(t => processedTasks.add(t.id));
      } else {
        ungroupedTasks.push(task);
        processedTasks.add(task.id);
      }
    } else {
      ungroupedTasks.push(task);
      processedTasks.add(task.id);
    }
  }

  return { groups, ungroupedTasks };
}

// Generate a meaningful title for a group based on the tasks
function generateGroupTitle(tasks: Task[]): string {
  const firstTitle = tasks[0].title.toLowerCase();
  
  if (tasks.every(t => isEmailTask(t.title))) {
    return `Email tasks (${tasks.length})`;
  }
  
  if (tasks.every(t => isSocialMediaTask(t.title))) {
    return `Social media tasks (${tasks.length})`;
  }
  
  if (tasks.every(t => isAdministrativeTask(t.title))) {
    return `Administrative tasks (${tasks.length})`;
  }
  
  if (tasks.every(t => isWritingTask(t.title))) {
    return `Writing tasks (${tasks.length})`;
  }
  
  if (tasks.every(t => isMeetingTask(t.title))) {
    return `Meeting tasks (${tasks.length})`;
  }
  
  if (tasks.every(t => isFileManagementTask(t.title))) {
    return `File management (${tasks.length})`;
  }
  
  // Extract common words from task titles
  const words = tasks.map(t => t.title.toLowerCase().split(' ')).flat();
  const wordCounts = words.reduce((acc, word) => {
    if (word.length > 3) { // Ignore short words
      acc[word] = (acc[word] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  
  const commonWord = Object.entries(wordCounts)
    .filter(([_, count]) => count >= Math.ceil(tasks.length / 2))
    .sort(([_, a], [__, b]) => b - a)[0]?.[0];
  
  if (commonWord) {
    return `${commonWord.charAt(0).toUpperCase() + commonWord.slice(1)} tasks (${tasks.length})`;
  }
  
  return `Similar tasks (${tasks.length})`;
}

// Check if a group can accommodate another task (duration limit)
export function canAddTaskToGroup(group: TaskGroup, task: Task): boolean {
  const totalDuration = (group.taskIds.length + 1) * group.duration;
  return totalDuration <= MAX_GROUP_DURATION && 
         group.workType === task.workType && 
         group.duration === task.duration;
}

// Add a task to an existing group
export function addTaskToGroup(group: TaskGroup, task: Task): TaskGroup {
  if (!canAddTaskToGroup(group, task)) {
    throw new Error('Cannot add task to group: duration limit exceeded or incompatible task');
  }
  
  return {
    ...group,
    taskIds: [...group.taskIds, task.id],
    title: group.title.replace(/\((\d+)\)$/, (_, count) => `(${parseInt(count) + 1})`),
    completed: group.completed && task.completed,
    isPriority: group.isPriority || task.isPriority
  };
}

// Remove a task from a group
export function removeTaskFromGroup(group: TaskGroup, taskId: string): TaskGroup | null {
  const newTaskIds = group.taskIds.filter(id => id !== taskId);
  
  // If only one task left, the group should be dissolved
  if (newTaskIds.length <= 1) {
    return null;
  }
  
  return {
    ...group,
    taskIds: newTaskIds,
    title: group.title.replace(/\((\d+)\)$/, (_, count) => `(${parseInt(count) - 1})`)
  };
}