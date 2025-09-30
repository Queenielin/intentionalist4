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

      {/* 24-hour Daily Bar */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium text-gray-700">Daily Commitment</h3>
          <span className="text-xs text-gray-500">{totalCommittedHours}/24 hours</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          {/* Focus Time Bar */}
          {commitments.focusTime > 0 && (
            <div 
              className="h-full bg-blue-400 bg-opacity-60 float-left transition-all duration-300"
              style={{ width: `${(commitments.focusTime / 24) * 100}%` }}
              title={`Focus Time: ${commitments.focusTime}hr`}
            />
          )}
          {/* Sleep Bar */}
          {commitments.sleep > 0 && (
            <div 
              className="h-full bg-purple-400 bg-opacity-60 float-left transition-all duration-300"
              style={{ width: `${(commitments.sleep / 24) * 100}%` }}
              title={`Sleep: ${commitments.sleep}hr`}
            />
          )}
          {/* Nutrition Bar */}
          {commitments.nutrition > 0 && (
            <div 
              className="h-full bg-green-400 bg-opacity-60 float-left transition-all duration-300"
              style={{ width: `${(commitments.nutrition / 24) * 100}%` }}
              title={`Nutrition: ${commitments.nutrition}hr`}
            />
          )}
        </div>
        
        {/* Legend */}
        <div className="flex gap-4 mt-2 text-xs text-gray-600">
          {commitments.focusTime > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-400 bg-opacity-60 rounded-full"></div>
              <span>Focus ({commitments.focusTime}h)</span>
            </div>
          )}
          {commitments.sleep > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-purple-400 bg-opacity-60 rounded-full"></div>
              <span>Sleep ({commitments.sleep}h)</span>
            </div>
          )}
          {commitments.nutrition > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 bg-opacity-60 rounded-full"></div>
              <span>Nutrition ({commitments.nutrition}h)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}