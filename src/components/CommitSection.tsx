import React from 'react';
import { cn } from '@/lib/utils';

interface Commitment {
  id: string;
  name: string;
  value: number;
  max: number;
  step: number; // allowed step (e.g., 0.5, 1)
  unit: string;
  borderTone: 'blue' | 'cyan' | 'purple' | 'teal' | 'indigo';
}

interface CommitSectionProps {
  commitments: Commitment[];
  onUpdateCommitment: (id: string, value: number) => void;
}

/* ---------- helpers ---------- */

const snapTo = (val: number, base: number) =>
  Number((Math.round(val / base) * base).toFixed(2));
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const isInt = (v: number) => Math.abs(v - Math.round(v)) < 1e-6;

const FIXED_SEGMENTS = 12;

const getToneBg = (tone: string) => {
  switch (tone) {
    case 'blue': return 'bg-blue-500';
    case 'cyan': return 'bg-cyan-500';
    case 'purple': return 'bg-purple-500';
    case 'teal': return 'bg-teal-500';
    case 'indigo': return 'bg-indigo-500';
    default: return 'bg-blue-500';
  }
};

const getBorderColor = (tone: string) => {
  switch (tone) {
    case 'blue': return 'ring-blue-500';
    case 'cyan': return 'ring-cyan-500';
    case 'purple': return 'ring-purple-500';
    case 'teal': return 'ring-teal-500';
    case 'indigo': return 'ring-indigo-500';
    default: return 'ring-blue-500';
  }
};

/* ---------- colors for cells ---------- */

const getRecommendationColor = (value: number, type: string) => {
  if (type === 'Focus Time') {
    if (value >= 2 && value <= 4) return 'bg-green-600';
    if ((value >= 1 && value < 2) || (value > 4 && value <= 6)) return 'bg-orange-600';
    return 'bg-red-600';
  }

  if (type === 'Sleep') {
    if (value >= 7 && value <= 9) return 'bg-green-600';
    if ((value >= 6 && value < 7) || (value > 8 && value <= 9)) return 'bg-orange-600';
    return 'bg-red-600';
  }

  if (type === 'Movement') {
    if (value >= 0.5) return 'bg-green-600';
    return 'bg-red-600';
  }

  if (type === 'Nutrition') {
    if (value >= 1 && value <= 3) return 'bg-green-600';
    if (value > 3 && value < 5) return 'bg-orange-600';
    return 'bg-red-600';
  }

  if (type === 'Downtime') {
    if (value >= 1 && value <= 2) return 'bg-green-600';
    if (value > 2 && value <= 3) return 'bg-orange-600';
    return 'bg-red-600';
  }

  return 'bg-gray-600';
};

const getUnselectedColor = (value: number, type: string) => {
  if (type === 'Focus Time') {
    if (value >= 2 && value <= 4) return 'bg-green-200';
    if ((value >= 1 && value < 2) || (value > 4 && value <= 6)) return 'bg-orange-200';
    return 'bg-red-200';
  }

  if (type === 'Sleep') {
    if (value >= 7 && value <= 9) return 'bg-green-200';
    if ((value >= 6 && value < 7) || (value > 8 && value <= 9)) return 'bg-orange-200';
    return 'bg-red-200';
  }

  if (type === 'Movement') {
    if (value >= 0.5) return 'bg-green-200';
    return 'bg-red-200';
  }

  if (type === 'Nutrition') {
    if (value >= 1 && value <= 3) return 'bg-green-200';
    if (value > 3 && value < 5) return 'bg-orange-200';
    return 'bg-red-200';
  }

  if (type === 'Downtime') {
    if (value >= 1 && value <= 2) return 'bg-green-200';
    if (value > 2 && value <= 3) return 'bg-orange-200';
    return 'bg-red-200';
  }

  return 'bg-gray-200';
};

/* ---------- segmented bar ---------- */


const CELL_STEP = 0.5; // each cell = 0.5 hr

type Tone = 'blue' | 'cyan' | 'purple' | 'teal' | 'indigo';

const SegmentedCommitBar: React.FC<{
  start: number;          // e.g., sleep=4, others=0
  max: number;            // e.g., 6 or 10
  allowedStep: number;    // original step (0.5 / 1)
  selectedIdx: number;    // which cell is active
  onChange: (value: number) => void;
  borderTone: Tone;
  name: string;
}> = ({ start, max, allowedStep, selectedIdx, onChange, borderTone, name }) => {
  const toneRing = getBorderColor(borderTone); // returns ring-*
  const toneBg = getToneBg(borderTone);        // returns bg-*

  return (
    <div
      className={cn(
        'grid grid-cols-12 gap-px p-px rounded-sm overflow-hidden',
        'ring-2', toneRing,
        toneBg
      )}
    >
      {Array.from({ length: FIXED_SEGMENTS }).map((_, idx) => {
        // Map index -> raw value in 0.5h steps, but force last cell to max
        let raw = start + idx * CELL_STEP;
        if (idx === FIXED_SEGMENTS - 1) raw = max;

        const snappedVal = clamp(snapTo(raw, allowedStep), start, max);
        const active = idx === selectedIdx;

        // Label at endpoints and whole hours (including the max on last cell)
        const showLabel =
          idx === 0 || idx === FIXED_SEGMENTS - 1 || isInt(snappedVal)
            ? String(Math.round(snappedVal))
            : null;

        return (
          <div
            key={idx}
            className={cn(
              'h-6 w-full box-border flex items-center justify-center text-[11px] font-medium cursor-pointer transition-colors',
              active ? getRecommendationColor(snappedVal, name) : getUnselectedColor(snappedVal, name),
              active && 'font-bold'
            )}
            onClick={() => onChange(snappedVal)}
            title={`${snappedVal}h`}
          >
            {showLabel}
          </div>
        );
      })}
    </div>
  );
};

/* ---------- main section ---------- */

const CommitSection: React.FC<CommitSectionProps> = ({ commitments, onUpdateCommitment }) => {
  return (
    <div className="space-y-2">
   
/* ---------- inside CommitSection map ---------- */

{commitments.map((c) => {
  const startForBar = c.id === 'sleep' ? 4 : 0;

  // map current value -> cell index:
  // - values < max use 0.5h spacing
  // - exactly max sits on the last cell
  const idxFromValue = (v: number) => {
    if (v >= c.max) return FIXED_SEGMENTS - 1;                  // last cell for max
    const i = Math.round((v - startForBar) / CELL_STEP);        // 0.5h steps
    return Math.max(0, Math.min(FIXED_SEGMENTS - 2, i));        // reserve last for max
  };

  const selectedIdx = idxFromValue(c.value);

  return (
    <div key={c.id} className="space-y-1">
      <div className="flex items-baseline justify-between">
        <h3 className="font-medium text-gray-700">{c.name}</h3>
        <p className="text-sm text-gray-600 font-medium">{c.value} {c.unit}</p>
      </div>

      <SegmentedCommitBar
        start={startForBar}
        max={c.max}
        allowedStep={c.step}
        selectedIdx={selectedIdx}
        onChange={(v) => onUpdateCommitment(c.id, v)}
        borderTone={c.borderTone}
        name={c.name}
      />
    </div>
  );
})}


      
    </div>
  );
};

export default CommitSection;
