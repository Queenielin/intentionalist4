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

const DEFAULT_COMMITMENTS = {
  focusTime: 4,
  sleep: 8,
  nutrition: 2,
  movement: 1,
  downtime: 1.5
};

const toneClasses = (tone: 'red' | 'orange' | 'green' | 'blue' | 'purple' | 'teal' | 'indigo', active: boolean) => {
  const bg = active
    ? tone === 'red'
      ? 'bg-red-500'
      : tone === 'orange'
      ? 'bg-orange-500'
      : tone === 'green'
      ? 'bg-green-600'
      : tone === 'blue'
      ? 'bg-blue-500'
      : tone === 'purple'
      ? 'bg-purple-500'
      : tone === 'teal'
      ? 'bg-teal-500'
      : 'bg-indigo-500'
    : tone === 'red'
    ? 'bg-red-100'
    : tone === 'orange'
    ? 'bg-orange-100'
    : tone === 'green'
    ? 'bg-green-100'
    : tone === 'blue'
    ? 'bg-blue-100'
    : tone === 'purple'
    ? 'bg-purple-100'
    : tone === 'teal'
    ? 'bg-teal-100'
    : 'bg-indigo-100';

  const fg = active
    ? 'text-white'
    : tone === 'red'
    ? 'text-red-700'
    : tone === 'orange'
    ? 'text-orange-700'
    : tone === 'green'
    ? 'text-green-700'
    : tone === 'blue'
    ? 'text-blue-700'
    : tone === 'purple'
    ? 'text-purple-700'
    : tone === 'teal'
    ? 'text-teal-700'
    : 'text-indigo-700';

  return `${bg} ${fg}`;
};

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
  defaultValue,
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
  defaultValue?: number;
  
}) {

// ADDED: show integers without .0; keep halves as .5
const formatHours = (h: number) => (Number.isInteger(h) ? String(h) : String(h));
// (If you later want '1.5h' etc., change to `${h}h`.)

  
// CHANGED: also fall back to defaultValue, then start
const basis = highlightValue ?? value ?? defaultValue ?? start; // <-- added "?? defaultValue ?? start"

  
  const selectedIdx = Math.max(-1, Math.round((basis - start) / step) - 1);
const defaultIdx = defaultValue !== undefined 
  ? Math.max(-1, Math.round((defaultValue - start) / step) - 1)
  : -1;

  
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
          const active = idx === selectedIdx;

          const baseDivider =
            idx === 0
              ? ''
              : idx === lightDividerAt
              ? 'border-l border-l-gray-200'
              : 'border-l border-l-gray-300';

          const label = labelsEnabled && showLabelAtIndex ? showLabelAtIndex(idx, endVal) : undefined;
          const tip = tipForEndVal ? tipForEndVal(endVal) : '';

          const Square = (
            <button
              key={idx}
              type="button"
              onClick={() => onChange(endVal)}
              className={cn(
                'relative h-6 w-6 flex items-center justify-center text-[11px] font-medium transition-colors',
                toneClasses(tone, active),
                baseDivider,
                active && 'font-bold',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-primary'
              )}
              aria-pressed={active}
            >
              {active ? (
                <span className="pointer-events-none select-none text-current">{formatHours(endVal)}</span>
              ) : label ? (
                <span className="pointer-events-none select-none text-current">{label}</span>
              ) : null}
            </button>
          );

          return tipForEndVal ? (
            <Tooltip key={idx}>
              <TooltipTrigger asChild>{Square}</TooltipTrigger>
              <TooltipContent side="top" sideOffset={6} className="max-w-xs text-xs leading-snug">
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
  value={value}
  highlightValue={bar1Val ?? null}
  labelsEnabled={true}
  onChange={(h) => {
    setBar1Val(h);
    setBar2Val(null);
    setBar3Val(null);
    onChange(h);
  }}
  segments={segments}
  step={step}
  start={start1}
  colorForIndex={colorBar1}
  showLabelAtIndex={fullHourLabel}
  lightDividerAt={1}
  tipForEndVal={tipFocus}   // ✅ add this line
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

// ADDED: DailyCommitmentBar (24 squares)
function DailyCommitmentBar({
  blocks,
}: {
  // blocks = array of allocations with color class and hours length
  // e.g., [{ key: 'sleep', hours: 8.5, color: 'green' }, ...]
  blocks: Array<{ key: string; hours: number; color: 'green' | 'orange' | 'red' }>;
}) {
  const totalCells = 24;
  // Build a flat array of 24 cells, each empty by default
  const cells: Array<{ filled: boolean; half: boolean; color?: 'green' | 'orange' | 'red' }> =
    Array.from({ length: totalCells }, () => ({ filled: false, half: false }));

  // Fill cells in order of blocks; you can change stacking logic later
  let cursor = 0;
  for (const b of blocks) {
    const whole = Math.floor(b.hours);
    const frac = b.hours - whole;

    for (let i = 0; i < whole && cursor < totalCells; i++, cursor++) {
      cells[cursor] = { filled: true, half: false, color: b.color };
    }
    if (frac >= 0.5 && cursor < totalCells) {
      cells[cursor] = { filled: true, half: true, color: b.color };
      cursor++;
    }
  }

  const toneToBg = (tone?: 'green' | 'orange' | 'red', half?: boolean) => {
    if (!tone) return 'bg-transparent';
    if (half) {
      // half-fill by overlaying a half-width inner bar; base keeps a light background of the same tone
      return tone === 'green'
        ? 'bg-green-200 relative after:absolute after:left-0 after:top-0 after:h-full after:w-1/2 after:bg-green-500'
        : tone === 'orange'
        ? 'bg-orange-200 relative after:absolute after:left-0 after:top-0 after:h-full after:w-1/2 after:bg-orange-500'
        : tone === 'red'
        ? 'bg-red-200 relative after:absolute after:left-0 after:top-0 after:h-full after:w-1/2 after:bg-red-500'
        : tone === 'blue'
        ? 'bg-blue-200 relative after:absolute after:left-0 after:top-0 after:h-full after:w-1/2 after:bg-blue-500'
        : tone === 'purple'
        ? 'bg-purple-200 relative after:absolute after:left-0 after:top-0 after:h-full after:w-1/2 after:bg-purple-500'
        : tone === 'teal'
        ? 'bg-teal-200 relative after:absolute after:left-0 after:top-0 after:h-full after:w-1/2 after:bg-teal-500'
        : 'bg-indigo-200 relative after:absolute after:left-0 after:top-0 after:h-full after:w-1/2 after:bg-indigo-500';
    }
    return tone === 'green'
      ? 'bg-green-500'
      : tone === 'orange'
      ? 'bg-orange-500'
      : tone === 'red'
      ? 'bg-red-500'
      : tone === 'blue'
      ? 'bg-blue-500'
      : tone === 'purple'
      ? 'bg-purple-500'
      : tone === 'teal'
}

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
        subtitle="(5.5–9h)"
        value={commitments.sleep}
        onChange={(h) => onUpdateCommitment('sleep', h)}
        segments={8}
        step={0.5}
        start={5.0} // 5.5, 6.0, ..., 9.0
        colorForIndex={(_idx, endVal) => (endVal <= 6 ? 'red' : endVal === 6.5 ? 'orange' : 'blue')}
        showLabelAtIndex={(_idx, endVal) => (Number.isInteger(endVal) ? String(endVal) : undefined)}
        tipForEndVal={tipSleep}
defaultValue={DEFAULT_COMMITMENTS.sleep} // <-- ADDED on the first Focus bar

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
        colorForIndex={(_idx, endVal) => (endVal === 0.5 ? 'red' : endVal === 1.0 ? 'orange' : 'purple')}
        showLabelAtIndex={(_idx, endVal) => (Number.isInteger(endVal) ? String(endVal) : undefined)}
        tipForEndVal={tipNutrition}
        defaultValue={DEFAULT_COMMITMENTS.nutrition} // <-- ADDED on the first Focus bar

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
        colorForIndex={() => 'teal'}
        showLabelAtIndex={(_idx, endVal) => (Number.isInteger(endVal) ? String(endVal) : undefined)}
        tipForEndVal={tipMovement}
        defaultValue={DEFAULT_COMMITMENTS.movement} // <-- ADDED on the first Focus bar

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
        colorForIndex={() => 'indigo'}
        showLabelAtIndex={(_idx, endVal) => (Number.isInteger(endVal) ? String(endVal) : undefined)}
        tipForEndVal={tipDowntime}
        defaultValue={DEFAULT_COMMITMENTS.downtime} // <-- ADDED on the first Focus bar

      />

      {/* ADDED: Daily Commitment (24 squares, same tones) */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Daily Commitment</h3>
        <DailyCommitmentBar
          blocks={[
            // CHANGED/CONFIG: map per-category to a tone you want to reuse
            { key: 'focusTime', hours: commitments.focusTime, color: 'orange' }, // e.g., focus = orange
            { key: 'sleep', hours: commitments.sleep, color: 'blue' },         // sleep = blue
            { key: 'nutrition', hours: commitments.nutrition, color: 'purple' }, // meals = purple
            { key: 'movement', hours: commitments.movement, color: 'teal' },   // movement = teal
            { key: 'downtime', hours: commitments.downtime, color: 'indigo' },     // downtime = indigo
          ]}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Uncommitted time shows as empty boxes.
        </p>
      </div>
    </div>
  );
}