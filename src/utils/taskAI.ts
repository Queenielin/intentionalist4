import { WorkType } from '@/types/task';

// Smart AI categorization with context-aware logic
export function categorizeTask(title: string): { workType: WorkType; duration: 15 | 30 | 60 } {
  const lowerTitle = title.toLowerCase();

  // Deep work: Requires sustained focus, creativity, or complex problem-solving
  const deepWorkPatterns = [
    // Writing & Content Creation
    { pattern: /(write|writing|draft|compose|author).*(article|blog|book|paper|proposal|documentation|content|story|script)/, workType: 'deep' as WorkType },
    { pattern: /(create|design|develop).*(strategy|plan|architecture|system|framework|algorithm)/, workType: 'deep' as WorkType },
    
    // Technical & Analytical Work
    { pattern: /(code|coding|programming|develop|build).*(feature|app|software|system|website)/, workType: 'deep' as WorkType },
    { pattern: /(analyze|analysis|research|study|investigate|examine).*(data|problem|solution|market|trend)/, workType: 'deep' as WorkType },
    
    // Creative & Strategic Work
    { pattern: /(design|create|brainstorm).*(ui|ux|interface|logo|brand|concept|idea)/, workType: 'deep' as WorkType },
    { pattern: /(plan|planning|strategy|roadmap|vision)/, workType: 'deep' as WorkType },
    
    // Learning & Study
    { pattern: /(learn|study|master|understand).*(complex|advanced|technical|new)/, workType: 'deep' as WorkType },
    { pattern: /(read|reading).*(textbook|manual|documentation|research|technical)/, workType: 'deep' as WorkType }
  ];

  // Light work: Collaborative, communicative, or moderately engaging tasks
  const lightWorkPatterns = [
    // Communication & Collaboration
    { pattern: /(call|meeting|discuss|chat|sync|standup|retrospective|demo)/, workType: 'light' as WorkType },
    { pattern: /(review|feedback|comment|edit).*(draft|document|proposal|code|design)/, workType: 'light' as WorkType },
    { pattern: /(brainstorm|ideate|workshop|collaborate)/, workType: 'light' as WorkType },
    
    // Content Consumption & Light Creation
    { pattern: /(read|reading).*(article|blog|news|update|summary|overview)/, workType: 'light' as WorkType },
    { pattern: /(write|post).*(comment|review|feedback|social|twitter|linkedin)/, workType: 'light' as WorkType },
    { pattern: /(prepare|setup|organize).*(meeting|presentation|workshop)/, workType: 'light' as WorkType },
    
    // Routine Creative Work
    { pattern: /(sketch|outline|wireframe|mockup|prototype)/, workType: 'light' as WorkType },
    { pattern: /(update|modify|tweak|adjust).*(design|content|copy)/, workType: 'light' as WorkType }
  ];

  // Admin work: Routine, procedural, or maintenance tasks
  const adminWorkPatterns = [
    // Email & Communication Management
    { pattern: /(email|emails|inbox|respond|reply|follow.?up)/, workType: 'admin' as WorkType },
    { pattern: /(schedule|book|calendar|appointment|slot)/, workType: 'admin' as WorkType },
    
    // File & Data Management
    { pattern: /(file|files|upload|download|backup|save|organize|sort|clean)/, workType: 'admin' as WorkType },
    { pattern: /(update|maintain|sync|migrate|import|export)/, workType: 'admin' as WorkType },
    
    // Financial & Administrative Tasks
    { pattern: /(invoice|expense|receipt|bill|payment|budget|accounting)/, workType: 'admin' as WorkType },
    { pattern: /(report|reporting|timesheet|log|tracking|documentation)/, workType: 'admin' as WorkType },
    { pattern: /(submit|approve|process|verify|check|validate)/, workType: 'admin' as WorkType },
    
    // System & Tool Management
    { pattern: /(setup|install|configure|settings|preferences|permissions)/, workType: 'admin' as WorkType }
  ];

  // Check patterns in order of specificity (deep -> admin -> light)
  for (const { pattern, workType } of deepWorkPatterns) {
    if (pattern.test(lowerTitle)) {
      const duration = lowerTitle.includes('quick') || lowerTitle.includes('brief') || lowerTitle.includes('short') ? 30 : 60;
      return { workType, duration };
    }
  }

  for (const { pattern, workType } of adminWorkPatterns) {
    if (pattern.test(lowerTitle)) {
      const duration = lowerTitle.includes('quick') || lowerTitle.includes('brief') || lowerTitle.includes('short') ? 15 : 30;
      return { workType, duration };
    }
  }

  for (const { pattern, workType } of lightWorkPatterns) {
    if (pattern.test(lowerTitle)) {
      return { workType, duration: 30 };
    }
  }

  // Fallback: simple keyword matching for edge cases
  if (/(code|develop|write.*book|research.*deep|design.*system|algorithm|technical.*complex)/.test(lowerTitle)) {
    return { workType: 'deep', duration: 60 };
  }
  
  if (/(email|file|schedule|invoice|admin|maintain|organize.*files)/.test(lowerTitle)) {
    return { workType: 'admin', duration: 30 };
  }

  // Default to light work
  return { workType: 'light', duration: 30 };
}

export function getWorkTypeColor(workType: WorkType): string {
  switch (workType) {
    case 'deep':
      return 'task-deep';
    case 'light':
      return 'task-light';
    case 'admin':
      return 'task-admin';
    default:
      return 'task-light';
  }
}

export function getWorkTypeLabel(workType: WorkType): string {
  switch (workType) {
    case 'deep':
      return 'Deep Work';
    case 'light':
      return 'Light Work';
    case 'admin':
      return 'Admin Work';
    default:
      return 'Light Work';
  }
}

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