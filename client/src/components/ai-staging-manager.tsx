import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Brain, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  GitCompare, 
  AlertTriangle,
  Eye,
  Zap
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface AiStagingManagerProps {
  permitId: number;
}

interface PermitDiff {
  field: string;
  originalValue: any;
  stagingValue: any;
}

interface StagingPermit {
  id: number;
  originalPermitId: number;
  aiProcessingStatus: string;
  approvalStatus: string;
  batchId: string;
  changedFields: string[];
  aiProcessingStarted: string;
  aiProcessingCompleted?: string;
}

export function AiStagingManager({ permitId }: AiStagingManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [diffModalOpen, setDiffModalOpen] = useState(false);

  // Query for staging permit
  const { data: stagingPermit } = useQuery<StagingPermit>({
    queryKey: [`/api/permits/${permitId}/staging`],
    retry: false,
  });

  // Query for permit differences
  const { data: permitDiff = [] } = useQuery<PermitDiff[]>({
    queryKey: [`/api/permits/${permitId}/diff`],
    enabled: !!stagingPermit,
    retry: false,
  });

  // Start AI analysis mutation
  const startAnalysisMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/permits/${permitId}/analyze`, "POST");
    },
    onSuccess: (data: any) => {
      toast({
        title: "KI-Analyse gestartet",
        description: `Batch ID: ${data.batchId}. Die Analyse läuft im Hintergrund.`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/permits/${permitId}/staging`] });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: "KI-Analyse konnte nicht gestartet werden.",
        variant: "destructive",
      });
    },
  });

  // Apply staging changes mutation
  const applyStagingMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/permits/${permitId}/apply-staging`, "POST");
    },
    onSuccess: () => {
      toast({
        title: "Änderungen übernommen",
        description: "Die KI-Verbesserungen wurden erfolgreich angewendet.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/permits/${permitId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/permits/${permitId}/staging`] });
      queryClient.invalidateQueries({ queryKey: [`/api/permits/${permitId}/diff`] });
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Änderungen konnten nicht übernommen werden.",
        variant: "destructive",
      });
    },
  });

  // Reject staging changes mutation
  const rejectStagingMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/permits/${permitId}/staging`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Änderungen verworfen",
        description: "Die KI-Vorschläge wurden abgelehnt.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/permits/${permitId}/staging`] });
      queryClient.invalidateQueries({ queryKey: [`/api/permits/${permitId}/diff`] });
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Änderungen konnten nicht verworfen werden.",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getApprovalColor = (status: string) => {
    switch (status) {
      case 'pending_review': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFieldName = (field: string): string => {
    const fieldMap: Record<string, string> = {
      'type': 'Typ',
      'location': 'Standort',
      'description': 'Beschreibung',
      'riskLevel': 'Risikostufe',
      'identifiedHazards': 'Identifizierte Gefahren',
      'selectedHazards': 'TRBS-Gefahrenkategorien',
      'hazardNotes': 'Gefahrennotizen',
      'completedMeasures': 'Abgeschlossene Maßnahmen',
      'immediateActions': 'Sofortmaßnahmen',
      'beforeWorkStarts': 'Vor Arbeitsbeginn',
      'complianceNotes': 'Compliance-Hinweise',
      'additionalComments': 'Zusätzliche Kommentare',
      'overallRisk': 'Gesamtrisiko'
    };
    return fieldMap[field] || field;
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          KI-gestützte Genehmigungsverbesserung
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!stagingPermit ? (
          <div className="text-center py-6">
            <Brain className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">
              Lassen Sie die KI diese Genehmigung analysieren und Sicherheitsverbesserungen vorschlagen.
            </p>
            <Button
              onClick={() => startAnalysisMutation.mutate()}
              disabled={startAnalysisMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {startAnalysisMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyse wird gestartet...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  KI-Analyse starten
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status Information */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className={getStatusColor(stagingPermit.aiProcessingStatus)}>
                  {stagingPermit.aiProcessingStatus === 'processing' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                  {stagingPermit.aiProcessingStatus === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                  {stagingPermit.aiProcessingStatus === 'error' && <XCircle className="h-3 w-3 mr-1" />}
                  {stagingPermit.aiProcessingStatus === 'processing' ? 'Verarbeitung läuft' : 
                   stagingPermit.aiProcessingStatus === 'completed' ? 'Abgeschlossen' : 
                   stagingPermit.aiProcessingStatus === 'error' ? 'Fehler' : stagingPermit.aiProcessingStatus}
                </Badge>
                <Badge className={getApprovalColor(stagingPermit.approvalStatus)}>
                  {stagingPermit.approvalStatus === 'pending_review' ? 'Wartet auf Review' :
                   stagingPermit.approvalStatus === 'approved' ? 'Genehmigt' :
                   stagingPermit.approvalStatus === 'rejected' ? 'Abgelehnt' : stagingPermit.approvalStatus}
                </Badge>
              </div>
              <div className="text-sm text-gray-500">
                Batch: {stagingPermit.batchId?.slice(-8)}
              </div>
            </div>

            {/* Processing Status */}
            {stagingPermit.aiProcessingStatus === 'processing' && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Die KI analysiert die Genehmigung und erstellt Verbesserungsvorschläge. 
                  Dies kann einige Minuten dauern.
                </AlertDescription>
              </Alert>
            )}

            {/* Completed Analysis */}
            {stagingPermit.aiProcessingStatus === 'completed' && (
              <div className="space-y-4">
                {permitDiff.length > 0 ? (
                  <>
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        Die KI hat {permitDiff.length} Verbesserungsvorschläge erstellt. 
                        Überprüfen Sie die Änderungen bevor Sie sie übernehmen.
                      </AlertDescription>
                    </Alert>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setDiffModalOpen(true)}
                        className="flex-1"
                      >
                        <GitCompare className="h-4 w-4 mr-2" />
                        Änderungen anzeigen ({permitDiff.length})
                      </Button>
                      <Button
                        onClick={() => applyStagingMutation.mutate()}
                        disabled={applyStagingMutation.isPending}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {applyStagingMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        Änderungen übernehmen
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => rejectStagingMutation.mutate()}
                        disabled={rejectStagingMutation.isPending}
                      >
                        {rejectStagingMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-2" />
                        )}
                        Verwerfen
                      </Button>
                    </div>
                  </>
                ) : (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Die KI-Analyse wurde abgeschlossen, aber keine Verbesserungen gefunden.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Error State */}
            {stagingPermit.aiProcessingStatus === 'error' && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  Bei der KI-Analyse ist ein Fehler aufgetreten. Versuchen Sie es erneut.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Changes Diff Modal */}
        <Dialog open={diffModalOpen} onOpenChange={setDiffModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GitCompare className="h-5 w-5" />
                KI-Verbesserungsvorschläge
              </DialogTitle>
              <DialogDescription>
                Vergleichen Sie die ursprünglichen Werte mit den KI-Verbesserungen
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {permitDiff.map((diff: PermitDiff, index: number) => (
                <Card key={index} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      {formatFieldName(diff.field)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-red-700">Original</Label>
                        <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded-md text-sm">
                          <pre className="whitespace-pre-wrap font-mono">
                            {formatValue(diff.originalValue)}
                          </pre>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-green-700">KI-Verbesserung</Label>
                        <div className="mt-1 p-3 bg-green-50 border border-green-200 rounded-md text-sm">
                          <pre className="whitespace-pre-wrap font-mono">
                            {formatValue(diff.stagingValue)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}