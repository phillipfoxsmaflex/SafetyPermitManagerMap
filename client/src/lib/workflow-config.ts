import { Send, ArrowLeft, CheckCircle, Play, CheckCircle2, Clock, FileText, AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface WorkflowAction {
  id: string;
  label: string;
  icon: LucideIcon;
  variant: 'default' | 'destructive' | 'outline' | 'secondary';
  nextStatus: string;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  permissions: string[];
}

export interface WorkflowState {
  status: string;
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  isEditable: boolean;
  availableActions: WorkflowAction[];
  description: string;
}

export const WORKFLOW_CONFIG: Record<string, WorkflowState> = {
  draft: {
    status: 'draft',
    label: 'Entwurf',
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    isEditable: true,
    description: 'Genehmigung wird bearbeitet und kann geändert werden',
    availableActions: [
      {
        id: 'submit',
        label: 'Zur Genehmigung einreichen',
        icon: Send,
        variant: 'default',
        nextStatus: 'pending',
        requiresConfirmation: true,
        confirmationMessage: 'Möchten Sie diese Genehmigung zur Prüfung einreichen? Nach dem Einreichen können keine Änderungen mehr vorgenommen werden.',
        permissions: ['creator', 'admin']
      }
    ]
  },
  pending: {
    status: 'pending',
    label: 'Ausstehend',
    color: 'orange',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    isEditable: false,
    description: 'Genehmigung wartet auf Freigabe durch die zuständigen Stellen',
    availableActions: [
      {
        id: 'withdraw',
        label: 'Zurückziehen',
        icon: ArrowLeft,
        variant: 'outline',
        nextStatus: 'draft',
        requiresConfirmation: true,
        confirmationMessage: 'Möchten Sie diese Genehmigung zurückziehen? Sie wird wieder als Entwurf gespeichert und kann bearbeitet werden.',
        permissions: ['creator', 'admin']
      },
      {
        id: 'approve',
        label: 'Genehmigen',
        icon: CheckCircle,
        variant: 'default',
        nextStatus: 'approved',
        requiresConfirmation: true,
        confirmationMessage: 'Möchten Sie diese Genehmigung freigeben?',
        permissions: ['approver', 'admin']
      }
    ]
  },
  approved: {
    status: 'approved',
    label: 'Genehmigt',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    isEditable: false,
    description: 'Genehmigung wurde freigegeben und kann aktiviert werden',
    availableActions: [
      {
        id: 'withdraw',
        label: 'Zurückziehen',
        icon: ArrowLeft,
        variant: 'outline',
        nextStatus: 'draft',
        requiresConfirmation: true,
        confirmationMessage: 'Möchten Sie diese Genehmigung zurückziehen? Sie wird wieder als Entwurf gespeichert.',
        permissions: ['any']
      },
      {
        id: 'activate',
        label: 'Aktivieren',
        icon: Play,
        variant: 'default',
        nextStatus: 'active',
        requiresConfirmation: true,
        confirmationMessage: 'Möchten Sie diese Genehmigung aktivieren? Die Arbeiten können dann beginnen.',
        permissions: ['any']
      }
    ]
  },
  active: {
    status: 'active',
    label: 'Aktiv',
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    isEditable: false,
    description: 'Genehmigung ist aktiv - Arbeiten können durchgeführt werden',
    availableActions: [
      {
        id: 'complete',
        label: 'Genehmigung abschließen',
        icon: CheckCircle2,
        variant: 'default',
        nextStatus: 'completed',
        requiresConfirmation: true,
        confirmationMessage: 'Möchten Sie diese Genehmigung als abgeschlossen markieren?',
        permissions: ['supervisor', 'performer', 'admin']
      }
    ]
  },
  completed: {
    status: 'completed',
    label: 'Abgeschlossen',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    isEditable: false,
    description: 'Genehmigung wurde erfolgreich abgeschlossen',
    availableActions: []
  },
  expired: {
    status: 'expired',
    label: 'Abgelaufen',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    isEditable: false,
    description: 'Genehmigung ist abgelaufen',
    availableActions: []
  },
  rejected: {
    status: 'rejected',
    label: 'Abgelehnt',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    isEditable: false,
    description: 'Genehmigung wurde abgelehnt',
    availableActions: [
      {
        id: 'withdraw',
        label: 'Zur Überarbeitung',
        icon: ArrowLeft,
        variant: 'outline',
        nextStatus: 'draft',
        permissions: ['creator', 'admin']
      }
    ]
  }
};

export const WORKFLOW_STEPS = [
  { status: 'draft', label: 'Entwurf', icon: FileText },
  { status: 'pending', label: 'Ausstehend', icon: Clock },
  { status: 'approved', label: 'Genehmigt', icon: CheckCircle },
  { status: 'active', label: 'Aktiv', icon: Play },
  { status: 'completed', label: 'Abgeschlossen', icon: CheckCircle2 }
];