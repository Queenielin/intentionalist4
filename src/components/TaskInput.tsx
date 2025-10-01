
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TaskInputProps {
  onAddTask: (title: string, duration: number, scheduledDay?: 'today' | 'tomorrow') => void;
}



export default function TaskInput({ onAddTask }: TaskInputProps) {
  const [value, setValue] = useState('');

 // Calculate number of lines in the textarea
  const lineCount = value.split('\n').length;
  const displayLines = Math.max(2, lineCount + 1); // Always show one extra line

  // NEW: map total minutes per your rules.
  // >10 && <20  -> 15
  // >25 && <35  -> 30
  // >=45 && <=65 -> 60
  // else -> raw duration (no split, no bucket)
function minutesToDurations(total: number): number[] {
  const out: number[] = [];
  if (!Number.isFinite(total) || total <= 0) return out;

  if (total > 10 && total < 20) {
    out.push(15);
  } else if (total > 25 && total < 35) {
    out.push(30);
  } else if (total >= 45 && total <= 65) {
    out.push(60);
  } else {
    // "rest should just be its own duration"
    out.push(total);
  }
  return out;
}

   // ========= NEW: Parse & strip duration from a single line =========
  // Handles:
  // - HH:MM (1:30, 0:45)
  // - "X and/&/adn (a) half" with hours variants (e.g., "1 adn hlf hrs")
  // - "H + M" combos (1 hr 15 min, 1h 30m)
  // - hours only (1h, 2 hr, 3 HROUS/huors/hrs/hour)
  // - minutes only (30m, 45 MIN, 30min/mins/minute/minutes)
  // - friendly words (1 hour, 30 minutes)

  
  function extractDurationAndCleanTitle(input: string): { totalMinutes: number; title: string } {
    let title = input;

     // Synonym groups (matched case-insensitively by /i):

    
    const H = '(?:h|hr|hrs|hour|hours|hrous|huors)';      
    
     // hours variants (incl. typos)

    
    const M = '(?:m|min|mins|minute|minutes)';              // minutes variants

    
    const AND = '(?:and|&|adn)';                        
    const HALF = '(?:half|hlf|hlaf)';                     

    let total = 0;

    // helper to consume all matches and remove them from title

    
    const consumeAll = (re: RegExp, toMinutes: (...groups: string[]) => number | null) => {
      title = title.replace(re, (...args) => {
        const groups = args.slice(1, -2); 
        
        // only capture groups

        
        const mins = toMinutes(...groups);
        if (mins && mins > 0) total += mins;
        return ''; 
        
        // strip matched chunk

        
      });
    };

    // 1) HH:MM

    
    consumeAll(/\b(\d{1,2}):([0-5]\d)\b/g, (h, m) => parseInt(h, 10) * 60 + parseInt(m, 10));

    // 2) X and/&/adn (a) half hours

    
    consumeAll(new RegExp(`\\b(\\d+)\\s*${AND}\\s*(?:a\\s*)?${HALF}\\s*${H}\\b`, 'gi'),
      (h) => parseInt(h, 10) * 60 + 30
    );

    // 3) H + M (e.g., "1 hr 15 min", "1h 30m")

    
    consumeAll(new RegExp(`\\b(\\d+)\\s*${H}\\s*(\\d+)\\s*${M}\\b`, 'gi'),
      (h, m) => parseInt(h, 10) * 60 + parseInt(m, 10)
    );

    // 4) Hours only

    
    consumeAll(new RegExp(`\\b(\\d+)\\s*${H}\\b`, 'gi'),
      (h) => parseInt(h, 10) * 60
    );

     // 5) Minutes only

    
    consumeAll(new RegExp(`\\b(\\d+)\\s*${M}\\b`, 'gi'),
      (m) => parseInt(m, 10)
    );

    // 6) Friendly words

    
    consumeAll(/\b(\d+)\s*hour(?:s)?\b/gi, (h) => parseInt(h, 10) * 60);
    consumeAll(/\b(\d+)\s*minute(?:s)?\b/gi, (m) => parseInt(m, 10));

     // Clean up extra spaces/punct left by removals

    
    title = title
      .replace(/\s{2,}/g, ' ')
      .replace(/^[\s•,;:.-]+|[\s•,;:.-]+$/g, '')
      .trim();

    return { totalMinutes: total, title };
  }

   // ========= CHANGED: addOne parses, strips, buckets, and splits if needed =========

  
  const addOne = useCallback((rawLine: string) => {
    const line = rawLine.trim();
    if (!line) return;

    const { totalMinutes, title: cleaned } = extractDurationAndCleanTitle(line);
    if (!cleaned) return; 
    
     // avoid adding empty titles

    

   if (totalMinutes > 0) {
  const durations = minutesToDurations(totalMinutes);
  if (durations.length > 0) {
    durations.forEach((d) => onAddTask(cleaned, d, 'today'));
    return;
  }
}


 // No duration parsed → let taskAI (edge) decide by omitting duration

    
onAddTask(cleaned, undefined, 'today');

  }, [onAddTask]);

  const handleSubmit = useCallback(() => {
   
    
     // split by newlines; keep each line as its own task set

    
    const lines = value.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    lines.forEach(addOne);
    setValue('');
  }, [value, addOne]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  
    
    // Submit on ⌘/Ctrl+Enter

    
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
      return;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          rows={displayLines}
          className={cn(
            "w-full rounded-md border-2 border-primary/30 bg-background px-3 py-2 text-base",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "focus:border-primary resize-none overflow-hidden",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
          placeholder="Add your tasks here..."
        />
      </div>

      <div className="mt-auto space-y-4 sticky bottom-0 bg-white pt-4">
        <Button 
          onClick={handleSubmit} 
          className="w-full px-6 py-3 h-auto text-base font-medium bg-primary"
          size="lg"
        >
          + Add Task
        </Button>
        
        <div className="text-sm text-muted-foreground bg-white p-2 rounded">
          ➕ Add multiple tasks at once<br/>
          ⏱ Specify time (e.g., 1hr, 30min, 30m)<br/>
          ⌘ Press Ctrl+Enter to input tasks<br/>
        </div>
      </div>
    </div>
  );
}
