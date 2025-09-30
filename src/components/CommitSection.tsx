import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CommitSectionProps {
  commitments: {
    focusTime: number;
    sleep: number;
    nutrition: number;
  };
  onUpdateCommitment: (type: 'focusTime' | 'sleep' | 'nutrition', hours: number) => void;
}

export default function CommitSection({ commitments, onUpdateCommitment }: CommitSectionProps) {
  const focusTimeOptions = [
    { hours: 1, color: 'red' },
    { hours: 2, color: 'orange' },
    { hours: 3, color: 'green' },
    { hours: 4, color: 'green' },
    { hours: 5, color: 'green' }
  ];

  const sleepOptions = [
    { hours: 6, color: 'red' },
    { hours: 7, color: 'green' },
    { hours: 8, color: 'green' }
  ];

  const nutritionOptions = [
    { hours: 1, color: 'orange' },
    { hours: 2, color: 'green' },
    { hours: 3, color: 'green' }
  ];

  const getButtonClass = (color: string, isSelected: boolean) => {
    const baseClass = "h-8 px-3 text-sm font-medium transition-all duration-200";
    
    if (isSelected) {
      switch (color) {
        case 'green':
          return cn(baseClass, "bg-green-600 text-white border-green-600 shadow-md");
        case 'orange':
          return cn(baseClass, "bg-orange-500 text-white border-orange-500 shadow-md");
        case 'red':
          return cn(baseClass, "bg-red-500 text-white border-red-500 shadow-md");
        default:
          return cn(baseClass, "bg-gray-200 text-gray-700");
      }
    }

    switch (color) {
      case 'green':
        return cn(baseClass, "bg-green-100 text-green-700 border border-green-300 hover:bg-green-200");
      case 'orange':
        return cn(baseClass, "bg-orange-100 text-orange-700 border border-orange-300 hover:bg-orange-200");
      case 'red':
        return cn(baseClass, "bg-red-100 text-red-700 border border-red-300 hover:bg-red-200");
      default:
        return cn(baseClass, "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200");
    }
  };

  const totalCommittedHours = commitments.focusTime + commitments.sleep + commitments.nutrition;
  const dailyBarPercentage = Math.min((totalCommittedHours / 24) * 100, 100);

  return (
    <div className="space-y-4">
      {/* Focus Time */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Focus Time</h3>
        <div className="flex gap-2">
          {focusTimeOptions.map(({ hours, color }) => (
            <Button
              key={hours}
              variant="outline"
              size="sm"
              className={getButtonClass(color, commitments.focusTime === hours)}
              onClick={() => onUpdateCommitment('focusTime', commitments.focusTime === hours ? 0 : hours)}
            >
              {hours}hr
            </Button>
          ))}
        </div>
      </div>

      {/* Sleep */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Sleep</h3>
        <div className="flex gap-2">
          {sleepOptions.map(({ hours, color }) => (
            <Button
              key={hours}
              variant="outline"
              size="sm"
              className={getButtonClass(color, commitments.sleep === hours)}
              onClick={() => onUpdateCommitment('sleep', commitments.sleep === hours ? 0 : hours)}
            >
              {hours}hr
            </Button>
          ))}
        </div>
      </div>

      {/* Nutrition */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Nutrition</h3>
        <div className="flex gap-2">
          {nutritionOptions.map(({ hours, color }) => (
            <Button
              key={hours}
              variant="outline"
              size="sm"
              className={getButtonClass(color, commitments.nutrition === hours)}
              onClick={() => onUpdateCommitment('nutrition', commitments.nutrition === hours ? 0 : hours)}
            >
              {hours}hr
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}