import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Commitments {
  focusTime: number;
  sleep: number;
  nutrition: number;
  movement: number;
  downtime: number;
}

interface CommitSectionProps {
  commitments: Commitments;
  onUpdateCommitment: (
    type: 'focusTime' | 'sleep' | 'nutrition' | 'movement' | 'downtime',
    hours: number
  ) => void;
}

const COLORS = {
  // Deep work color family
  deep: { base: 'bg-blue-500', tint: 'bg-blue-500/25' }, // focus time uses tint
  sleep: { tint: 'bg-zinc-400/40' },
  nutrition: { tint: 'bg-violet-500/25' },
  movement: { tint: 'bg-emerald-500/25' },
  downtime: { tint: 'bg-sky-500/25' },
  remainder: { base: 'bg-muted/40' },
};

const pct = (h: number) => Math.max(0, Math.min(100, (h / 24) * 100));
const fmt = (h: number) => (Number.isInteger(h) ? `${h}h` : `${h}h`);

export default function CommitSection({ commitments, onUpdateCommitment }: CommitSectionProps) {
  /** OPTIONS **/
  const focusTimeOptions = [
    // keep your traffic-light intent; you asked for buttons, not ranges here
    { hours: 1, color: 'red' },
    { hours: 2, color: 'orange' },
    { hours: 3, color: 'green' },
    { hours: 4, color: 'green' },
    { hours: 5, color: 'green' },
  ];

  const sleepOptions = [
    { hours: 6, color: 'red' },
    { hours: 7, color: 'green' },
    { hours: 7.5, color: 'green' },
    { hours: 8, color: 'green' },
    { hours: 8.5, color: 'green' },
    { hours: 9, color: 'green' },
  ];

  const nutritionOptions = [
    { hours: 1, color: 'green' },
    { hours: 1.5, color: 'green' },
    { hours: 2, color: 'green' },
    { hours: 2.5, color: 'green' },
    { hours: 3, color: 'green' },
  ];

  const movementOptions = [
    { hours: 0.5, color: 'green' },
    { hours: 1, color: 'green' },
    { hours: 1.5, color: 'green' },
    { hours: 2, color: 'green' },
  ];

  const downtimeOptions = [
    { hours: 1, color: 'green' },
    { hours: 1.5, color: 'green' },
    { hours: 2, color: 'green' },
  ];

  /** STYLES **/
  const getButtonClass = (color: string, isSelected: boolean) => {
    const baseClass = 'h-8 px-3 text-sm font-medium transition-all duration-200 rounded-md';
    if (isSelected) {
      switch (color) {
        case 'green':
          return cn(baseClass, 'bg-green-600 text-white border-green-600 shadow-md');
        case 'orange':
          return cn(baseClass, 'bg-orange-500 text-white border-orange-500 shadow-md');
        case 'red':
          return cn(baseClass, 'bg-red-500 text-white border-red-500 shadow-md');
        default:
          return cn(baseClass, 'bg-gray-200 text-gray-700');
      }
    }
    switch (color) {
      case 'green':
        return cn(baseClass, 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200');
      case 'orange':
        return cn(baseClass, 'bg-orange-100 text-orange-700 border border-orange-300 hover:bg-orange-200');
      case 'red':
        return cn(baseClass, 'bg-red-100 text-red-700 border border-red-300 hover:bg-red-200');
      default:
        return cn(baseClass, 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200');
    }
  };

  /** BAR DATA **/
  return (
    <div className="space-y-4">
      {/* Focus Time */}
      <Section
        title="Focus Time"
        subtitle="(deep work target)"
        options={focusTimeOptions}
        selected={commitments.focusTime}
        onClick={(h) => onUpdateCommitment('focusTime', commitments.focusTime === h ? 0 : h)}
        getButtonClass={getButtonClass}
      />

      {/* Sleep */}
      <Section
        title="Sleep"
        subtitle="(recommended 7–9h)"
        options={sleepOptions}
        selected={commitments.sleep}
        onClick={(h) => onUpdateCommitment('sleep', commitments.sleep === h ? 0 : h)}
        getButtonClass={getButtonClass}
      />

      {/* Nutrition */}
      <Section
        title="Nutrition / Meals"
        subtitle="(recommended 1–3h)"
        options={nutritionOptions}
        selected={commitments.nutrition}
        onClick={(h) => onUpdateCommitment('nutrition', commitments.nutrition === h ? 0 : h)}
        getButtonClass={getButtonClass}
      />

      {/* Movement */}
      <Section
        title="Movement"
        subtitle="(0.5–2h)"
        options={movementOptions}
        selected={commitments.movement}
        onClick={(h) => onUpdateCommitment('movement', commitments.movement === h ? 0 : h)}
        getButtonClass={getButtonClass}
      />

      {/* Downtime */}
      <Section
        title="Downtime"
        subtitle="(1–2h)"
        options={downtimeOptions}
        selected={commitments.downtime}
        onClick={(h) => onUpdateCommitment('downtime', commitments.downtime === h ? 0 : h)}
        getButtonClass={getButtonClass}
      />
    </div>
  );
}

/** Small section helper */
function Section({
  title,
  subtitle,
  options,
  selected,
  onClick,
  getButtonClass,
}: {
  title: string;
  subtitle?: string;
  options: Array<{ hours: number; color: 'green' | 'orange' | 'red' }>;
  selected: number;
  onClick: (h: number) => void;
  getButtonClass: (color: string, isSelected: boolean) => string;
}) {
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 mb-2">
        {title} <span className="text-xs text-muted-foreground">{subtitle}</span>
      </h3>
      <div className="flex flex-wrap gap-2">
        {options.map(({ hours, color }) => (
          <Button
            key={`${title}-${hours}`}
            variant="outline"
            size="sm"
            className={getButtonClass(color, selected === hours)}
            onClick={() => onClick(hours)}
          >
            {Number.isInteger(hours) ? `${hours}h` : `${hours}h`}
          </Button>
        ))}
      </div>
    </div>
  );
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn('inline-block w-3 h-3 rounded', className)} />
      <span>{label}</span>
    </div>
  );
}
