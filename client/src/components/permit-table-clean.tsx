import { useLocation } from "wouter";
import { Eye, Edit, Printer, Trash2, MapPin, User as UserIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { PermitStatusBadge } from "@/components/permit-status-badge";
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
  const queryClient = useQueryClient();
  const { toast } = useToast();



  const handleView = (permit: Permit) => {
    setLocation(`/permit/${permit.id}`);
  };



  const handleEdit = (permit: Permit) => {
    console.log('Editing permit:', permit.permitId);
    setLocation(`/permit/${permit.id}`);
  };

  const handlePrint = (permit: Permit) => {
    setLocation(`/permit/${permit.id}/print`);
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
      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-lg shadow-sm border border-primary-blue/10">
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

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {permits.length === 0 ? (
          <div className="text-center py-8 text-secondary-gray">
            Keine Genehmigungen gefunden. Erstellen Sie Ihre erste Genehmigung, um zu beginnen.
          </div>
        ) : (
          permits.map((permit) => (
            <Card key={permit.id} className="border border-gray-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col space-y-3">
                  {/* Header with ID and Status */}
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-safety-blue text-lg">
                      #{permit.permitId}
                    </div>
                    <PermitStatusBadge status={permit.status} />
                  </div>
                  
                  {/* Type and Department */}
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center text-sm text-industrial-gray">
                      <span className="font-medium">Typ:</span>
                      <span className="ml-2">{getPermitTypeLabel(permit.type)}</span>
                    </div>
                    <div className="flex items-center text-sm text-industrial-gray">
                      <span className="font-medium">Abteilung:</span>
                      <span className="ml-2">{permit.department}</span>
                    </div>
                  </div>

                  {/* Requestor and Location */}
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center text-sm text-industrial-gray">
                      <UserIcon className="h-4 w-4 mr-2" />
                      <span className="font-medium">Antragsteller:</span>
                      <span className="ml-2">{permit.requestorName}</span>
                    </div>
                    <div className="flex items-center text-sm text-industrial-gray">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span className="font-medium">Standort:</span>
                      <span className="ml-2">{permit.location}</span>
                    </div>
                  </div>

                  {/* Valid Until */}
                  <div className="flex items-center text-sm text-industrial-gray">
                    <Clock className="h-4 w-4 mr-2" />
                    <span className="font-medium">Gültig bis:</span>
                    <span className="ml-2">{formatDateTime(permit.endDate)}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="flex items-center gap-1"
                        onClick={() => handleView(permit)}
                      >
                        <Eye className="h-4 w-4 text-safety-blue" />
                        <span className="text-xs">Anzeigen</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="flex items-center gap-1"
                        onClick={() => handleEdit(permit)}
                      >
                        <Edit className="h-4 w-4 text-secondary-gray" />
                        <span className="text-xs">Bearbeiten</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="flex items-center gap-1"
                        onClick={() => handlePrint(permit)}
                      >
                        <Printer className="h-4 w-4 text-secondary-gray" />
                        <span className="text-xs">Drucken</span>
                      </Button>
                    </div>
                    {isAdmin && onDelete && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="flex items-center gap-1"
                        onClick={() => handleDelete(permit)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                        <span className="text-xs">Löschen</span>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

    </>
  );
}