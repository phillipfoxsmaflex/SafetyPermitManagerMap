import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  GitCompare, 
  CheckCircle, 
  XCircle,
  ArrowRight,
  Loader2,
  AlertTriangle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface PermitDiffViewProps {
  permitId: number;
  batchId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DiffChange {
  field: string;
  originalValue: any;
  stagedValue: any;
  hasChanged: boolean;
}

interface PermitDiff {
  original: any;
  staged: any;
  changes: DiffChange[];
}

const fieldLabels: Record<string, string> = {
  type: "Arbeitstyp",
  location: "Standort",
  description: "Beschreibung",
  requestorName: "Antragsteller",
  department: "Abteilung",
  contactNumber: "Kontaktnummer",
  emergencyContact: "Notfallkontakt",
  riskLevel: "Risikostufe",
  safetyOfficer: "Sicherheitsbeauftragter",
  departmentHead: "Abteilungsleiter",
  maintenanceApprover: "Instandhaltung",
  identifiedHazards: "Identifizierte Gefahren",
  additionalComments: "Zusätzliche Kommentare",
  selectedHazards: "TRBS Gefahrenkategorien",
  hazardNotes: "Gefahrennotizen",
  completedMeasures: "Schutzmaßnahmen",
  immediateActions: "Sofortmaßnahmen",
  beforeWorkStarts: "Vor Arbeitsbeginn",
  complianceNotes: "Compliance-Hinweise",
  overallRisk: "Gesamtrisiko"
};

export function PermitDiffView({ permitId, batchId, open, onOpenChange }: PermitDiffViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: diff, isLoading, error } = useQuery<PermitDiff>({
    queryKey: [`/api/permits/${permitId}/diff/${batchId}`],
    enabled: open && !!batchId,
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/permits/${permitId}/staging/${batchId}/apply`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/permits/${permitId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/permits/${permitId}/suggestions`] });
      toast({
        title: "Änderungen übernommen",
        description: "Alle AI-Vorschläge wurden erfolgreich angewendet.",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Änderungen konnten nicht übernommen werden.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/permits/${permitId}/staging/${batchId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/permits/${permitId}/suggestions`] });
      toast({
        title: "Änderungen verworfen",
        description: "Alle AI-Vorschläge wurden abgelehnt.",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Änderungen konnten nicht verworfen werden.",
        variant: "destructive",
      });
    },
  });

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return "—";
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(", ") : "—";
    }
    if (typeof value === "string" && value.trim() === "") return "—";
    return String(value);
  };

  const changedFields = diff?.changes.filter(change => change.hasChanged) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-blue-600" />
            AI-Verbesserungsvorschau
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2">Lade Vorschau...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8 text-red-600">
            <AlertTriangle className="h-8 w-8 mr-2" />
            <span>Fehler beim Laden der Vorschau</span>
          </div>
        ) : diff && changedFields.length > 0 ? (
          <>
            <div className="mb-4">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {changedFields.length} Änderung{changedFields.length !== 1 ? "en" : ""} vorgeschlagen
              </Badge>
            </div>

            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                {changedFields.map((change, index) => (
                  <Card key={change.field} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-700">
                        {fieldLabels[change.field] || change.field}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Original Value */}
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Aktuell
                          </div>
                          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                            <div className="text-sm text-gray-800 whitespace-pre-wrap">
                              {formatValue(change.originalValue)}
                            </div>
                          </div>
                        </div>

                        {/* Arrow */}
                        <div className="hidden md:flex items-center justify-center">
                          <ArrowRight className="h-4 w-4 text-gray-400" />
                        </div>

                        {/* Staged Value */}
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Vorschlag
                          </div>
                          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                            <div className="text-sm text-gray-800 whitespace-pre-wrap">
                              {formatValue(change.stagedValue)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <Separator />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => rejectMutation.mutate()}
                disabled={rejectMutation.isPending || applyMutation.isPending}
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                {rejectMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Alle ablehnen
              </Button>
              
              <Button
                onClick={() => applyMutation.mutate()}
                disabled={applyMutation.isPending || rejectMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {applyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Alle übernehmen
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <GitCompare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Keine Änderungen gefunden</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}