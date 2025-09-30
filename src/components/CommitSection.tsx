import React, { useState } from 'react';
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

/** Generic segmented clickable bar (squares) with baseline `start` and `step` */
function SegmentedCommitBar({
  title,
  subtitle,
  value,
  onChange,
  segments,
  step = 0.5,
  start = 0,
  colorForIndex,
  showLabelAtIndex,
  lightDividerAt,
  disabled = false,
}: {
  title?: string;
  subtitle?: string;
  value: number;
  onChange: (h: number) => void;
  segments: number;
  step?: number;
  start?: number;
  colorForIndex: (idx: number, endVal: number) => 'red' | 'orange' | 'green';
  showLabelAtIndex?: (idx: number, endVal: number) => string | undefined;
  lightDividerAt?: number;
  disabled?: boolean;
}) {
  // map value to selected index using the baseline
  const selectedIdx = Math.max(-1, Math.round((value - start) / step) - 1); // -1 => none

  return (
    <div className={cn("mb-2", disabled && "opacity-50 pointer-events-none")}>
      {title ? (
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          {title} {subtitle ? <span className="text-xs text-muted-foreground">{subtitle}</span> : null}
        </h3>
      ) : null}

      <div className="inline-grid grid-flow-col auto-cols-[28px] gap-0 rounded-md shadow-sm overflow-hidden select-none">
        {Array.from({ length: segments }).map((_, idx) => {
          // each square ends at this hour value
          const endVal = start + (idx + 1) * step;
          const tone = colorForIndex(idx, endVal);
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

          const label = showLabelAtIndex ? showLabelAtIndex(idx, endVal) : undefined;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onChange(endVal)}
              title={`${endVal} hours`}
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

/** Focus Time: 3 stacked bars with chained baselines and custom colors */
function FocusTimeMultiBars({
  value,
  onChange,
}: {
  value: number;
  onChange: (h: number) => void;
}) {
  // Keep local memory of where user clicked in bar1 and bar2 to derive baselines for the next bars.
  const [firstPick, setFirstPick] = useState<number | null>(null);
  const [secondPick, setSecondPick] = useState<number | null>(null);

  // Bar 1: baseline 0.0 → ends at 0.5, 1.0, ..., 5.5 (11 squares)
  const start1 = 0.0;
  const step = 0.5;
  const segments = 11;

  // Bar 2: baseline = firstPick (if set), otherwise use current `value` if within bar1 range; else null
  const start2 = firstPick ?? (value <= 5.5 ? value : null);
  // Bar 3: baseline = secondPick if set; else if start2 exists then use current value; else null
  const start3 = secondPick ?? (start2 != null ? value : null);

  // Color rules:
  // - Bar 1: 4.5 and 5.0 = orange; 5.5 = red; others = green
  const colorBar1 = (_idx: number, endVal: number) => {
    if (endVal === 5.5) return 'red';
    if (endVal === 5.0 || endVal === 4.5) return 'orange';
    return 'green';
  };

  // - Bar 2 & 3: 9th square (idx 8) = orange; 11th (idx 10) = red; others = green
  const colorBarN = (idx: number, _endVal: number) => {
    if (idx === 10) return 'red';     // last
    if (idx === 8) return 'orange';   // 9th square
    return 'green';
  };

  // Label rule: show only full hours (even squares relative to baseline)
  const labelFullHours = (_idx: number, endVal: number) =>
    Number.isInteger(endVal) ? String(endVal) : undefined;

  return (
    <div className="space-y-2">
      {/* Bar 1 */}
      <SegmentedCommitBar
        title="Focus Time"
        subtitle="(deep work target)"
        value={value}
        onChange={(h) => {
          setFirstPick(h);
          setSecondPick(null);
          onChange(h); // sets parent focusTime; daily bar updates
        }}
        segments={segments}
        step={step}
        start={start1}
        colorForIndex={colorBar1}
        showLabelAtIndex={labelFullHours}
        lightDividerAt={1} // lighter line between 0.5h and 1.0h
      />

      {/* Bar 2 */}
      <SegmentedCommitBar
        value={value}
        onChange={(h) => {
          if (start2 == null) return; // guard
          setSecondPick(h);
          onChange(h);
        }}
        segments={segments}
        step={step}
        start={start2 ?? 0}
        colorForIndex={colorBarN}
        showLabelAtIndex={labelFullHours}
        disabled={start2 == null}
      />

      {/* Bar 3 */}
      <SegmentedCommitBar
        value={value}
        onChange={(h) => {
          if (start3 == null) return;
          onChange(h);
        }}
        segments={segments}
        step={step}
        start={start3 ?? 0}
        colorForIndex={colorBarN}
        showLabelAtIndex={labelFullHours}
        disabled={start3 == null}
      />
    </div>
  );
}

/** === Main component === */
export default function CommitSection({ commitments, onUpdateCommitment }: CommitSectionProps) {
  return (
    <div className="space-y-4">
      {/* ✅ Focus Time: 3 chained bars */}
      <FocusTimeMultiBars
        value={commitments.focusTime}
        onChange={(h) => onUpdateCommitment('focusTime', h)}
      />

      {/* Sleep: 5.5–9.0h (8 squares, 0.5h each)
         Colors:
         - 5.5 and 6.0 => red
         - 6.5 => orange
         - 7.0..9.0 => green
         Labels: full hours only (6,7,8,9)
      */}
      <SegmentedCommitBar
        title="Sleep"
        subtitle="(recommended 7–9h)"
        value={commitments.sleep}
        onChange={(h) => onUpdateCommitment('sleep', h)}
        segments={8}
        step={0.5}
        start={5.0} // first square ends at 5.5, then 6.0, ...
        colorForIndex={(_idx, endVal) =>
          endVal <= 6.0 ? 'red' : endVal === 6.5 ? 'orange' : 'green'
        }
        showLabelAtIndex={(_idx, endVal) => (Number.isInteger(endVal) ? String(endVal) : undefined)}
      />

      {/* Nutrition: 0.5–3.0h (7 squares, 0.5h each)
         Colors:
         - 0.5 => red, 1.0 => orange, 1.5–3.0 => green
         Labels: 1,2,3
      */}
      <SegmentedCommitBar
        title="Nutrition / Meals"
        subtitle="(recommended 1–3h)"
        value={commitments.nutrition}
        onChange={(h) => onUpdateCommitment('nutrition', h)}
        segments={7}
        step={0.5}
        start={0.0}
        colorForIndex={(_idx, endVal) => (endVal === 0.5 ? 'red' : endVal === 1.0 ? 'orange' : 'green')}
        showLabelAtIndex={(_idx, endVal) => (Number.isInteger(endVal) ? String(endVal) : undefined)}
      />

      {/* Movement: 0.5–4.0h (8 squares, 0.5h each, all green). Labels: 1,2,3,4 */}
      <SegmentedCommitBar
        title="Movement"
        subtitle="(0.5–4h)"
        value={commitments.movement}
        onChange={(h) => onUpdateCommitment('movement', h)}
        segments={8}
        step={0.5}
        start={0.0}
        colorForIndex={() => 'green'}
        showLabelAtIndex={(_idx, endVal) => (Number.isInteger(endVal) ? String(endVal) : undefined)}
      />

      {/* Downtime: 0.5–3.0h (6 squares, 0.5h each, green). Labels only on 1,2,3 */}
      <SegmentedCommitBar
        title="Downtime"
        subtitle="(0.5–3h)"
        value={commitments.downtime}
        onChange={(h) => onUpdateCommitment('downtime', h)}
        segments={6}
        step={0.5}
        start={0.0}
        colorForIndex={() => 'green'}
        showLabelAtIndex={(_idx, endVal) => (Number.isInteger(endVal) ? String(endVal) : undefined)}
      />
    </div>
  );
}
