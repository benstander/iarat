import React from "react";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  showText?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ currentStep, totalSteps, showText = true }) => {
  const percent = Math.max(0, Math.min(100, (currentStep / totalSteps) * 100));
  return (
    <div className="w-full flex flex-col items-center gap-2">
      <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-pink-500 rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar; 