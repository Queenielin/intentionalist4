import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

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

/* ---------- TIP HELPERS (content varies by bar & value) ---------- */

function tipFocus(endVal: number) {
  if (endVal >= 5.5) {
    return '≥5.5h deep work: high fatigue risk; quality/creativity often drop after prolonged focus.';
  }
  if (endVal >= 5.0) {
    return '≈5h is near the practical upper bound for most; schedule recovery and breaks.';
  }
  if (endVal >= 4.0) {
    return '3–4h: sweet spot for sustained deep work for many knowledge workers.';
  }
  if (endVal >= 2.0) {
    return '2–3h: solid daily focus block; consider protecting it from interruptions.';
  }
  return 'Short focus blocks help momentum; aim to build toward 2–4h on key days.';
}

function tipSleep(endVal: number) {
  if (endVal >= 7 && endVal <= 9) {
    return '7–9h supports memory, mood, reaction time, and long-term health.';
  }
  if (endVal === 6.5) {
    return '6.5h: borderline—many feel next-day dips in attention and impulse control.';
  }
  if (endVal <= 6) {
    return '≤6h: higher risk of cognitive impairment and error rates; extend if possible.';
  }
  return 'Approaching the recommended 7–9h range improves recovery and learning.';
}

function tipNutrition(endVal: number) {
  if (endVal >= 1 && endVal <= 3) {
    return '1–3h relaxed meal time aids energy stability and reduces decision fatigue.';
  }
  if (endVal === 1.0) {
    return '≈1h: minimum viable mealtime; plan protein/fiber to avoid crashes.';
  }
  if (endVal === 0.5) {
    return '0.5h: rushed meals can worsen glycemic swings; add time if you can.';
  }
  return 'More time for meals can help mindful eating and steadier energy.';
}

function tipMovement(endVal: number) {
  if (endVal >= 1 && endVal <= 4) {
    return 'Daily movement supports mood, sleep, and cognition (target 150–300 min/week).';
  }
  if (endVal === 0.5) {
    return 'Even 30 minutes improves mood and alertness—great start.';
  }
  return 'Higher totals can be fine if intensity is moderate and recovery is adequate.';
}

function tipDowntime(endVal: number) {
  if (endVal >= 1 && endVal <= 2) {
    return '1–2h daily downtime helps stress offloading and sustained motivation.';
  }
  if (endVal === 0.5) {
    return 'Minimal downtime—consider brief decompression to prevent stress carryover.';
  }
  if (endVal > 2.5) {
    return 'Extended downtime can be restorative if it doesn’t crowd out priorities.';
  }
  return 'Aim for consistent daily recovery to protect sleep and focus quality.';
}

/* ---------- GENERIC SEGMENTED BAR WITH TOOLTIP ---------- */

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
  tipForEndVal, // <-- function to supply tooltip string per square
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
  tipForEndVal?: (endVal: number) => string;
}) {
  const selectedIdx = Math.max(-1, Math.round((value - start) / step) - 1); // -1 => none

  return (
    <div className={cn('mb-2', disabled && 'opacity-50 pointer-events-none')}>
      {title ? (
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          {title}{' '}
          {subtitle ? <span className="text-xs text-muted-foreground">{subtitle}</span> : null}
        </h3>
      ) : null}

      <div className="inline-grid grid-flow-col auto-cols-[28px] gap-0 rounded-md shadow-sm overflow-hidden select-none">
        {Array.from({ length: segments }).map((_, idx) => {
          const endVal = start + (idx + 1) * step;
          const tone = colorForIndex(idx, endVal);
          const active = idx <= selectedIdx;

          const bg =
            tone === 'red'
              ? active
                ? 'bg-red-500'
                : 'bg-red-100'
              : tone === 'orange'
              ? active
                ? 'bg-orange-500'
                : 'bg-orange-100'
              : active
              ? 'bg-green-600'
              : 'bg-green-100';

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
              : idx === lightDividerAt
              ? 'border-l border-l-gray-200'
              : 'border-l border-l-gray-300';

          const label = showLabelAtIndex ? showLabelAtIndex(idx, endVal) : undefined;
          const tip = tipForEndVal ? tipForEndVal(endVal) : `${endVal} hours`;

          const Square = (
            <button
              key={idx}
              type="button"
              onClick={() => onChange(endVal)}
              className={cn(
                'relative h-8 w-7 flex items-center justify-center text-[11px] font-medium transition-colors',
                bg,
                fg,
                divider,
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-primary'
              )}
              aria-pressed={active}
            >
              {label ? <span className="pointer-events-none">{label}</span> : null}
            </button>
          );

          return tip ? (
            <Tooltip key={idx}>
              <TooltipTrigger asChild>{Square}</TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs leading-snug">
                <div className="font-medium mb-0.5">{endVal}h</div>
                <div>{tip}</div>
              </TooltipContent>
            </Tooltip>
          ) : (
            Square
          );
        })}
      </div>
    </div>
  );
}

/* ---------- FOCUS: 3 CHAINED BARS ---------- */

function FocusTimeMultiBars({
  value,
  onChange,
}: {
  value: number;
  onChange: (h: number) => void;
}) {
  const [firstPick, setFirstPick] = useState<number | null>(null);
  const [secondPick, setSecondPick] = useState<number | null>(null);

  const step = 0.5;
  const segments = 11;

  // Bar 1: 0.5 → 5.5
  const start1 = 0.0;
  const colorBar1 = (_idx: number, endVal: number) => {
    if (endVal === 5.5) return 'red';
    if (endVal === 5.0 || endVal === 4.5) return 'orange';
    return 'green';
  };

  // Bars 2 & 3: chained starts; 9th square orange, 11th red
  const start2 = firstPick ?? (value <= 5.5 ? value : null);
  const start3 = secondPick ?? (start2 != null ? value : null);
  const colorBarN = (idx: number) => (idx === 10 ? 'red' : idx === 8 ? 'orange' : 'green');

  const labelFullHours = (_idx: number, endVal: number) =>
    Number.isInteger(endVal) ? String(endVal) : undefined;

  return (
    <div className="space-y-2">
      <SegmentedCommitBar
        title="Focus Time"
        subtitle="(deep work target)"
        value={value}
        onChange={(h) => {
          setFirstPick(h);
          setSecondPick(null);
          onChange(h);
        }}
        segments={segments}
        step={step}
        start={start1}
        colorForIndex={colorBar1}
        showLabelAtIndex={labelFullHours}
        lightDividerAt={1}
        tipForEndVal={tipFocus}
      />

      <SegmentedCommitBar
        value={value}
        onChange={(h) => {
          if (start2 == null) return;
          setSecondPick(h);
          onChange(h);
        }}
        segments={segments}
        step={step}
        start={start2 ?? 0}
        colorForIndex={(idx) => colorBarN(idx)}
        showLabelAtIndex={labelFullHours}
        disabled={start2 == null}
        tipForEndVal={tipFocus}
      />

      <SegmentedCommitBar
        value={value}
        onChange={(h) => {
          if (start3 == null) return;
          onChange(h);
        }}
        segments={segments}
        step={step}
        start={start3 ?? 0}
        colorForIndex={(idx) => colorBarN(idx)}
        showLabelAtIndex={labelFullHours}
        disabled={start3 == null}
        tipForEndVal={tipFocus}
      />
    </div>
  );
}

/* ---------- MAIN COMPONENT ---------- */

export default function CommitSection({ commitments, onUpdateCommitment }: CommitSectionProps) {
  return (
    <div className="space-y-4">
      {/* Focus: 3 chained bars */}
      <FocusTimeMultiBars
        value={commitments.focusTime}
        onChange={(h) => onUpdateCommitment('focusTime', h)}
      />

      {/* Sleep: 5.5–9.0h */}
      <SegmentedCommitBar
        title="Sleep"
        subtitle="(recommended 7–9h)"
        value={commitments.sleep}
        onChange={(h) => onUpdateCommitment('sleep', h)}
        segments={8}
        step={0.5}
        start={5.0} // 5.5, 6.0, ..., 9.0
        colorForIndex={(_idx, endVal) =>
          endVal <= 6.0 ? 'red' : endVal === 6.5 ? 'orange' : 'green'
        }
        showLabelAtIndex={(_idx, endVal) => (Number.isInteger(endVal) ? String(endVal) : undefined)}
        tipForEndVal={tipSleep}
      />

      {/* Nutrition: 0.5–3.0h */}
      <SegmentedCommitBar
        title="Nutrition / Meals"
        subtitle="(recommended 1–3h)"
        value={commitments.nutrition}
        onChange={(h) => onUpdateCommitment('nutrition', h)}
        segments={7}
        step={0.5}
        start={0.0} // 0.5, 1.0, ..., 3.0
        colorForIndex={(_idx, endVal) => (endVal === 0.5 ? 'red' : endVal === 1.0 ? 'orange' : 'green')}
        showLabelAtIndex={(_idx, endVal) => (Number.isInteger(endVal) ? String(endVal) : undefined)}
        tipForEndVal={tipNutrition}
      />

      {/* Movement: 0.5–4.0h */}
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
        tipForEndVal={tipMovement}
      />

      {/* Downtime: 0.5–3.0h */}
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
        tipForEndVal={tipDowntime}
      />
    </div>
  );
}
