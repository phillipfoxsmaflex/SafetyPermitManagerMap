import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { WORKFLOW_CONFIG, type WorkflowAction } from "@/lib/workflow-config";
import { hasPermission } from "@/lib/permissions";
import type { User, Permit } from "@shared/schema";

interface WorkflowButtonsProps {
  permit: Permit;
  currentUser: User;
  onAction: (actionId: string, nextStatus: string) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

export function WorkflowButtons({ 
  permit, 
  currentUser, 
  onAction, 
  isLoading = false,
  className 
}: WorkflowButtonsProps) {
  const [confirmAction, setConfirmAction] = useState<WorkflowAction | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const workflowState = WORKFLOW_CONFIG[permit.status];
  
  if (!workflowState) {
    return null;
  }

  const getAvailableActions = () => {
    return workflowState.availableActions.filter(action => {
      return hasPermission(currentUser, permit, action.permissions);
    });
  };

  const handleAction = async (action: WorkflowAction) => {
    if (action.requiresConfirmation) {
      setConfirmAction(action);
    } else {
      await executeAction(action);
    }
  };

  const executeAction = async (action: WorkflowAction) => {
    try {
      setIsActionLoading(true);
      await onAction(action.id, action.nextStatus);
    } catch (error) {
      console.error('Workflow action failed:', error);
    } finally {
      setIsActionLoading(false);
      setConfirmAction(null);
    }
  };

  const availableActions = getAvailableActions();

  if (availableActions.length === 0) {
    return null;
  }

  return (
    <>
      <div className={`flex gap-2 ${className}`}>
        {availableActions.map(action => {
          const Icon = action.icon;
          
          return (
            <Button
              key={action.id}
              variant={action.variant}
              onClick={() => handleAction(action)}
              disabled={isLoading || isActionLoading}
              className="flex items-center gap-2"
            >
              <Icon className="h-4 w-4" />
              {action.label}
            </Button>
          );
        })}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aktion bestätigen</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.confirmationMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActionLoading}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmAction && executeAction(confirmAction)}
              disabled={isActionLoading}
            >
              {isActionLoading ? "Wird ausgeführt..." : "Bestätigen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}