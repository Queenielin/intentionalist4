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

const snapTo = (val: number, base: number) =>
  Number((Math.round(val / base) * base).toFixed(2));
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const isInt = (v: number) => Math.abs(v - Math.round(v)) < 1e-6;

const FIXED_SEGMENTS = 12; 


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


// SegmentedCommitBar：12 格只管「顯示位置」；真正回傳的值一律貼齊 allowedStep
const SegmentedCommitBar: React.FC<{
  segments: number;            // 固定 12
  start: number;               // 例：sleep=4，其它=0
  max: number;                 // 例：focus=6, sleep=10...
  allowedStep: number;         // 你原本的步進（0.5 或 1）
  selectedIdx: number;         // 用當前值換算成的格索引
  onChange: (value: number) => void;
  borderTone: 'blue' | 'cyan' | 'purple' | 'teal' | 'indigo';
  name: string;
}> = ({ segments, start, max, allowedStep, selectedIdx, onChange, borderTone, name }) => {
  const BORDER_COLOR = getBorderColor(borderTone);
  const BG_TONE = getToneBg(borderTone); // 和你的 tone 對上（可沿用前面提供的 getToneBg）

  return (
    <div className={cn(
      'grid grid-cols-12 gap-px p-px rounded-sm overflow-hidden',
      'ring-2', BORDER_COLOR, BG_TONE
    )}>
      {Array.from({ length: segments }).map((_, idx) => {
        // 這格在 0~1 的位置（0=左端，1=右端）
        const t = segments === 1 ? 0 : idx / (segments - 1);
        // 把 t 投影到實際範圍，再「貼齊」原步進
        const valRaw = start + t * (max - start);
        const snappedVal = clamp(snapTo(valRaw, allowedStep), start, max);

        const active = idx === selectedIdx;
        const showLabel = (idx === 0 || idx === segments - 1 || isInt(snappedVal))
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


// CommitSection：索引用「當前值」反推到 12 格的位置（不改你的值），sleep 從 4 開始
{commitments.map((c) => {
  const startForBar = c.id === 'sleep' ? 4 : 0;
  const segments = FIXED_SEGMENTS;

  // 用目前 value 在區間的比例，換算到 12 格（不會出現奇怪小數）
  const ratio = (c.value - startForBar) / (c.max - startForBar);
  const selectedIdx = Math.max(0, Math.min(segments - 1, Math.round(ratio * (segments - 1))));

  return (
    <div key={c.id} className="space-y-1">
      <div className="flex items-baseline justify-between">
        <h3 className="font-medium text-gray-700">{c.name}</h3>
        <p className="text-sm text-gray-600 font-medium">{c.value} {c.unit}</p>
      </div>

      <SegmentedCommitBar
        segments={segments}
        start={startForBar}
        max={c.max}
        allowedStep={c.step}                  // ← 保留你的「原邏輯步進」
        selectedIdx={selectedIdx}
        onChange={(v) => onUpdateCommitment(c.id, v)} // ← 回傳的一定是貼齊步進的值
        borderTone={c.borderTone}
        name={c.name}
      />
    </div>
  );
})}

  
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