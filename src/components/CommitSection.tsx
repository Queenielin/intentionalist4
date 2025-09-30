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

function tipFocus(endVal: number) {
  if (endVal >= 5.5) return '≥5.5h: fatigue risk; quality tends to drop after prolonged focus.';
  if (endVal >= 5.0) return '≈5h: near upper bound for most; plan breaks and recovery.';
  if (endVal >= 4.0) return '3–4h: sweet spot for sustained deep work for many.';
  if (endVal >= 2.0) return '2–3h: solid daily focus block; protect from interruptions.';
  return 'Build momentum with shorter blocks; aim toward 2–4h on key days.';
}

function tipSleep(endVal: number) {
  if (endVal >= 7 && endVal <= 9) return '7–9h supports memory, mood, reaction time, and long-term health.';
  if (endVal === 6.5) return '6.5h: borderline—many see dips in attention and impulse control.';
  if (endVal <= 6) return '≤6h: higher risk of cognitive impairment and errors; extend if possible.';
  return 'Approaching the 7–9h range improves recovery and learning.';
}

function tipNutrition(endVal: number) {
  if (endVal >= 1 && endVal <= 3) return '1–3h relaxed meals aid energy stability and reduce decision fatigue.';
  if (endVal === 1.0) return '≈1h: minimal mealtime—prioritize protein/fiber to avoid crashes.';
  if (endVal === 0.5) return '0.5h: rushed meals can worsen glycemic swings; add time if possible.';
  return 'Mindful, unhurried meals tend to support steadier energy.';
}

function tipMovement(endVal: number) {
  if (endVal === 0.5) return 'Even 30 minutes boosts mood and alertness—great start.';
  if (endVal >= 1 && endVal <= 4) return 'Regular movement supports mood, sleep, and cognition (≈150–300 min/week).';
  return 'Higher totals can work if intensity is moderate and recovery adequate.';
}

function tipDowntime(endVal: number) {
  if (endVal >= 1 && endVal <= 2) return '1–2h daily downtime helps stress offloading and sustained motivation.';
  if (endVal === 0.5) return 'Minimal downtime—brief decompression reduces stress carryover.';
  if (endVal > 2.5) return 'Extended downtime can restore well-being if it fits your day.';
  return 'Consistent recovery protects sleep and focus quality.';
}


function SegmentedCommitBar({
  title,
  subtitle,
  value,
  highlightValue,          // keeps your per-bar highlight logic
  labelsEnabled = true,
  onChange,
  segments,
  step = 0.5,
  start = 0,
  colorForIndex,
  showLabelAtIndex,
  lightDividerAt,
  disabled = false,
  tipForEndVal,            // ✅ NEW/RESTORED: per-square tooltip content
}: {
  title?: string;
  subtitle?: string;
  value: number;
  highlightValue?: number | null;
  labelsEnabled?: boolean;
  onChange: (h: number) => void;
  segments: number;
  step?: number;
  start?: number;
  colorForIndex: (idx: number, endVal: number) => 'red' | 'orange' | 'green';
  showLabelAtIndex?: (idx: number, endVal: number) => string | undefined;
  lightDividerAt?: number;
  disabled?: boolean;
  tipForEndVal?: (endVal: number) => string;  // ✅
}) {
  const basis = highlightValue ?? value;
  const selectedIdx = Math.max(-1, Math.round((basis - start) / step) - 1);

  return (
    <div className={cn('mb-2', disabled && 'opacity-50 pointer-events-none')}>
      {title ? (
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          {title} {subtitle ? <span className="text-xs text-muted-foreground">{subtitle}</span> : null}
        </h3>
      ) : null}

      <div className="inline-grid grid-flow-col auto-cols-[28px] gap-0 rounded-md shadow-sm overflow-hidden select-none">
        {Array.from({ length: segments }).map((_, idx) => {
          const endVal = start + (idx + 1) * step;
          const tone = colorForIndex(idx, endVal);
          const active = idx <= selectedIdx;

          const bg =
            tone === 'red'
              ? active ? 'bg-red-500' : 'bg-red-100'
              : tone === 'orange'
              ? active ? 'bg-orange-500' : 'bg-orange-100'
              : active ? 'bg-green-600' : 'bg-green-100';

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

         const label = labelsEnabled && showLabelAtIndex ? showLabelAtIndex(idx, endVal) : undefined;
const tip = tipForEndVal ? tipForEndVal(endVal) : ''; // no default hour text

const Square = (
  <button
    key={idx}
    type="button"
    onClick={() => onChange(endVal)}
    /* removed title attr to avoid native tooltip */
    className={cn(
      'relative h-8 w-7 flex items-center justify-center text-[11px] font-medium transition-colors',
      bg, fg, divider,
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-primary'
    )}
    aria-pressed={active}
  >
    {label ? (
      <span className="pointer-events-none select-none">{label}</span>
    ) : null}
  </button>
);

return tipForEndVal ? (
  <Tooltip key={idx}>
    <TooltipTrigger asChild>{Square}</TooltipTrigger>
    <TooltipContent side="top" sideOffset={6} className="max-w-xs text-xs leading-snug">
      {/* removed the endVal header; show only the tip text */}
      {tip}
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


function FocusTimeMultiBars({
  value,
  onChange,
}: {
  value: number;
  onChange: (h: number) => void;
}) {
  // Bar-specific selections (absolute end values)
  const [bar1Val, setBar1Val] = useState<number | null>(null); // e.g., 3.0
  const [bar2Val, setBar2Val] = useState<number | null>(null); // e.g., 4.0
  const [bar3Val, setBar3Val] = useState<number | null>(null); // e.g., 4.5

  const step = 0.5;
  const segments = 11;

  // Bar 1: 0.5 → 5.5
  const start1 = 0.0;

  // Bar 2 start depends on Bar 1 selection (no numbers before bar1 is picked)
  const start2 = bar1Val ?? null;

  // Bar 3 start depends on Bar 2 selection (no numbers before bar2 is picked)
  const start3 = bar2Val ?? null;

  // Colors:
  // Bar 1 special thresholds
  const colorBar1 = (_idx: number, endVal: number) => {
    if (endVal === 5.5) return 'red';
    if (endVal === 5.0 || endVal === 4.5) return 'orange';
    return 'green';
  };

  // Bar 2 & 3: "only squares beyond the 9th become orange"
  //   => squares 1..9 green, 10..11 orange
  const colorBarN = (idx: number) => (idx >= 9 ? 'orange' : 'green');

  // Labels only on full hours
  const fullHourLabel = (_idx: number, endVal: number) =>
    Number.isInteger(endVal) ? String(endVal) : undefined;

  return (
    <div className="space-y-2">
      {/* Bar 1 */}
      <SegmentedCommitBar
        title="Focus Time"
        subtitle="(deep work target)"
        value={value}                         // canonical (daily bar)
        highlightValue={bar1Val ?? null}      // ✅ highlight by bar1 selection only
        labelsEnabled={true}                  // labels visible
        onChange={(h) => {
          setBar1Val(h);
          setBar2Val(null);
          setBar3Val(null);
          onChange(h);                        // total becomes bar1 value
        }}
        segments={segments}
        step={step}
        start={start1}
        colorForIndex={colorBar1}
        showLabelAtIndex={fullHourLabel}
        lightDividerAt={1}
      />

      {/* Bar 2 (locked until bar1 is chosen) */}
      <SegmentedCommitBar
        value={value}
        highlightValue={bar2Val ?? null}      // ✅ highlight by bar2 selection only
        labelsEnabled={start2 != null}        // ✅ show numbers only after bar1 picked
        onChange={(h) => {
          if (start2 == null) return;
          setBar2Val(h);
          setBar3Val(null);
          onChange(h);                        // total becomes this absolute end value
        }}
        segments={segments}
        step={step}
        start={start2 ?? 0}
        colorForIndex={(idx) => colorBarN(idx)}
        showLabelAtIndex={fullHourLabel}
        disabled={start2 == null}
      />

      {/* Bar 3 (locked until bar2 is chosen) */}
      <SegmentedCommitBar
        value={value}
        highlightValue={bar3Val ?? null}      // ✅ highlight by bar3 selection only
        labelsEnabled={start3 != null}        // ✅ show numbers only after bar2 picked
        onChange={(h) => {
          if (start3 == null) return;
          setBar3Val(h);
          onChange(h);                        // total becomes this absolute end value
        }}
        segments={segments}
        step={step}
        start={start3 ?? 0}
        colorForIndex={(idx) => colorBarN(idx)}
        showLabelAtIndex={fullHourLabel}
        disabled={start3 == null}
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