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
    if (value >= 2 && value <= 4) return 'bg-green-600';
    if ((value >= 1 && value < 2) || (value > 4 && value <= 6)) return 'bg-orange-600';
    return 'bg-red-600';
  }
 
  
  if (type === 'Sleep') {
    if (value >= 7 && value <= 9) return 'bg-green-600';
    // NOTE: You may want (value >= 6 && value < 7) || (value > 9 && value <= 10) here.
    if ((value >= 6 && value < 7) || (value > 8 && value <= 9)) return 'bg-orange-600';
    return 'bg-red-600';
  }

  
  if (type === 'Movement') {
    if (value >= 0.5) return 'bg-green-600';
    return 'bg-red-600';
  }

  
  if (type === 'Nutrition') {
    if (value >= 1 && value <= 3) return 'bg-green-600';
    if (value > 3 && value < 5) return 'bg-orange-600'; // FIX: removed extra ')', adjusted threshold
    return 'bg-red-600';
  }

  
  if (type === 'Downtime') {
    if (value >= 1 && value <= 2) return 'bg-green-600';
    if (value > 2 && value <= 3) return 'bg-orange-600'; // FIX: added missing ')', defined upper bound
    return 'bg-red-600';
  }
  return 'bg-gray-600';
};



const getUnselectedColor =  (value: number, type: string) => {
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
      
   const endVal = start + idx * step; // first cell is start (0 for most, 4 for sleep)
const active = idx === selectedIdx;
const showLabel = active || Number.isInteger(endVal) ? String(endVal) : null;

return (
  <div
    key={idx}
   
    
    
className={cn(
  'h-6 w-6 flex items-center justify-center text-[11px] font-medium transition-colors cursor-pointer',
  'border-l-2', BORDER_COLOR,
  idx === segments - 1 && 'border-r-2',
  idx === segments - 1 && BORDER_COLOR,
  'rounded-none',
  active ? getRecommendationColor(endVal, name) : getUnselectedColor(endVal, name),
  active && 'font-bold'
)}


    
    onClick={() => onChange(endVal)}
  >
    {showLabel}
  </div>
);

      
      })}
    </div>
  );
};

const CommitSection: React.FC<CommitSectionProps> = ({ commitments, onUpdateCommitment }) => {
  return (
   
      <div className="space-y-2">
       


        {commitments.map((commitment) => {
  const startForBar = commitment.id === 'sleep' ? 4 : 0; // sleep starts at 4h; others at 0h
  const segments = Math.floor((commitment.max - startForBar) / commitment.step) + 1; // include first cell
  const selectedIdx = Math.max(0, Math.round((commitment.value - startForBar) / commitment.step));

  return (
    <div key={commitment.id} className="space-y-1"> {/* half the previous spacing */}
      <div className="flex items-baseline justify-between">
        <h3 className="font-medium text-gray-700">{commitment.name}</h3>
        <p className="text-sm text-gray-600 font-medium">
          {commitment.value} {commitment.unit}
        </p>
      </div>

      <SegmentedCommitBar
        segments={segments}
        step={commitment.step}
        start={startForBar}                  // CHANGED
        selectedIdx={selectedIdx}           // CHANGED
        onChange={(value) => onUpdateCommitment(commitment.id, value)}
        borderTone={commitment.borderTone}
        name={commitment.name}
      />
    </div>
  );
})}






        
      </div>
    
  );
};

export default CommitSection;