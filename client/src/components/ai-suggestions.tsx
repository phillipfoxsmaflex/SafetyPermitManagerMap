import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Bot, 
  ThumbsUp, 
  ThumbsDown, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Trash2,
  Lightbulb,
  Send,
  Loader2
} from "lucide-react";

interface AiSuggestion {
  id: number;
  permitId: number;
  suggestionType: string;
  fieldName?: string;
  originalValue?: string;
  suggestedValue: string;
  reasoning: string;
  priority: string;
  status: string;
  appliedAt?: string;
  createdAt: string;
}

interface AiSuggestionsProps {
  permitId: number;
  disabled?: boolean;
}

export function AiSuggestions({ permitId, disabled = false }: AiSuggestionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  const [resultType, setResultType] = useState<'success' | 'error'>('success');
  const [analysisStage, setAnalysisStage] = useState('checking');



  const { data: allSuggestions = [], isLoading, error } = useQuery<AiSuggestion[]>({
    queryKey: [`/api/permits/${permitId}/suggestions`],
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });



  // Filter suggestions for current permit and pending status
  const suggestions = allSuggestions.filter(suggestion => 
    suggestion.status === 'pending' && suggestion.permitId === permitId
  );

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      setAnalysisStage('checking');

      // Check if webhook is configured before starting analysis
      const response = await fetch('/api/webhook-configs');
      const webhookConfigs = await response.json();
      const activeWebhook = webhookConfigs.find((config: any) => config.isActive);

      if (!activeWebhook) {
        throw new Error('Keine aktive Webhook-Konfiguration gefunden. Bitte konfigurieren Sie eine n8n Webhook-URL in den Einstellungen.');
      }

      setAnalysisStage('analyzing');
      return apiRequest(`/api/permits/${permitId}/analyze`, "POST");
    },
    onMutate: () => {
      setAnalysisDialogOpen(true);
      setIsAnalyzing(true);
    },
    onSuccess: () => {
      // Poll for new suggestions with proper completion detection
      const pollInterval = setInterval(async () => {
        queryClient.invalidateQueries({ queryKey: [`/api/permits/${permitId}/suggestions`] });

        // Check if suggestions have been received
        const currentSuggestions = queryClient.getQueryData([`/api/permits/${permitId}/suggestions`]) as any[];
        if (currentSuggestions && currentSuggestions.length > 0) {
          clearInterval(pollInterval);
          setIsAnalyzing(false);
          setAnalysisDialogOpen(false);
          setResultType('success');
          setResultMessage(`AI-Analyse abgeschlossen. ${currentSuggestions.length} Verbesserungsvorschläge erhalten.`);
          setResultDialogOpen(true);
        }
      }, 3000);

      // Stop polling after 3 minutes with timeout message
      setTimeout(() => {
        clearInterval(pollInterval);
        if (isAnalyzing) {
          setIsAnalyzing(false);
          setAnalysisDialogOpen(false);
          setResultType('error');
          setResultMessage('AI-Analyse-Timeout. Bitte versuchen Sie es erneut.');
          setResultDialogOpen(true);
        }
      }, 180000);
    },
    onError: (error: any) => {
      setIsAnalyzing(false);
      setAnalysisDialogOpen(false);
      setResultType('error');
      setResultMessage(error.message || "Die AI-Analyse konnte nicht gestartet werden.");
      setResultDialogOpen(true);
    },
  });

  const applySuggestionMutation = useMutation({
    mutationFn: async (suggestionId: number) => {
      console.log(`Applying suggestion ${suggestionId} with React Query`);
      const response = await apiRequest(`/api/suggestions/${suggestionId}/apply`, 'POST');
      return await response.json();
    },
    onSuccess: (data) => {
      console.log("Client: onSuccess called with:", data);
      
      // LÖSUNG 2: Erweiterte Query-Invalidierung für AI-Vorschläge
      // Invalidiere alle relevanten Queries um State-Synchronisation zu gewährleisten
      queryClient.invalidateQueries({ queryKey: [`/api/permits/${permitId}/suggestions`] });
      queryClient.invalidateQueries({ queryKey: [`/api/permits/${permitId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });

      // Force refetch permit data immediately to trigger React effect updates
      queryClient.refetchQueries({ queryKey: [`/api/permits/${permitId}`] });
      
      // Zusätzliche Invalidierung für bessere State-Synchronisation
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      console.log("AI-Suggestions: Cache invalidated, permit data will be refetched");

      toast({
        title: "Vorschlag übernommen",
        description: data?.message || "Der AI-Vorschlag wurde erfolgreich in die Genehmigung übernommen.",
      });
    },
    onError: (error: any) => {
      console.error("Client: onError called with:", error);
      console.error("Client: Error type:", typeof error);
      console.error("Client: Error constructor:", error?.constructor?.name);
      const errorMessage = error?.message || String(error) || "Der Vorschlag konnte nicht übernommen werden.";
      toast({
        title: "Fehler",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ suggestionId, status }: { suggestionId: number; status: string }) => {
      return fetch(`/api/suggestions/${suggestionId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      })
      .then(async (response) => {
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API Error: ${response.status} - ${errorText}`);
        }
        return await response.json();
      })
      .catch((error) => {
        throw new Error(`Network Error: ${error.message}`);
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/permits/${permitId}/suggestions`] });
      toast({
        title: variables.status === 'accepted' ? 'Vorschlag akzeptiert' : 'Vorschlag abgelehnt',
        description: variables.status === 'accepted' ? 'Änderung wurde akzeptiert.' : 'Änderung wurde abgelehnt.',
      });
    },
    onError: (error: any) => {
      console.error("Status update error:", error);
      const errorMessage = error?.message || String(error) || "Fehler beim Aktualisieren des Vorschlags.";
      toast({
        title: "Fehler",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleApplyAll = () => {
    console.log(`Applying all suggestions for permit ${permitId} via iframe`);

    toast({
      title: "Alle Vorschläge werden übernommen...",
      description: "Bitte warten Sie einen Moment.",
    });

    // Create hidden iframe to make the request without leaving the page
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = `/api/permits/${permitId}/suggestions/apply-all?redirect=/success`;

    iframe.onload = () => {
      // LÖSUNG 2: Erweiterte Query-Invalidierung für "Alle anwenden"
      queryClient.invalidateQueries({ queryKey: [`/api/permits/${permitId}/suggestions`] });
      queryClient.invalidateQueries({ queryKey: [`/api/permits/${permitId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/permits'] });
      
      // Force refetch permit data immediately to trigger React effect updates
      queryClient.refetchQueries({ queryKey: [`/api/permits/${permitId}`] });
      
      console.log("AI-Suggestions: Cache invalidated after applying all suggestions");

      toast({
        title: "Alle Vorschläge übernommen",
        description: "Alle AI-Vorschläge wurden erfolgreich übernommen.",
      });

      // Clean up
      document.body.removeChild(iframe);
    };

    iframe.onerror = () => {
      toast({
        title: "Fehler",
        description: "Fehler beim Übernehmen aller Vorschläge.",
        variant: "destructive",
      });
      document.body.removeChild(iframe);
    };

    document.body.appendChild(iframe);
  };

  const applyAllMutation = useMutation({
    mutationFn: async () => {
      // This is kept for backward compatibility but will be replaced with navigation
      const response = await apiRequest(`/api/permits/${permitId}/suggestions/apply-all`, 'POST');
      return await response.json();
    },
    onSuccess: (data: any) => {
      // LÖSUNG 2: Erweiterte Query-Invalidierung für applyAllMutation
      queryClient.invalidateQueries({ queryKey: [`/api/permits/${permitId}/suggestions`] });
      queryClient.invalidateQueries({ queryKey: [`/api/permits/${permitId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
      
      // Force refetch permit data immediately
      queryClient.refetchQueries({ queryKey: [`/api/permits/${permitId}`] });
      
      toast({
        title: "Alle Vorschläge übernommen",
        description: data?.message || 'Alle Vorschläge wurden erfolgreich übernommen.',
      });
    },
    onError: (error: any) => {
      console.error("Apply all error:", error);
      const errorMessage = error?.message || String(error) || "Fehler beim Übernehmen aller Vorschläge.";
      toast({
        title: "Fehler",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const rejectAllMutation = useMutation({
    mutationFn: () => {
      return fetch(`/api/permits/${permitId}/suggestions/reject-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })
      .then(async (response) => {
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API Error: ${response.status} - ${errorText}`);
        }
        return await response.json();
      })
      .catch((error) => {
        throw new Error(`Network Error: ${error.message}`);
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/permits/${permitId}/suggestions`] });
      toast({
        title: "Alle Vorschläge abgelehnt",
        description: data?.message || 'Alle Vorschläge wurden abgelehnt.',
      });
    },
    onError: (error: any) => {
      console.error("Reject all error:", error);
      const errorMessage = error?.message || String(error) || "Fehler beim Ablehnen aller Vorschläge.";
      toast({
        title: "Fehler",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => {
      return fetch(`/api/permits/${permitId}/suggestions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })
      .then(async (response) => {
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API Error: ${response.status} - ${errorText}`);
        }
        return await response.json();
      })
      .catch((error) => {
        throw new Error(`Network Error: ${error.message}`);
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/permits/${permitId}/suggestions`] });
      toast({
        title: "Alle Vorschläge gelöscht",
        description: data?.message || 'Alle Vorschläge wurden erfolgreich gelöscht.',
      });
    },
    onError: (error: any) => {
      console.error("Delete all error:", error);
      const errorMessage = error?.message || String(error) || "Fehler beim Löschen aller Vorschläge.";
      toast({
        title: "Fehler",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleApplySuggestion = async (suggestionId: number) => {
    console.log(`Applying suggestion ${suggestionId} via iframe`);

    toast({
      title: "Vorschlag wird übernommen...",
      description: "Bitte warten Sie einen Moment.",
    });

    // Create hidden iframe to make the request without leaving the page
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = `/api/suggestions/${suggestionId}/apply?redirect=/success`;

    iframe.onload = () => {
      // Request completed, refresh the suggestions and permit data
      queryClient.invalidateQueries({ queryKey: [`/api/permits/${permitId}/suggestions`] });
      queryClient.invalidateQueries({ queryKey: [`/api/permits/${permitId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/permits'] });

      toast({
        title: "Vorschlag übernommen",
        description: "Der AI-Vorschlag wurde erfolgreich in die Genehmigung übernommen.",
      });

      // Clean up
      document.body.removeChild(iframe);
    };

    iframe.onerror = () => {
      toast({
        title: "Fehler",
        description: "Fehler beim Übernehmen des Vorschlags.",
        variant: "destructive",
      });
      document.body.removeChild(iframe);
    };

    document.body.appendChild(iframe);
  };

  const handleAcceptSuggestion = (suggestionId: number) => {
    updateStatusMutation.mutate({ suggestionId, status: 'accepted' });
  };

  const handleRejectSuggestion = (suggestionId: number) => {
    updateStatusMutation.mutate({ suggestionId, status: 'rejected' });
  };

  const getPriorityColor = (priority: string | undefined) => {
    if (!priority) return 'bg-gray-100 text-gray-800 border-gray-200';
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string | undefined) => {
    if (!priority) return <Lightbulb className="h-4 w-4" />;
    switch (priority) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <Lightbulb className="h-4 w-4" />;
      case 'low': return <Lightbulb className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'improvement': return 'Verbesserung';
      case 'safety': return 'Sicherheit';
      case 'compliance': return 'Compliance';
      default: return type;
    }
  };

  const getFieldLabel = (fieldName: string) => {
    switch (fieldName) {
      case 'preventiveMeasures': return 'Maßnahmen vor Arbeitsbeginn';
      case 'beforeWorkStarts': return 'Maßnahmen vor Arbeitsbeginn';
      case 'immediateActions': return 'Sofortmaßnahmen';
      case 'additionalComments': return 'Zusätzliche Sicherheitshinweise';
      case 'selectedHazards': return 'Ausgewählte Gefährdungen';
      case 'hazardNotes': return 'Gefährdungsnotizen';
      case 'overallRisk': return 'Gesamtrisiko';
      case 'identifiedHazards': return 'Identifizierte Gefährdungen';
      case 'riskLevel': return 'Risikostufe';
      case 'complianceNotes': return 'Compliance-Hinweise';
      case 'performerName': return 'Durchführende Person';
      case 'emergencyContact': return 'Notfallkontakt';
      case 'completedMeasures': return 'Abgeschlossene Maßnahmen';
      default: return fieldName;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-600" />
        </div>
        <Button
          onClick={() => analyzeMutation.mutate()}
          disabled={analyzeMutation.isPending || isAnalyzing}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700"
        >
          {analyzeMutation.isPending || isAnalyzing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          {isAnalyzing ? 'Analysiert...' : 'AI-Analyse starten'}
        </Button>
      </div>

      {suggestions.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={handleApplyAll}
            size="sm"
            variant="outline"
            className="text-green-600 border-green-600 hover:bg-green-50"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Alle übernehmen
          </Button>

          <Button
            onClick={() => rejectAllMutation.mutate()}
            disabled={rejectAllMutation.isPending}
            size="sm"
            variant="outline"
            className="text-orange-600 border-orange-600 hover:bg-orange-50"
          >
            {rejectAllMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            Alle ablehnen
          </Button>

          <Button
            onClick={() => deleteAllMutation.mutate()}
            disabled={deleteAllMutation.isPending}
            size="sm"
            variant="outline"
            className="text-red-600 border-red-600 hover:bg-red-50"
          >
            {deleteAllMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Alle löschen
          </Button>
        </div>
      )}

      <div>
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-blue-600 mb-4" />
            <p className="text-secondary-gray">Lade AI-Vorschläge...</p>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-8 text-secondary-gray">
            <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Keine AI-Vorschläge verfügbar</p>
            <p className="text-sm">Starten Sie eine AI-Analyse, um Verbesserungsvorschläge zu erhalten</p>
          </div>
        ) : (
          <div className="space-y-4">
            {suggestions.map((suggestion) => (
              <div key={suggestion.id} className="border rounded-lg p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge 
                      variant="outline" 
                      className={getPriorityColor(suggestion.priority)}
                    >
                      {getPriorityIcon(suggestion.priority)}
                      <span className="ml-1">{suggestion.priority ? suggestion.priority.charAt(0).toUpperCase() + suggestion.priority.slice(1) : 'Unbekannt'}</span>
                    </Badge>
                    <Badge variant="secondary">
                      {getTypeLabel(suggestion.suggestionType)}
                    </Badge>
                    {suggestion.fieldName && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        {getFieldLabel(suggestion.fieldName)}
                      </Badge>
                    )}
                    {suggestion.status === 'accepted' && (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Übernommen
                      </Badge>
                    )}
                    {suggestion.status === 'rejected' && (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Abgelehnt
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-secondary-gray">
                    {new Date(suggestion.createdAt).toLocaleString('de-DE')}
                  </span>
                </div>

                {/* Content */}
                <div className="space-y-2">
                  {suggestion.fieldName && suggestion.originalValue && (
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-sm font-medium text-gray-700 mb-1">Aktueller Wert:</p>
                      <p className="text-sm text-gray-600 font-mono">{suggestion.originalValue}</p>
                    </div>
                  )}

                  <div className="bg-blue-50 p-3 rounded">
                    <p className="text-sm font-medium text-blue-700 mb-1">Vorgeschlagene Verbesserung:</p>
                    <p className="text-sm text-blue-600">{suggestion.suggestedValue}</p>
                  </div>

                  <div className="bg-yellow-50 p-3 rounded">
                    <p className="text-sm font-medium text-yellow-700 mb-1">Begründung:</p>
                    <p className="text-sm text-yellow-600">{suggestion.reasoning}</p>
                  </div>
                </div>

                {/* Actions */}
                {suggestion.status === 'pending' && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApplySuggestion(suggestion.id)}
                        disabled={applySuggestionMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Übernehmen
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejectSuggestion(suggestion.id)}
                        disabled={updateStatusMutation.isPending}
                        className="text-red-600 border-red-600 hover:bg-red-50"
                      >
                        <ThumbsDown className="h-4 w-4 mr-1" />
                        Ablehnen
                      </Button>
                    </div>
                  </>
                )}

                {suggestion.appliedAt && (
                  <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                    Automatisch übernommen am {new Date(suggestion.appliedAt).toLocaleString('de-DE')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Analysis Progress Dialog */}
      <Dialog open={analysisDialogOpen} onOpenChange={setAnalysisDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI-Analyse läuft</DialogTitle>
            <DialogDescription>
              Die Genehmigung wird analysiert, um Verbesserungsvorschläge zu finden.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-blue-600" />
              <div className="space-y-2">
                {analysisStage === 'checking' && (
                  <>
                    <p className="text-lg font-medium">Prüfe Webhook-Konfiguration...</p>
                    <p className="text-sm text-gray-600">Überprüfe AI-System Verfügbarkeit</p>
                  </>
                )}
                {analysisStage === 'testing' && (
                  <>
                    <p className="text-lg font-medium">Teste Verbindung...</p>
                    <p className="text-sm text-gray-600">Verbinde mit n8n Webhook</p>
                  </>
                )}
                {analysisStage === 'analyzing' && (
                  <>
                    <p className="text-lg font-medium">Analysiere Genehmigung...</p>
                    <p className="text-sm text-gray-600">Denke nach über mögliche Verbesserungen</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Result Dialog */}
      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {resultType === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              {resultType === 'success' ? 'Erfolgreich' : 'Fehler'}
            </DialogTitle>
            <DialogDescription>
              {resultType === 'success' 
                ? 'Die Aktion wurde erfolgreich ausgeführt.' 
                : 'Bei der Ausführung ist ein Fehler aufgetreten.'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700">{resultMessage}</p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setResultDialogOpen(false)}>
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}