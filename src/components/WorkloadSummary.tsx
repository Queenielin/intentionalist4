import { Card } from '@/components/ui/card';
import { Task, CATEGORY_TO_BUCKET } from '@/types/task';
import { AlertCircle, BarChart2 } from 'lucide-react';

interface WorkloadSummaryProps {
  tasks: Task[];
}

// Simple limits you described (hours)
const PRODUCTIVITY_LIMITS = {
  deep: { beginner: { min: 1, max: 2 }, trained: { min: 3, max: 4 }, ceiling: 5 },
  light: { daily: { min: 4, max: 6 }, ceiling: 6 },
  total: { daily: { min: 5, max: 7 }, ceiling: 7 },
};

export default function WorkloadSummary({ tasks }: WorkloadSummaryProps) {
  // Only count incomplete tasks
  const open = tasks.filter(t => !t.completed && t.duration);

  // accumulate minutes by bucket
  const mins = { deep: 0, light: 0, admin: 0, total: 0 };
  for (const t of open) {
    // category may be temporarily undefined while AI runs; skip those until categorized
    if (!t.category) continue;
    const bucket = CATEGORY_TO_BUCKET[t.category];
    mins[bucket] += t.duration;
    mins.total += t.duration;
  }

  const hours = {
    deep: +(mins.deep / 60).toFixed(1),
    light: +(mins.light / 60).toFixed(1),
    admin: +(mins.admin / 60).toFixed(1),
    total: +(mins.total / 60).toFixed(1),
  };

  const warnings: Array<{ type: 'deep' | 'light' | 'total'; message: string; severity: 'warning' | 'error' }> = [];

  // Deep warnings
  if (hours.deep > PRODUCTIVITY_LIMITS.deep.ceiling) {
    warnings.push({ type: 'deep', message: `Deep: ${hours.deep}h exceeds ceiling (${PRODUCTIVITY_LIMITS.deep.ceiling}h)`, severity: 'error' });
  } else if (hours.deep > PRODUCTIVITY_LIMITS.deep.trained.max) {
    warnings.push({ type: 'deep', message: `Deep: ${hours.deep}h exceeds trained limit (${PRODUCTIVITY_LIMITS.deep.trained.max}h)`, severity: 'warning' });
  }

  // Light warnings
  if (hours.light > PRODUCTIVITY_LIMITS.light.ceiling) {
    warnings.push({ type: 'light', message: `Light: ${hours.light}h exceeds ceiling (${PRODUCTIVITY_LIMITS.light.ceiling}h)`, severity: 'error' });
  }

  // Total warnings
  if (hours.total > PRODUCTIVITY_LIMITS.total.ceiling) {
    warnings.push({ type: 'total', message: `Total: ${hours.total}h exceeds daily ceiling (${PRODUCTIVITY_LIMITS.total.ceiling}h)`, severity: 'error' });
  }

  return (
    <Card className="p-4 bg-muted/30 border-0 space-y-3">
      <div className="flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-primary" />
        <h4 className="text-sm font-semibold">Workload Summary (open tasks)</h4>
      </div>

      <div className="grid grid-cols-4 gap-3 text-sm">
        <div className="rounded-md p-3 bg-background/40">
          <div className="text-xs text-muted-foreground">Deep</div>
          <div className="text-lg font-semibold">{hours.deep}h</div>
        </div>
        <div className="rounded-md p-3 bg-background/40">
          <div className="text-xs text-muted-foreground">Light</div>
          <div className="text-lg font-semibold">{hours.light}h</div>
        </div>
        <div className="rounded-md p-3 bg-background/40">
          <div className="text-xs text-muted-foreground">Admin</div>
          <div className="text-lg font-semibold">{hours.admin}h</div>
        </div>
        <div className="rounded-md p-3 bg-background/40">
          <div className="text-xs text-muted-foreground">Total</div>
          <div className="text-lg font-semibold">{hours.total}h</div>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 text-xs px-3 py-2 rounded-md ${
                w.severity === 'error' ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-700'
              }`}
            >
              <AlertCircle className="w-3 h-3" />
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
