import React from "react";

interface StepIndicatorProps {
  steps: Array<{
    title: string;
    description: string;
  }>;
  currentStep: number;
  onStepClick: (stepIndex: number) => void;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  steps,
  currentStep,
  onStepClick,
}) => {
  return (
    <div className="w-full">
      {/* Mobile view - just show current step/total */}
      <div className="block sm:hidden mb-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium">
            Step {currentStep} of {steps.length}
          </h2>
          <div className="text-sm text-gray-600">
            {steps[currentStep - 1]?.title}
          </div>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Desktop view - show all steps */}
      <div className="hidden sm:flex justify-between">
        {steps.map((step, index) => {
          const isActive = index + 1 === currentStep;
          const isCompleted = index + 1 < currentStep;
          
          return (
            <div 
              key={index} 
              className={`flex flex-col items-center relative w-1/5 ${
                isCompleted ? "cursor-pointer" : ""
              }`}
              onClick={() => isCompleted && onStepClick(index + 1)}
            >
              {/* Line connector */}
              {index < steps.length - 1 && (
                <div className="absolute top-5 w-full px-8">
                  <div className={`h-0.5 ${isCompleted ? "bg-blue-600" : "bg-gray-300"}`}></div>
                </div>
              )}
              
              {/* Step circle */}
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center z-10
                  ${isActive ? "bg-blue-600 text-white" : ""}
                  ${isCompleted ? "bg-blue-600 text-white" : ""}
                  ${!isActive && !isCompleted ? "bg-gray-200 text-gray-500" : ""}
                `}
              >
                {isCompleted ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              
              {/* Step title */}
              <div
                className={`mt-2 text-xs font-medium ${
                  isActive ? "text-blue-600" : "text-gray-500"
                }`}
              >
                {step.title}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
