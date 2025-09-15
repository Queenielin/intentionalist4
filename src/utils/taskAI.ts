import { WorkType } from '@/types/task';

// Simulated AI categorization based on keywords
export function categorizeTask(title: string): { workType: WorkType; duration: 15 | 30 | 60 } {
  const lowerTitle = title.toLowerCase();

  // Deep work keywords
  const deepWorkKeywords = [
    'write', 'code', 'develop', 'design', 'research', 'analyze', 'plan', 
    'create', 'think', 'strategy', 'architecture', 'document', 'study',
    'programming', 'algorithm', 'technical', 'complex', 'focus'
  ];

  // Light work keywords  
  const lightWorkKeywords = [
    'review', 'call', 'meeting', 'discuss', 'brainstorm', 'sketch',
    'outline', 'organize', 'sort', 'prepare', 'setup', 'coordinate',
    'follow up', 'check', 'quick', 'brief', 'chat', 'sync'
  ];

  // Admin work keywords
  const adminWorkKeywords = [
    'email', 'respond', 'reply', 'file', 'upload', 'download', 'backup',
    'update', 'maintain', 'clean', 'organize', 'schedule', 'book',
    'invoice', 'expense', 'report', 'submit', 'approve', 'process'
  ];

  // Check for deep work
  if (deepWorkKeywords.some(keyword => lowerTitle.includes(keyword))) {
    return { 
      workType: 'deep', 
      duration: lowerTitle.includes('quick') || lowerTitle.includes('brief') ? 30 : 60 
    };
  }

  // Check for admin work
  if (adminWorkKeywords.some(keyword => lowerTitle.includes(keyword))) {
    return { 
      workType: 'admin', 
      duration: lowerTitle.includes('quick') || lowerTitle.includes('brief') ? 15 : 30 
    };
  }

  // Check for light work or default
  if (lightWorkKeywords.some(keyword => lowerTitle.includes(keyword))) {
    return { workType: 'light', duration: 30 };
  }

  // Default to light work for unclear tasks
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