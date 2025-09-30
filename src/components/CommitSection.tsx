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
  const totalCommittedHours =
    commitments.focusTime +
    commitments.sleep +
    commitments.nutrition +
    commitments.movement +
    commitments.downtime;

  const remainder = Math.max(0, 24 - totalCommittedHours);

  return (
    <div className="space-y-5">
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

      {/* 24h target preview bar */}
      <div className="space-y-2">
        <div className="relative w-full h-4 rounded-lg overflow-hidden bg-muted/30 ring-1 ring-border/50">
          <div className="flex w-full h-full">
            {/* Sleep (grey) */}
            <div
              className={`${COLORS.sleep.tint}`}
              style={{ width: `${pct(commitments.sleep)}%` }}
              title={`Sleep target: ${fmt(commitments.sleep)}`}
            />
            {/* Focus Time = deep tint (transparent) */}
            <div
              className={`${COLORS.deep.tint}`}
              style={{ width: `${pct(commitments.focusTime)}%` }}
              title={`Focus time target: ${fmt(commitments.focusTime)}`}
            />
            {/* Nutrition */}
            <div
              className={`${COLORS.nutrition.tint}`}
              style={{ width: `${pct(commitments.nutrition)}%` }}
              title={`Nutrition target: ${fmt(commitments.nutrition)}`}
            />
            {/* Movement */}
            <div
              className={`${COLORS.movement.tint}`}
              style={{ width: `${pct(commitments.movement)}%` }}
              title={`Movement target: ${fmt(commitments.movement)}`}
            />
            {/* Downtime */}
            <div
              className={`${COLORS.downtime.tint}`}
              style={{ width: `${pct(commitments.downtime)}%` }}
              title={`Downtime target: ${fmt(commitments.downtime)}`}
            />
            {/* Remainder */}
            <div
              className={`${COLORS.remainder.base}`}
              style={{ width: `${pct(remainder)}%` }}
              title={`Unallocated: ${fmt(remainder)}`}
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Planned: {fmt(totalCommittedHours)} • Remaining: {fmt(remainder)}
          </span>
          <div className="flex items-center gap-4">
            <LegendSwatch className="bg-zinc-400/40" label="Sleep" />
            <LegendSwatch className="bg-blue-500/25" label="Focus (deep) target" />
            <LegendSwatch className="bg-violet-500/25" label="Nutrition" />
            <LegendSwatch className="bg-emerald-500/25" label="Movement" />
            <LegendSwatch className="bg-sky-500/25" label="Downtime" />
          </div>
        </div>
      </div>
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
