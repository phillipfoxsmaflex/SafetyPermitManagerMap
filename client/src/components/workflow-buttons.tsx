import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Play, ArrowLeft, CheckCircle, XCircle, Pause } from "lucide-react";
import type { Permit, User } from "@shared/schema";

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
  const [confirmAction, setConfirmAction] = useState<any>(null);

  // Direkte Status-basierte Buttons ohne komplexe Konfiguration
  const getButtonsForStatus = () => {
    console.log('WorkflowButtons - Status:', permit.status);
    
    switch (permit.status) {
      case 'draft':
        return [
          {
            id: 'submit',
            label: 'Zur Genehmigung einreichen',
            icon: CheckCircle,
            variant: 'default' as const,
            nextStatus: 'pending'
          }
        ];
      
      case 'pending':
        return [
          {
            id: 'approve',
            label: 'Genehmigen',
            icon: CheckCircle,
            variant: 'default' as const,
            nextStatus: 'approved'
          },
          {
            id: 'reject',
            label: 'Ablehnen',
            icon: XCircle,
            variant: 'destructive' as const,
            nextStatus: 'rejected'
          }
        ];
      
      case 'approved':
        return [
          {
            id: 'activate',
            label: 'Aktivieren',
            icon: Play,
            variant: 'default' as const,
            nextStatus: 'active'
          },
          {
            id: 'withdraw',
            label: 'Zurückziehen',
            icon: ArrowLeft,
            variant: 'outline' as const,
            nextStatus: 'draft'
          }
        ];
      
      case 'active':
        return [
          {
            id: 'complete',
            label: 'Abschließen',
            icon: CheckCircle,
            variant: 'default' as const,
            nextStatus: 'completed'
          },
          {
            id: 'suspend',
            label: 'Pausieren',
            icon: Pause,
            variant: 'outline' as const,
            nextStatus: 'suspended'
          }
        ];
      
      case 'rejected':
        return [
          {
            id: 'withdraw',
            label: 'Zur Überarbeitung',
            icon: ArrowLeft,
            variant: 'outline' as const,
            nextStatus: 'draft'
          }
        ];
      
      case 'suspended':
        return [
          {
            id: 'activate',
            label: 'Fortsetzen',
            icon: Play,
            variant: 'default' as const,
            nextStatus: 'active'
          },
          {
            id: 'withdraw',
            label: 'Zurück zu Entwurf',
            icon: ArrowLeft,
            variant: 'outline' as const,
            nextStatus: 'draft'
          }
        ];

      case 'completed':
        return [
          {
            id: 'withdraw',
            label: 'Zurück zu Entwurf',
            icon: ArrowLeft,
            variant: 'outline' as const,
            nextStatus: 'draft'
          }
        ];
      
      default:
        console.log('WorkflowButtons: No actions available for status:', permit.status);
        return [];
    }
  };

  const handleAction = async (action: any) => {
    console.log('WorkflowButtons: Executing action:', action);
    console.log('WorkflowButtons: Permit ID:', permit.id);
    console.log('WorkflowButtons: Current status:', permit.status);
    try {
      await onAction(action.id, action.nextStatus);
      setConfirmAction(null);
    } catch (error) {
      console.error('WorkflowButtons: Action failed:', error);
    }
  };

  const executeAction = async (action: any) => {
    console.log('WorkflowButtons: executeAction called with:', action);
    // Für wichtige Aktionen Bestätigung anfordern
    if (['approve', 'reject', 'activate', 'complete'].includes(action.id)) {
      console.log('WorkflowButtons: Setting confirmation action:', action.id);
      setConfirmAction(action);
    } else {
      console.log('WorkflowButtons: Executing action directly:', action.id);
      await handleAction(action);
    }
  };

  const availableButtons = getButtonsForStatus();
  console.log('Available buttons:', availableButtons);

  if (availableButtons.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {availableButtons.map((action) => {
        const Icon = action.icon;
        return (
          <Button
            key={action.id}
            variant={action.variant}
            onClick={() => executeAction(action)}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Icon className="w-4 h-4" />
            {action.label}
          </Button>
        );
      })}

      {confirmAction && (
        <AlertDialog open={true} onOpenChange={() => setConfirmAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Aktion bestätigen</AlertDialogTitle>
              <AlertDialogDescription>
                Möchten Sie diese Aktion wirklich ausführen: {confirmAction.label}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleAction(confirmAction)}>
                Bestätigen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}