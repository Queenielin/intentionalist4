import React from 'react';
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

/** Generic segmented clickable bar (squares) */
function SegmentedCommitBar({
  title,
  subtitle,
  value,
  onChange,
  segments = 10,
  step = 0.5,
  colorForIndex,
  showLabelAtIndex,
  lightDividerAt,
}: {
  title: string;
  subtitle?: string;
  value: number;
  onChange: (h: number) => void;
  segments?: number;
  step?: number;
  colorForIndex: (idx: number) => 'red' | 'orange' | 'green';
  showLabelAtIndex?: (idx: number) => string | undefined;
  lightDividerAt?: number; // draw a lighter divider after this index (i.e., between #lightDividerAt and #lightDividerAt+1)
}) {
  const selectedIdx = Math.max(-1, Math.round(value / step) - 1); // -1 means nothing selected

  return (
    <div className="mb-4">
      <h3 className="text-sm font-medium text-gray-700 mb-2">
        {title} {subtitle ? <span className="text-xs text-muted-foreground">{subtitle}</span> : null}
      </h3>

      <div className="inline-grid grid-flow-col auto-cols-[28px] gap-0 rounded-md shadow-sm overflow-hidden select-none">
        {Array.from({ length: segments }).map((_, idx) => {
          const h = (idx + 1) * step;                   // hours represented by this square
          const tone = colorForIndex(idx);              // red | orange | green
          const active = idx <= selectedIdx;

          const bg = tone === 'red'
            ? (active ? 'bg-red-500'    : 'bg-red-100')
            : tone === 'orange'
            ? (active ? 'bg-orange-500' : 'bg-orange-100')
            : (active ? 'bg-green-600'  : 'bg-green-100');

          const fg = active ? 'text-white' : (
            tone === 'red' ? 'text-red-700' : tone === 'orange' ? 'text-orange-700' : 'text-green-700'
          );

          // borders between squares; lighter divider at requested boundary
          const divider = idx === 0
            ? '' 
            : (idx === lightDividerAt ? 'border-l border-l-gray-200' : 'border-l border-l-gray-300');

          const label = showLabelAtIndex ? showLabelAtIndex(idx) : undefined;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onChange(h)}
              title={`${h} hours`}
              className={cn(
                'relative h-8 w-7 flex items-center justify-center text-[11px] font-medium transition-colors',
                bg, fg, divider,
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-primary'
              )}
              aria-pressed={active}
            >
              {label ? <span className="pointer-events-none">{label}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CommitSection({ commitments, onUpdateCommitment }: CommitSectionProps) {
  return (
    <div className="space-y-4">
      {/* Focus Time: 0.5–5.0h (10 squares, 0.5h each) */}
      <SegmentedCommitBar
        title="Focus Time"
        subtitle="(deep work target)"
        value={commitments.focusTime}
        onChange={(h) => onUpdateCommitment('focusTime', h)}
        segments={10}
        step={0.5}
        // 0–1h = red (idx 0–1), 1–2h = orange (idx 2–3), ≥2h = green (idx 4–9)
        colorForIndex={(idx) => (idx <= 1 ? 'red' : idx <= 3 ? 'orange' : 'green')}
        // labels 1..5 on even squares (2,4,6,8,10)
        showLabelAtIndex={(idx) => {
          const hourAt = (idx + 1) * 0.5;
          return Number.isInteger(hourAt) ? String(hourAt) : undefined;
        }}
        lightDividerAt={1} // lighter line between first (0.5h) and second (1.0h)
      />

      {/* Sleep: 6.0–9.0h (7 squares, 0.5h each) */}
      <SegmentedCommitBar
        title="Sleep"
        subtitle="(recommended 7–9h)"
        value={commitments.sleep}
        onChange={(h) => onUpdateCommitment('sleep', h)}
        segments={7}
        step={0.5}
        // 6.0h (idx 0) = orange, 6.5–9.0h (idx 1–6) = green
        colorForIndex={(idx) => (idx === 0 ? 'orange' : 'green')}
        // labels at 7, 8, 9
        showLabelAtIndex={(idx) => {
          const hourAt = 6 + (idx + 1) * 0.5 - 0.5; // map idx 0..6 to 6.0..9.0
          const val = 6 + idx * 0.5; // actual start at each idx
          const display = val + 0.5; // center label on square
          const rounded = Math.round(display);
          return display === rounded ? String(rounded) : undefined;
        }}
      />

      {/* Nutrition: 1.0–3.0h (5 squares, 0.5h each, all green) */}
      <SegmentedCommitBar
        title="Nutrition / Meals"
        subtitle="(recommended 1–3h)"
        value={commitments.nutrition}
        onChange={(h) => onUpdateCommitment('nutrition', h)}
        segments={5}
        step={0.5}
        colorForIndex={() => 'green'}
        // labels at 1, 2, 3
        showLabelAtIndex={(idx) => {
          const hourAt = 1 + idx * 0.5 + 0.5; // 1.0..3.0 labels on integers
          return Number.isInteger(hourAt) ? String(hourAt) : undefined;
        }}
      />

      {/* Movement: 0.5–2.0h (4 squares, 0.5h each, all green) */}
      <SegmentedCommitBar
        title="Movement"
        subtitle="(0.5–2h)"
        value={commitments.movement}
        onChange={(h) => onUpdateCommitment('movement', h)}
        segments={4}
        step={0.5}
        colorForIndex={() => 'green'}
        // labels at 1, 2
        showLabelAtIndex={(idx) => {
          const hourAt = (idx + 1) * 0.5;
          return Number.isInteger(hourAt) ? String(hourAt) : undefined;
        }}
      />

      {/* Downtime: 1.0–2.5h (4 squares, 0.5h each, all green) */}
      <SegmentedCommitBar
        title="Downtime"
        subtitle="(1–2.5h)"
        value={commitments.downtime}
        onChange={(h) => onUpdateCommitment('downtime', h)}
        segments={4}
        step={0.5}
        colorForIndex={() => 'green'}
        // labels at 1, 1.5, 2, 2.5 (show 1,2 only if you prefer)
        showLabelAtIndex={(idx) => String((idx + 1) * 0.5 + 0.5)} // center-ish labels like 1,1.5,2,2.5
      />
    </div>
  );
}
