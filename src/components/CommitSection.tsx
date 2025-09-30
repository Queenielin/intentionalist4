import React from 'react';

interface CommitSectionProps {
  commitments: {
    focusTime: number;
    sleep: number;
    nutrition: number;
    movement: number;
    downtime: number;
  };
  onUpdateCommitment: (
    type: 'focusTime' | 'sleep' | 'nutrition' | 'movement' | 'downtime',
    hours: number
  ) => void;
}

const CommitSection: React.FC<CommitSectionProps> = ({ commitments, onUpdateCommitment }) => {
  const CommitmentRow = ({ 
    title, 
    type, 
    options 
  }: { 
    title: string; 
    type: 'focusTime' | 'sleep' | 'nutrition' | 'movement' | 'downtime';
    options: { hours: number; color: string }[];
  }) => (
    <div className="mb-4">
      <h3 className="text-sm font-medium text-gray-700 mb-2">{title}</h3>
      <div className="flex gap-2">
        {options.map(({ hours, color }) => (
          <button
            key={hours}
            onClick={() => onUpdateCommitment(type, commitments[type] === hours ? 0 : hours)}
            className={`px-3 py-1 text-xs font-medium rounded transition-all ${
              commitments[type] === hours
                ? `${color} shadow-md`
                : `${color.replace('bg-', 'bg-').replace('-500', '-200')} hover:${color.replace('-200', '-300')}`
            }`}
          >
            {hours}hr
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <CommitmentRow
        title="Focus Time"
        type="focusTime"
        options={[
          { hours: 1, color: 'bg-red-500 text-white' },
          { hours: 2, color: 'bg-orange-500 text-white' },
          { hours: 3, color: 'bg-green-500 text-white' },
          { hours: 4, color: 'bg-green-500 text-white' },
          { hours: 5, color: 'bg-green-500 text-white' }
        ]}
      />
      
      <CommitmentRow
        title="Sleep"
        type="sleep"
        options={[
          { hours: 6, color: 'bg-red-500 text-white' },
          { hours: 7, color: 'bg-green-500 text-white' },
          { hours: 8, color: 'bg-green-500 text-white' }
        ]}
      />
      
      <CommitmentRow
        title="Nutrition"
        type="nutrition"
        options={[
          { hours: 1, color: 'bg-orange-500 text-white' },
          { hours: 2, color: 'bg-green-500 text-white' },
          { hours: 3, color: 'bg-green-500 text-white' }
        ]}
      />
      
      <CommitmentRow
        title="Movement"
        type="movement"
        options={[
          { hours: 1, color: 'bg-green-500 text-white' },
          { hours: 2, color: 'bg-green-500 text-white' }
        ]}
      />
      
      <CommitmentRow
        title="Downtime"
        type="downtime"
        options={[
          { hours: 1, color: 'bg-green-500 text-white' },
          { hours: 2, color: 'bg-green-500 text-white' },
          { hours: 3, color: 'bg-green-500 text-white' }
        ]}
      />
    </div>
  );
};

export default CommitSection;