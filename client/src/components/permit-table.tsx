import { useState } from "react";
import { Eye, Edit, Printer, Trash2, Play, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PermitStatusBadge } from "./permit-status-badge";
import { PermitPrintView } from "./permit-print-view";
import type { Permit, User } from "@shared/schema";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PermitTableProps {
  permits: Permit[];
  isLoading?: boolean;
  onEdit?: (permit: Permit) => void;
  onDelete?: (permitId: number) => void;
  isAdmin?: boolean;
  currentUser?: User;
}

export function PermitTable({ permits, isLoading, onEdit, onDelete, isAdmin, currentUser }: PermitTableProps) {
  const [, setLocation] = useLocation();
  const [printPermit, setPrintPermit] = useState<Permit | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Workflow mutation for status changes
  const workflowMutation = useMutation({
    mutationFn: async ({ permitId, actionId, nextStatus }: { permitId: number; actionId: string; nextStatus: string }) => {
      return apiRequest(`/api/permits/${permitId}/workflow`, 'POST', { action: actionId, nextStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/permits'] });
      toast({
        title: "Workflow-Aktion erfolgreich",
        description: "Der Status wurde erfolgreich geändert.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message || "Workflow-Aktion fehlgeschlagen",
        variant: "destructive",
      });
    },
  });

  // Simple workflow buttons based only on status
  const getWorkflowButtons = (permit: Permit) => {
    if (!currentUser) return [];

    const buttons = [];
    
    switch (permit.status) {
      case 'approved':
        buttons.push(
          <Button
            key="activate"
            size="sm"
            variant="default"
            onClick={() => workflowMutation.mutate({ 
              permitId: permit.id, 
              actionId: 'activate', 
              nextStatus: 'active' 
            })}
            disabled={workflowMutation.isPending}
            className="mr-1"
          >
            <Play className="h-3 w-3 mr-1" />
            Aktivieren
          </Button>
        );
        
        buttons.push(
          <Button
            key="withdraw"
            size="sm"
            variant="outline"
            onClick={() => workflowMutation.mutate({ 
              permitId: permit.id, 
              actionId: 'withdraw', 
              nextStatus: 'draft' 
            })}
            disabled={workflowMutation.isPending}
          >
            <ArrowLeft className="h-3 w-3 mr-1" />
            Zurückziehen
          </Button>
        );
        break;
        
      case 'active':
        buttons.push(
          <Button
            key="complete"
            size="sm"
            variant="default"
            onClick={() => workflowMutation.mutate({ 
              permitId: permit.id, 
              actionId: 'complete', 
              nextStatus: 'completed' 
            })}
            disabled={workflowMutation.isPending}
            className="mr-1"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Abschließen
          </Button>
        );
        
        buttons.push(
          <Button
            key="suspend"
            size="sm"
            variant="outline"
            onClick={() => workflowMutation.mutate({ 
              permitId: permit.id, 
              actionId: 'suspend', 
              nextStatus: 'suspended' 
            })}
            disabled={workflowMutation.isPending}
          >
            <XCircle className="h-3 w-3 mr-1" />
            Pausieren
          </Button>
        );
        break;
        
      case 'suspended':
        buttons.push(
          <Button
            key="resume"
            size="sm"
            variant="default"
            onClick={() => workflowMutation.mutate({ 
              permitId: permit.id, 
              actionId: 'resume', 
              nextStatus: 'active' 
            })}
            disabled={workflowMutation.isPending}
          >
            <Play className="h-3 w-3 mr-1" />
            Fortsetzen
          </Button>
        );
        break;
    }
    
    return buttons;
  };

  const formatDateTime = (date: Date | string | null) => {
    if (!date) return 'Nicht angegeben';
    const d = new Date(date);
    return d.toLocaleDateString('de-DE', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPermitTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'confined_space': 'Enger Raum',
      'hot_work': 'Heißarbeiten',
      'electrical': 'Elektrische Arbeiten',
      'chemical': 'Chemische Arbeiten',
      'height': 'Höhenarbeiten',
      'general_permit': 'Allgemeiner Erlaubnisschein',
    };
    return typeMap[type] || type;
  };

  const handleView = (permit: Permit) => {
    console.log("Viewing permit:", permit.permitId);
    setLocation(`/permit/${permit.id}`);
  };

  const handleEdit = (permit: Permit) => {
    console.log("Editing permit:", permit.permitId);
    setLocation(`/permit/${permit.id}`);
  };

  const handlePrint = (permit: Permit) => {
    console.log("Printing permit:", permit.permitId);
    setPrintPermit(permit);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-industrial-gray">Aktuelle Genehmigungen</h3>
        </div>
        <div className="p-8 text-center">
          <div className="text-secondary-gray">Genehmigungen werden geladen...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-industrial-gray">Aktuelle Genehmigungen</h3>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="text-xs font-medium text-secondary-gray uppercase tracking-wider">
                Genehmigungs-ID
              </TableHead>
              <TableHead className="text-xs font-medium text-secondary-gray uppercase tracking-wider">
                Typ
              </TableHead>
              <TableHead className="text-xs font-medium text-secondary-gray uppercase tracking-wider">
                Standort
              </TableHead>
              <TableHead className="text-xs font-medium text-secondary-gray uppercase tracking-wider">
                Antragsteller
              </TableHead>
              <TableHead className="text-xs font-medium text-secondary-gray uppercase tracking-wider">
                Status
              </TableHead>

              <TableHead className="text-xs font-medium text-secondary-gray uppercase tracking-wider">
                Gültig bis
              </TableHead>
              <TableHead className="text-xs font-medium text-secondary-gray uppercase tracking-wider">
                Aktionen
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {permits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-secondary-gray">
                  Keine Genehmigungen gefunden. Erstellen Sie Ihre erste Genehmigung, um zu beginnen.
                </TableCell>
              </TableRow>
            ) : (
              permits.map((permit) => (
                <TableRow key={permit.id}>
                  <TableCell className="font-medium text-safety-blue">
                    #{permit.permitId}
                  </TableCell>
                  <TableCell className="text-industrial-gray">
                    {getPermitTypeLabel(permit.type)}
                  </TableCell>
                  <TableCell className="text-industrial-gray">
                    {permit.location}
                  </TableCell>
                  <TableCell className="text-industrial-gray">
                    {permit.requestorName}
                  </TableCell>
                  <TableCell>
                    <PermitStatusBadge status={permit.status} />
                  </TableCell>
                  <TableCell className="text-industrial-gray">
                    {formatDateTime(permit.endDate)}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleView(permit)}
                      >
                        <Eye className="h-4 w-4 text-safety-blue" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleEdit(permit)}
                      >
                        <Edit className="h-4 w-4 text-secondary-gray" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handlePrint(permit)}
                      >
                        <Printer className="h-4 w-4 text-secondary-gray" />
                      </Button>
                      {isAdmin && onDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Genehmigung wirklich löschen?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Diese Aktion kann nicht rückgängig gemacht werden. Die Genehmigung "{permit.permitId}" 
                                und alle zugehörigen Daten (Anhänge, AI-Vorschläge, Benachrichtigungen) werden 
                                dauerhaft aus der Datenbank entfernt.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => onDelete(permit.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Löschen
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Print View Modal */}
      {printPermit && (
        <PermitPrintView
          permit={printPermit}
          onClose={() => setPrintPermit(null)}
        />
      )}
    </div>
  );
}
