import { WorkType } from '@/types/task';

// Parse multiple tasks from input
export function parseTaskInput(input: string): Array<{ title: string; workType: WorkType; duration: 15 | 30 | 60 }> {
  const tasks = breakDownTasks(input);
  return tasks.map(task => {
    const result = categorizeTask(task);
    return { title: result.cleanTitle, workType: result.workType, duration: result.duration };
  });
}

// Break down input into individual tasks
function breakDownTasks(input: string): string[] {
  const trimmed = input.trim();
  
  // Check for list patterns
  const listPatterns = [
    /^\d+\.\s*/gm,        // 1. numbered lists
    /^[-*•]\s*/gm,        // - bullet points
    /^[•▪▫]\s*/gm,        // • different bullets
    /;\s*(?=\w)/g,        // ; semicolon separation
    /,\s*(?=\w.*(?:work|task|write|code|call|meeting|email))/gi // comma separation for task-like items
  ];
  
  // Try each pattern
  for (const pattern of listPatterns) {
    const matches = trimmed.split(pattern).filter(item => item.trim().length > 0);
    if (matches.length > 1) {
      return matches.map(task => task.trim()).filter(task => task.length > 3);
    }
  }
  
  // Check for line breaks with task-like content
  const lines = trimmed.split('\n').map(line => line.trim()).filter(line => line.length > 3);
  if (lines.length > 1 && lines.every(line => /\w/.test(line))) {
    return lines;
  }
  
  // Single task
  return [trimmed];
}

// Extract time duration from task text, distinguishing between task duration and content duration
function extractTimeDuration(title: string): { cleanTitle: string; duration?: 15 | 30 | 60; isTaskDuration: boolean } {
  const taskDurationPatterns = [
    // Explicit task duration indicators
    { pattern: /(?:takes?|will take|need|needs|requires?|allocate|spend)\s*(\d+)\s*(?:h(?:our)?s?|hr?s?|min(?:ute)?s?|m)\b/i, multiplier: 60 },
    { pattern: /(?:in|within|over)\s*(\d+)\s*(?:h(?:our)?s?|hr?s?)\b/i, multiplier: 60 },
    { pattern: /(?:in|within|over)\s*(\d+)\s*(?:min(?:ute)?s?|m)\b/i, multiplier: 1 },
    // Standalone time at beginning/end (likely task duration)
    { pattern: /^(\d+)\s*(?:h(?:our)?s?|hr?s?)\s*[-:]?\s*/i, multiplier: 60 },
    { pattern: /^(\d+)\s*(?:min(?:ute)?s?|m)\s*[-:]?\s*/i, multiplier: 1 },
    { pattern: /\s*[-:]\s*(\d+)\s*(?:h(?:our)?s?|hr?s?)$/i, multiplier: 60 },
    { pattern: /\s*[-:]\s*(\d+)\s*(?:min(?:ute)?s?|m)$/i, multiplier: 1 }
  ];
  
  const contentDurationPatterns = [
    // Content duration indicators (don't use for task duration)
    { pattern: /(?:write|create|record|film|make|produce|draft)\s+(?:a\s+)?(\d+)\s*(?:min(?:ute)?|hour|hr?)\s+(?:video|song|skit|episode|clip|piece|article|post)/i },
    { pattern: /(\d+)\s*(?:min(?:ute)?|hour|hr?)\s+(?:video|song|skit|episode|clip|piece|article|post|presentation|meeting|call)/i },
    { pattern: /(?:video|song|skit|episode|clip|piece|article|post)\s+(?:of|lasting|for)\s+(\d+)\s*(?:min(?:ute)?s?|hour|hr?s?)/i }
  ];
  
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
      const duration = parseInt(match[1]) * multiplier;
      const cleanTitle = title.replace(pattern, '').replace(/\s+/g, ' ').trim();
      
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
export function categorizeTask(title: string): { workType: WorkType; duration: 15 | 30 | 60; cleanTitle: string } {
  const { cleanTitle, duration: extractedDuration, isTaskDuration } = extractTimeDuration(title);
  const taskTitle = cleanTitle.toLowerCase();
  const originalTitle = title.toLowerCase();

  // Context-aware categorization based on both action and object
  const deepWorkPatterns = [
    // Writing & Content Creation (context-sensitive)
    { pattern: /(write|writing|draft|compose|author).*(book|novel|manuscript|thesis|dissertation|research\s+paper|technical\s+documentation|comprehensive\s+guide|white\s+paper|academic\s+paper)/, workType: 'deep' as WorkType },
    { pattern: /(write|writing|draft|compose).*(proposal|strategy|business\s+plan|marketing\s+plan|project\s+plan|architecture\s+document)/, workType: 'deep' as WorkType },
    { pattern: /(create|develop|design).*(algorithm|system\s+architecture|technical\s+specification|database\s+schema|api\s+design|framework|complex\s+logic)/, workType: 'deep' as WorkType },
    
    // Technical & Analytical Work
    { pattern: /(code|coding|programming|develop|build|implement).*(feature|application|software|system|website|backend|frontend|database|api|integration)/, workType: 'deep' as WorkType },
    { pattern: /(analyze|analysis|research|study|investigate|examine).*(data|problem|solution|market|trend|user\s+behavior|performance|metrics|requirements)/, workType: 'deep' as WorkType },
    { pattern: /(debug|troubleshoot|solve|fix).*(complex|critical|technical|system|performance|integration)/, workType: 'deep' as WorkType },
    
    // Creative & Strategic Work
    { pattern: /(design|create|conceptualize).*(ui|ux|user\s+interface|user\s+experience|brand\s+identity|visual\s+system|design\s+system)/, workType: 'deep' as WorkType },
    { pattern: /(plan|planning|strategy|strategize).*(business|product|project|marketing|technical|long.?term)/, workType: 'deep' as WorkType },
    { pattern: /(brainstorm|ideate|conceptualize).*(product|feature|solution|innovation|creative\s+concept)/, workType: 'deep' as WorkType },
    
    // Learning & Study (deep vs light learning)
    { pattern: /(learn|study|master|understand).*(programming|advanced|complex|technical|new\s+technology|framework|language|system)/, workType: 'deep' as WorkType },
    { pattern: /(read|reading|study).*(textbook|manual|technical\s+documentation|research|academic|comprehensive)/, workType: 'deep' as WorkType },
    
    // Content creation requiring deep thought
    { pattern: /(create|produce|develop).*(course|curriculum|training\s+material|educational\s+content|technical\s+content)/, workType: 'deep' as WorkType }
  ];

  // Light work: Collaborative, communicative, or moderately engaging tasks  
  const lightWorkPatterns = [
    // Communication & Collaboration
    { pattern: /(call|meeting|discuss|chat|sync|standup|retrospective|demo|interview|1.?on.?1|one.?on.?one)/, workType: 'light' as WorkType },
    { pattern: /(review|feedback|comment|edit).*(draft|document|proposal|code|design|pull\s+request|pr)/, workType: 'light' as WorkType },
    { pattern: /(brainstorm|ideate|workshop|collaborate|pair\s+program)/, workType: 'light' as WorkType },
    
    // Content Consumption & Light Creation
    { pattern: /(read|reading).*(article|blog|news|update|summary|overview|newsletter|social|post)/, workType: 'light' as WorkType },
    { pattern: /(write|post|share).*(comment|review|feedback|social|twitter|linkedin|instagram|facebook|blog\s+comment|forum\s+post|quick\s+note)/, workType: 'light' as WorkType },
    { pattern: /(write|draft).*(email|message|brief|summary|status\s+update|quick\s+guide|outline)/, workType: 'light' as WorkType },
    { pattern: /(prepare|setup|organize).*(meeting|presentation|workshop|demo|call)/, workType: 'light' as WorkType },
    
    // Light creative and routine tasks
    { pattern: /(sketch|outline|wireframe|mockup|prototype|rough\s+draft)/, workType: 'light' as WorkType },
    { pattern: /(update|modify|tweak|adjust|polish).*(design|content|copy|text|wording)/, workType: 'light' as WorkType },
    { pattern: /(practice|rehearse|record).*(presentation|pitch|demo|video|podcast)/, workType: 'light' as WorkType },
    
    // Learning light content
    { pattern: /(watch|listen).*(tutorial|webinar|podcast|youtube|course|video)/, workType: 'light' as WorkType },
    { pattern: /(learn|study).*(basics|overview|introduction|quick\s+guide|cheat\s+sheet)/, workType: 'light' as WorkType }
  ];

  // Admin work: Routine, procedural, or maintenance tasks
  const adminWorkPatterns = [
    // Email & Communication Management
    { pattern: /(check|clear|organize|sort).*(email|emails|inbox|messages)/, workType: 'admin' as WorkType },
    { pattern: /(respond|reply|follow.?up).*(email|message|inquiry|request)/, workType: 'admin' as WorkType },
    { pattern: /(schedule|book|calendar|reschedule|cancel).*(appointment|meeting|call|slot|time)/, workType: 'admin' as WorkType },
    
    // File & Data Management
    { pattern: /(file|files|upload|download|backup|save|organize|sort|clean|archive|delete).*(documents|folders|photos|data)/, workType: 'admin' as WorkType },
    { pattern: /(update|maintain|sync|migrate|import|export).*(database|files|contacts|calendar|settings)/, workType: 'admin' as WorkType },
    { pattern: /(rename|move|copy|transfer).*(files|folders|documents|photos)/, workType: 'admin' as WorkType },
    
    // Financial & Administrative Tasks
    { pattern: /(invoice|expense|receipt|bill|payment|budget|accounting|tax|banking)/, workType: 'admin' as WorkType },
    { pattern: /(timesheet|log|tracking|report|fill\s+out|complete).*(form|survey|application|paperwork)/, workType: 'admin' as WorkType },
    { pattern: /(submit|approve|process|verify|check|validate|sign).*(document|form|request|application)/, workType: 'admin' as WorkType },
    
    // System & Tool Management
    { pattern: /(setup|install|configure|update).*(software|app|tool|settings|preferences|permissions|account)/, workType: 'admin' as WorkType },
    { pattern: /(backup|restore|maintenance|cleanup|optimize).*(system|computer|files|database)/, workType: 'admin' as WorkType },
    
    // Routine administrative tasks
    { pattern: /(order|purchase|buy|shop\s+for).*(supplies|equipment|groceries|household)/, workType: 'admin' as WorkType },
    { pattern: /(book|reserve|cancel).*(travel|hotel|flight|restaurant|appointment)/, workType: 'admin' as WorkType }
  ];

  // Check patterns in order of specificity (deep -> admin -> light)
  for (const { pattern, workType } of deepWorkPatterns) {
    if (pattern.test(taskTitle)) {
      // Use extracted duration if it's a task duration, otherwise use context-based duration
      let autoDuration: 15 | 30 | 60;
      if (taskTitle.includes('quick') || taskTitle.includes('brief') || taskTitle.includes('short')) {
        autoDuration = 30;
      } else if (taskTitle.includes('comprehensive') || taskTitle.includes('detailed') || taskTitle.includes('complex')) {
        autoDuration = 60;
      } else {
        autoDuration = 60; // Default for deep work
      }
      return { workType, duration: (extractedDuration && isTaskDuration) ? extractedDuration : autoDuration, cleanTitle };
    }
  }

  for (const { pattern, workType } of adminWorkPatterns) {
    if (pattern.test(taskTitle)) {
      let autoDuration: 15 | 30 | 60;
      if (taskTitle.includes('quick') || taskTitle.includes('brief') || taskTitle.includes('short')) {
        autoDuration = 15;
      } else if (taskTitle.includes('organize') || taskTitle.includes('setup') || taskTitle.includes('configure')) {
        autoDuration = 30;
      } else {
        autoDuration = 15; // Default for admin work
      }
      return { workType, duration: (extractedDuration && isTaskDuration) ? extractedDuration : autoDuration, cleanTitle };
    }
  }

  for (const { pattern, workType } of lightWorkPatterns) {
    if (pattern.test(taskTitle)) {
      let autoDuration: 15 | 30 | 60;
      if (taskTitle.includes('quick') || taskTitle.includes('brief') || taskTitle.includes('short')) {
        autoDuration = 15;
      } else if (taskTitle.includes('detailed') || taskTitle.includes('thorough')) {
        autoDuration = 60;
      } else {
        autoDuration = 30; // Default for light work
      }
      return { workType, duration: (extractedDuration && isTaskDuration) ? extractedDuration : autoDuration, cleanTitle };
    }
  }

  // Enhanced fallback with context awareness
  if (/(write|create|develop|design|build|code|program).*(book|novel|article|blog|system|app|feature|algorithm|architecture|comprehensive|complex|detailed)/.test(taskTitle)) {
    return { workType: 'deep', duration: (extractedDuration && isTaskDuration) ? extractedDuration : 60, cleanTitle };
  }
  
  if (/(email|inbox|file|schedule|organize|admin|maintain|backup|install|configure|invoice|expense|form|paperwork)/.test(taskTitle)) {
    return { workType: 'admin', duration: (extractedDuration && isTaskDuration) ? extractedDuration : 15, cleanTitle };
  }

  // Default to light work
  return { workType: 'light', duration: (extractedDuration && isTaskDuration) ? extractedDuration : 30, cleanTitle };
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