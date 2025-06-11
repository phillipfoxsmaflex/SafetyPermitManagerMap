import { useState } from "react";
import { useLocation } from "wouter";
import { Eye, Edit, Printer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PermitStatusBadge } from "@/components/permit-status-badge";
import { PermitPrintView } from "@/components/permit-print-view";
import { Permit, User } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PermitTableProps {
  permits: Permit[];
  isLoading?: boolean;
  onEdit?: (permit: Permit) => void;
  onDelete?: (permitId: number) => void;
  isAdmin?: boolean;
  currentUser?: User;
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) return 'Nicht festgelegt';
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getPermitTypeLabel(type: string): string {
  const typeLabels: Record<string, string> = {
    'hot_work': 'Heißarbeiten',
    'confined_space': 'Enger Raum',
    'electrical': 'Elektrische Arbeiten',
    'chemical': 'Chemische Arbeiten',
    'maintenance': 'Wartungsarbeiten',
    'general': 'Allgemeine Genehmigung'
  };
  return typeLabels[type] || type;
}

export function PermitTable({ permits, isLoading, onEdit, onDelete, isAdmin, currentUser }: PermitTableProps) {
  const [, setLocation] = useLocation();
  const [printPermit, setPrintPermit] = useState<Permit | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();



  const handleView = (permit: Permit) => {
    setLocation(`/permits/${permit.id}`);
  };



  const handleEdit = (permit: Permit) => {
    console.log('Editing permit:', permit.permitId);
    if (onEdit) {
      onEdit(permit);
    }
  };

  const handlePrint = (permit: Permit) => {
    setPrintPermit(permit);
  };

  const handleDelete = (permit: Permit) => {
    if (onDelete && window.confirm(`Sind Sie sicher, dass Sie die Genehmigung ${permit.permitId} löschen möchten?`)) {
      onDelete(permit.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-secondary-gray">Lade Genehmigungen...</div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-primary-blue/10">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-primary-blue/10 bg-gradient-to-r from-primary-blue/5 to-safety-blue/5">
              <TableHead className="text-xs font-medium text-secondary-gray uppercase tracking-wider">
                Genehmigungsnummer
              </TableHead>
              <TableHead className="text-xs font-medium text-secondary-gray uppercase tracking-wider">
                Typ
              </TableHead>
              <TableHead className="text-xs font-medium text-secondary-gray uppercase tracking-wider">
                Abteilung
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
                    {permit.department}
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
                    <div className="flex items-center justify-between gap-2">
                      {/* Standard Action Buttons */}
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleView(permit)}
                          title="Anzeigen"
                        >
                          <Eye className="h-4 w-4 text-safety-blue" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleEdit(permit)}
                          title="Bearbeiten"
                        >
                          <Edit className="h-4 w-4 text-secondary-gray" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handlePrint(permit)}
                          title="Drucken"
                        >
                          <Printer className="h-4 w-4 text-secondary-gray" />
                        </Button>
                        {isAdmin && onDelete && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleDelete(permit)}
                            title="Löschen"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>

                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {printPermit && (
        <PermitPrintView 
          permit={printPermit} 
          onClose={() => setPrintPermit(null)} 
        />
      )}
    </>
  );
}