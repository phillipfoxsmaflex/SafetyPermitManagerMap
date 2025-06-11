import { CheckCircle } from "lucide-react";
import { WORKFLOW_STEPS } from "@/lib/workflow-config";

interface WorkflowVisualizationProps {
  currentStatus: string;
  className?: string;
}

export function WorkflowVisualization({ currentStatus, className }: WorkflowVisualizationProps) {
  const getStepState = (stepStatus: string) => {
    const currentIndex = WORKFLOW_STEPS.findIndex(step => step.status === currentStatus);
    const stepIndex = WORKFLOW_STEPS.findIndex(step => step.status === stepStatus);
    
    if (stepIndex < currentIndex) {
      return 'completed';
    } else if (stepIndex === currentIndex) {
      return 'current';
    } else {
      return 'pending';
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <h4 className="font-medium text-gray-900 mb-4">Workflow-Fortschritt</h4>
      
      <div className="flex items-center justify-between">
        {WORKFLOW_STEPS.map((step, index) => {
          const state = getStepState(step.status);
          const Icon = step.icon;
          
          return (
            <div key={step.status} className="flex items-center">
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors
                    ${state === 'completed' 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : state === 'current'
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'bg-gray-100 border-gray-300 text-gray-400'
                    }
                  `}
                >
                  {state === 'completed' ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                
                {/* Step label */}
                <div className="mt-2 text-center">
                  <div
                    className={`
                      text-xs font-medium
                      ${state === 'completed' 
                        ? 'text-green-600' 
                        : state === 'current'
                        ? 'text-blue-600'
                        : 'text-gray-400'
                      }
                    `}
                  >
                    {step.label}
                  </div>
                </div>
              </div>
              
              {/* Connector line */}
              {index < WORKFLOW_STEPS.length - 1 && (
                <div
                  className={`
                    flex-1 h-0.5 mx-2 transition-colors
                    ${getStepState(WORKFLOW_STEPS[index + 1].status) === 'completed' || 
                      (state === 'completed' && getStepState(WORKFLOW_STEPS[index + 1].status) === 'current')
                      ? 'bg-green-500' 
                      : 'bg-gray-300'
                    }
                  `}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}