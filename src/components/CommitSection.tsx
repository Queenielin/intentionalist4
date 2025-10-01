import React from 'react';
import { cn } from '@/lib/utils';

interface Commitment {
  id: string;
  name: string;
  value: number;
  max: number;
  step: number;
  unit: string;
  borderTone: 'blue' | 'cyan' | 'purple' | 'teal' | 'indigo';
}

interface CommitSectionProps {
  commitments: Commitment[];
  onUpdateCommitment: (id: string, value: number) => void;
}

const getBorderColor = (tone: string) => {
  switch (tone) {
    case 'blue': return 'border-blue-500';
    case 'cyan': return 'border-cyan-500';
    case 'purple': return 'border-purple-500';
    case 'teal': return 'border-teal-500';
    case 'indigo': return 'border-indigo-500';
    default: return 'border-blue-500';
  }
};

const getRecommendationColor = (value: number, type: string) => {
  if (type === 'Focus Time') {
    if (value >= 2 && value <= 4) return 'bg-green-300';
    if (value >= 1 && value < 2 || value > 4 && value <= 6) return 'bg-orange-300';
    return 'bg-red-300';
  }
  if (type === 'Sleep') {
    if (value >= 7 && value <= 9) return 'bg-green-300';
    if (value >= 6 && value < 7 || value > 9 && value <= 10) return 'bg-orange-300';
    return 'bg-red-300';
  }
  if (type === 'Movement') {
    if (value >= 1 && value <= 2) return 'bg-green-300';
    if (value >= 0.5 && value < 1 || value > 2 && value <= 3) return 'bg-orange-300';
    return 'bg-red-300';
  }
  if (type === 'Nutrition') {
    if (value >= 3 && value <= 5) return 'bg-green-300';
    if (value >= 2 && value < 3 || value > 5 && value <= 6) return 'bg-orange-300';
    return 'bg-red-300';
  }
  if (type === 'Downtime') {
    if (value >= 1 && value <= 3) return 'bg-green-300';
    if (value >= 0.5 && value < 1 || value > 3 && value <= 4) return 'bg-orange-300';
    return 'bg-red-300';
  }
  return 'bg-gray-300';
};

const getUnselectedColor = (value: number, type: string) => {
  if (type === 'Focus Time') {
    if (value >= 2 && value <= 4) return 'bg-green-200';
    if (value >= 1 && value < 2 || value > 4 && value <= 6) return 'bg-orange-200';
    return 'bg-red-200';
  }
  if (type === 'Sleep') {
    if (value >= 7 && value <= 9) return 'bg-green-200';
    if (value >= 6 && value < 7 || value > 9 && value <= 10) return 'bg-orange-200';
    return 'bg-red-200';
  }
  if (type === 'Movement') {
    if (value >= 1 && value <= 2) return 'bg-green-200';
    if (value >= 0.5 && value < 1 || value > 2 && value <= 3) return 'bg-orange-200';
    return 'bg-red-200';
  }
  if (type === 'Nutrition') {
    if (value >= 3 && value <= 5) return 'bg-green-200';
    if (value >= 2 && value < 3 || value > 5 && value <= 6) return 'bg-orange-200';
    return 'bg-red-200';
  }
  if (type === 'Downtime') {
    if (value >= 1 && value <= 3) return 'bg-green-200';
    if (value >= 0.5 && value < 1 || value > 3 && value <= 4) return 'bg-orange-200';
    return 'bg-red-200';
  }
  return 'bg-gray-200';
};

const SegmentedCommitBar: React.FC<{
  segments: number;
  step: number;
  start: number;
  selectedIdx: number;
  onChange: (value: number) => void;
  borderTone: 'blue' | 'cyan' | 'purple' | 'teal' | 'indigo';
  name: string;
}> = ({ segments, step, start, selectedIdx, onChange, borderTone, name }) => {
  const BORDER_COLOR = getBorderColor(borderTone);

  return (
    <div className={cn(
      'inline-grid grid-flow-col auto-cols-[1.5rem] gap-0 rounded-sm',
      'border-2', BORDER_COLOR
    )}>
      {Array.from({ length: segments }).map((_, idx) => {
        const endVal = start + (idx + 1) * step;
        const active = idx === selectedIdx;
        
        return (
          <div
            key={idx}
            className={cn(
              'h-6 w-6 flex items-center justify-center text-[11px] font-medium transition-colors cursor-pointer',
              'border-l-2', BORDER_COLOR,
              idx === segments - 1 && ['border-r', BORDER_COLOR],
              'rounded-none',
              active ? getRecommendationColor(endVal, name) : getUnselectedColor(endVal, name),
              active && 'font-bold'
            )}
            onClick={() => onChange(endVal)}
          >
            {endVal}
          </div>
        );
      })}
    </div>
  );
};

const CommitSection: React.FC<CommitSectionProps> = ({ commitments, onUpdateCommitment }) => {
  return (
   
      <div className="space-y-4">
        {commitments.map((commitment) => {
          const segments = commitment.max / commitment.step;
          const selectedIdx = Math.floor(commitment.value / commitment.step) - 1;
          
          return (
          
            
          // CHANGED: header row (title + hour), bar below
<div key={commitment.id} className="space-y-2">
  <div className="flex items-baseline justify-between">
    <h3 className="font-medium text-gray-700">{commitment.name}</h3>
    <p className="text-sm text-gray-600 font-medium">
      {commitment.value} {commitment.unit}
    </p>
  </div>

  <SegmentedCommitBar
    segments={segments}
    step={commitment.step}
    start={0}
    selectedIdx={selectedIdx}
    onChange={(value) => onUpdateCommitment(commitment.id, value)}
    borderTone={commitment.borderTone}
    name={commitment.name}
  />
</div>


    
  );
};

export default CommitSection;