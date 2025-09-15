import { Task } from '@/types/task';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Info } from 'lucide-react';
import { calculateWorkloadSummary, getWorkloadWarnings, PRODUCTIVITY_LIMITS } from '@/utils/taskAI';
import { cn } from '@/lib/utils';

interface WorkloadSummaryProps {
  tasks: Task[];
  day: 'today' | 'tomorrow';
}

export default function WorkloadSummary({ tasks, day }: WorkloadSummaryProps) {
  const dayTasks = tasks.filter(task => 
    day === 'today' ? !task.scheduledDay || task.scheduledDay === 'today' : task.scheduledDay === 'tomorrow'
  );
  
  const summary = calculateWorkloadSummary(dayTasks);
  const warnings = getWorkloadWarnings(summary);

  const getWorkTypeStatus = (workType: 'deep' | 'light', total: number) => {
    if (workType === 'deep') {
      if (total > PRODUCTIVITY_LIMITS.deep.ceiling) return 'error';
      if (total > PRODUCTIVITY_LIMITS.deep.trained.max) return 'warning';
      if (total >= PRODUCTIVITY_LIMITS.deep.trained.min) return 'good';
      return 'low';
    } else {
      if (total > PRODUCTIVITY_LIMITS.light.ceiling) return 'error';
      if (total >= PRODUCTIVITY_LIMITS.light.daily.min) return 'good';
      return 'low';
    }
  };

  const getTotalStatus = (total: number) => {
    if (total > PRODUCTIVITY_LIMITS.total.ceiling) return 'error';
    if (total >= PRODUCTIVITY_LIMITS.total.daily.min) return 'good';
    return 'low';
  };

  return (
    <Card className="p-4 space-y-4">
      <h4 className="font-semibold text-lg capitalize">{day} Summary</h4>
      
      {/* Work Type Summaries */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Deep Work</span>
            <Badge 
              variant={getWorkTypeStatus('deep', summary.deep.total) === 'error' ? 'destructive' : 
                     getWorkTypeStatus('deep', summary.deep.total) === 'warning' ? 'secondary' : 'default'}
              className={cn(
                getWorkTypeStatus('deep', summary.deep.total) === 'good' && 'bg-green-100 text-green-800'
              )}
            >
              {summary.deep.total.toFixed(1)}h
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            {summary.deep[60] > 0 && <div>60min: {summary.deep[60]} tasks</div>}
            {summary.deep[30] > 0 && <div>30min: {summary.deep[30]} tasks</div>}
            {summary.deep[15] > 0 && <div>15min: {summary.deep[15]} tasks</div>}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Light Work</span>
            <Badge 
              variant={getWorkTypeStatus('light', summary.light.total) === 'error' ? 'destructive' : 'default'}
              className={cn(
                getWorkTypeStatus('light', summary.light.total) === 'good' && 'bg-green-100 text-green-800'
              )}
            >
              {summary.light.total.toFixed(1)}h
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            {summary.light[60] > 0 && <div>60min: {summary.light[60]} tasks</div>}
            {summary.light[30] > 0 && <div>30min: {summary.light[30]} tasks</div>}
            {summary.light[15] > 0 && <div>15min: {summary.light[15]} tasks</div>}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Admin Work</span>
            <Badge variant="outline">
              {summary.admin.total.toFixed(1)}h
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            {summary.admin[60] > 0 && <div>60min: {summary.admin[60]} tasks</div>}
            {summary.admin[30] > 0 && <div>30min: {summary.admin[30]} tasks</div>}
            {summary.admin[15] > 0 && <div>15min: {summary.admin[15]} tasks</div>}
          </div>
        </div>
      </div>

      {/* Total Summary */}
      <div className="pt-2 border-t">
        <div className="flex items-center justify-between">
          <span className="font-medium">Total Workload</span>
          <Badge 
            variant={getTotalStatus(summary.grandTotal) === 'error' ? 'destructive' : 'default'}
            className={cn(
              getTotalStatus(summary.grandTotal) === 'good' && 'bg-green-100 text-green-800'
            )}
          >
            {summary.grandTotal.toFixed(1)}h / {PRODUCTIVITY_LIMITS.total.ceiling}h
          </Badge>
        </div>
      </div>

      {/* Research-based Guidelines */}
      <Alert className="mt-4">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>Research-based limits:</strong> Deep work 3-4h (max 5h), Light work 4-6h (max 6h), Total 5-7h (max 7h)
        </AlertDescription>
      </Alert>

      {/* Warnings */}
      {warnings.map((warning, index) => (
        <Alert key={index} variant={warning.severity === 'error' ? 'destructive' : 'default'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {warning.message}
          </AlertDescription>
        </Alert>
      ))}
    </Card>
  );
}