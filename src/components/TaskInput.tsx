// src/components/TaskInput.tsx
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface TaskInputProps {
  onAddTask: (title: string, duration?: 15 | 30 | 60, scheduledDay?: 'today' | 'tomorrow') => void;
}


export default function TaskInput({ onAddTask }: TaskInputProps) {
  const [value, setValue] = useState('');

  // ========= NEW: Bucketing rules per your spec =========
  //  >=1 & <20  -> 15
  //  >=20 & <=40 -> 30
  //  >=41 & <=70 -> 60
  //  >70 -> break into multiple 60s; remainder mapped by same rules
  function minutesToBuckets(total: number): Array<15 | 30 | 60> {
    const buckets: Array<15 | 30 | 60> = [];
    if (!Number.isFinite(total) || total <= 0) return buckets;

    // peel off 60s while strictly above 70
    while (total > 70) {
      buckets.push(60);
      total -= 60;
    }

    // remainder mapping
    if (total >= 41 && total <= 70) {
      buckets.push(60);
    } else if (total >= 20 && total <= 40) {
      buckets.push(30);
    } else if (total >= 1 && total < 20) {
      buckets.push(15);
    }
    // total <= 0 -> nothing

    return buckets;
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
    const H = '(?:h|hr|hrs|hour|hours|hrous|huors)';        // hours variants (incl. typos)
    const M = '(?:m|min|mins|minute|minutes)';              // minutes variants
    const AND = '(?:and|&|adn)';                            // and/&/adn
    const HALF = '(?:half|hlf|hlaf)';                       // half/hlf/hlaf

    let total = 0;

    // helper to consume all matches and remove them from title
    const consumeAll = (re: RegExp, toMinutes: (...groups: string[]) => number | null) => {
      title = title.replace(re, (...args) => {
        const groups = args.slice(1, -2); // only capture groups
        const mins = toMinutes(...groups);
        if (mins && mins > 0) total += mins;
        return ''; // strip matched chunk
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
    if (!cleaned) return; // avoid adding empty titles

    if (totalMinutes > 0) {
      const buckets = minutesToBuckets(totalMinutes);
      if (buckets.length > 0) {
        // same cleaned title + same scheduled day ("today") for all
        buckets.forEach((b) => onAddTask(cleaned, b, 'today'));
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
    <div className="space-y-4">
      <div>
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          className="resize-none border-2 border-primary/30 focus:border-primary text-base min-h-[60px]"
          placeholder="Add your tasks here..."
        />
      </div>

      <Button 
        onClick={handleSubmit} 
        className="w-full px-6 py-3 h-auto text-base font-medium"
        size="lg"
      >
        + Add Task
      </Button>
      
      <div className="text-sm text-muted-foreground">
        ➕ Add multiple tasks at once<br/>
        ⏱ Specify time (e.g., 1hr, 30min, 30m)<br/>
        ⌘ Press Ctrl+Enter to input tasks<br/>
      </div>
    </div>
  );
}
