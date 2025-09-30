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
  lightDividerAt?: number; // draw a lighter divider after this index (between #lightDividerAt and #lightDividerAt+1)
}) {
  const selectedIdx = Math.max(-1, Math.round(value / step) - 1); // -1 => none

  return (
    <div className="mb-4">
      <h3 className="text-sm font-medium text-gray-700 mb-2">
        {title} {subtitle ? <span className="text-xs text-muted-foreground">{subtitle}</span> : null}
      </h3>

      <div className="inline-grid grid-flow-col auto-cols-[28px] gap-0 rounded-md shadow-sm overflow-hidden select-none">
        {Array.from({ length: segments }).map((_, idx) => {
          const h = (idx + 1) * step;    // hours at this square (end-value)
          const tone = colorForIndex(idx);
          const active = idx <= selectedIdx;

          const bg =
            tone === 'red'
              ? active ? 'bg-red-500'    : 'bg-red-100'
              : tone === 'orange'
              ? active ? 'bg-orange-500' : 'bg-orange-100'
              : active ? 'bg-green-600'  : 'bg-green-100';

          const fg = active
            ? 'text-white'
            : tone === 'red'
            ? 'text-red-700'
            : tone === 'orange'
            ? 'text-orange-700'
            : 'text-green-700';

          const divider =
            idx === 0
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
      {/* Focus Time: 0.5–8.0h (16 squares, 0.5h each) */}
      <SegmentedCommitBar
        title="Focus Time"
        subtitle="(deep work target)"
        value={commitments.focusTime}
        onChange={(h) => onUpdateCommitment('focusTime', h)}
        segments={16}
        step={0.5}
        // Colors:
        // 0.5–1.0h (idx 0–1): red
        // 1.5–2.0h (idx 2–3): orange
        // 2.5–5.0h (idx 4–9): green
        // 5.5–6.0h (idx 10–11): orange
        // 6.5–8.0h (idx 12–15): red
        colorForIndex={(idx) =>
          idx <= 1 ? 'red'
          : idx <= 3 ? 'orange'
          : idx <= 9 ? 'green'
          : idx <= 11 ? 'orange'
          : 'red'
        }
        // Labels at integers 1..8 → squares 2,4,6,8,10,12,14,16
        showLabelAtIndex={(idx) => (((idx + 1) * 0.5) % 1 === 0 ? String((idx + 1) * 0.5) : undefined)}
        lightDividerAt={1} // lighter line between 0.5h and 1.0h
      />

      {/* Sleep: 5.5–9.0h (8 squares, 0.5h each) */}
      <SegmentedCommitBar
        title="Sleep"
        subtitle="(recommended 7–9h)"
        value={commitments.sleep}
        onChange={(h) => onUpdateCommitment('sleep', h)}
        segments={8}
        step={0.5}
        // 5.5 (idx 0) and 6.0 (idx 1) => red, rest => green
        colorForIndex={(idx) => (idx <= 1 ? 'red' : 'green')}
        // labels at 7, 8, 9
        showLabelAtIndex={(idx) => {
          const val = 5.5 + (idx + 1) * 0.5; // 5.5,6.0,6.5,...,9.0
          return Number.isInteger(val) && val >= 7 ? String(val) : undefined;
        }}
      />

      {/* Nutrition: 0.5–3.0h (7 squares, 0.5h each) */}
      <SegmentedCommitBar
        title="Nutrition / Meals"
        subtitle="(recommended 1–3h)"
        value={commitments.nutrition}
        onChange={(h) => onUpdateCommitment('nutrition', h)}
        segments={7}
        step={0.5}
        // 0.5 => red (idx 0), 1.0 => orange (idx 1), 1.5–3.0 => green (idx 2+)
        colorForIndex={(idx) => (idx === 0 ? 'red' : idx === 1 ? 'orange' : 'green')}
        // labels at 1, 2, 3
        showLabelAtIndex={(idx) => {
          const val = 0.5 + (idx + 1) * 0.5; // 0.5..3.0
          return Number.isInteger(val) ? String(val) : undefined;
        }}
      />

      {/* Movement: 0.5–4.0h (8 squares, 0.5h each, all green) */}
      <SegmentedCommitBar
        title="Movement"
        subtitle="(0.5–4h)"
        value={commitments.movement}
        onChange={(h) => onUpdateCommitment('movement', h)}
        segments={8}
        step={0.5}
        colorForIndex={() => 'green'}
        // labels at 1, 2, 3, 4
        showLabelAtIndex={(idx) => {
          const val = (idx + 1) * 0.5;
          return Number.isInteger(val) ? String(val) : undefined;
        }}
      />

      {/* Downtime: 0.5–3.0h (6 squares, 0.5h each, all green) */}
      <SegmentedCommitBar
        title="Downtime"
        subtitle="(0.5–3h)"
        value={commitments.downtime}
        onChange={(h) => onUpdateCommitment('downtime', h)}
        segments={6}
        step={0.5}
        colorForIndex={() => 'green'}
        // no labels on halves; show 1, 2, 3 only
        showLabelAtIndex={(idx) => {
          const val = (idx + 1) * 0.5; // 0.5,1.0,1.5,2.0,2.5,3.0
          return Number.isInteger(val) ? String(val) : undefined;
        }}
      />
    </div>
  );
}
