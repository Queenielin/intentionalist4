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

// helpers：把值「貼齊」你原本的步進（例如 0.5h / 1h），並做邊界保護
const snapTo = (val: number, base: number) =>
  Number((Math.round(val / base) * base).toFixed(2));
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const isInt = (v: number) => Math.abs(v - Math.round(v)) < 1e-6;

const FIXED_SEGMENTS = 12; // 一律 12 格



// 2) Add a bg tone helper (to color the "gaps" cleanly with the same tone):
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
  max?: number;
}> = ({ segments, step, start, selectedIdx, onChange, borderTone, name }) => {
  const BORDER_COLOR = getBorderColor(borderTone);
  const BG_TONE = getToneBg(borderTone);

  return (
    <div className={cn(
     'grid grid-cols-12 gap-px p-px rounded-sm overflow-hidden',
+       'ring-4',
+       BORDER_COLOR,
+       BG_TONE // gap color comes from container background
      
    )}>
      {Array.from({ length: segments }).map((_, idx) => {
      
   const endVal = Number((start + idx * step).toFixed(4)); // tame floats

      
const active = idx === selectedIdx;
const showLabel = active || Number.isInteger(endVal) ? String(endVal) : null;

return (
  <div
    key={idx}
   
    
    
className={cn(


 // No per-cell borders; equal-sized grid cells; box-border avoids layout weirdness
'h-6 w-full box-border flex items-center justify-center text-[11px] font-medium transition-colors cursor-pointer',
     'rounded-none',
  
  active ? getRecommendationColor(endVal, name) : getUnselectedColor(endVal, name),
  active && 'font-bold'
)}


    
  onClick={() => onChange(max !== undefined ? Math.min(endVal, max) : endVal)}
    
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
  
        
  
const startForBar = commitment.id === 'sleep' ? 4 : 0; // keep your sleep start at 4h
        
 const segments = FIXED_SEGMENTS; // always 12
// derive a dynamic step so 12 cells span start→max (12 points => 11 intervals)

        const derivedStep = (commitment.max - startForBar) / (segments - 1);
        
 const selectedIdx = Math.max(0, Math.min(
 segments - 1,
 Math.round((commitment.value - startForBar) / derivedStep)
));

        
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
      step={derivedStep}
        start={startForBar}                  // CHANGED
        selectedIdx={selectedIdx}           // CHANGED
        onChange={(value) => onUpdateCommitment(commitment.id, value)}
        borderTone={commitment.borderTone}
        name={commitment.name}
         max={commitment.max}
      />
    </div>
  );
})}






        
      </div>
    
  );
};

export default CommitSection;