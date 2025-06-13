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

interface CreateAiSuggestionsProps {
  temporaryPermitId?: number;
  onAnalysisStart: () => Promise<number>; // Returns the created permit ID
}

export function CreateAiSuggestions({ temporaryPermitId, onAnalysisStart }: CreateAiSuggestionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  const [resultType, setResultType] = useState<'success' | 'error'>('success');
  const [analysisStage, setAnalysisStage] = useState('checking');
  const [activePermitId, setActivePermitId] = useState<number | undefined>(temporaryPermitId);

  // Fetch suggestions if we have an active permit
  const { data: suggestions = [], isLoading, refetch } = useQuery<AiSuggestion[]>({
    queryKey: [`/api/permits/${activePermitId}/suggestions`],
    enabled: !!activePermitId,
  });

  const startAnalysisMutation = useMutation({
    mutationFn: async () => {
      // Create temporary permit first
      const permitId = await onAnalysisStart();
      setActivePermitId(permitId);
      
      // Start analysis
      const response = await fetch(`/api/permits/${permitId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI-Analyse fehlgeschlagen: ${response.status} - ${errorText}`);
      }
      
      return permitId;
    },
    onMutate: () => {
      setIsAnalyzing(true);
      setAnalysisDialogOpen(true);
      setAnalysisStage('checking');
    },
    onSuccess: (permitId) => {
      console.log("Analysis started for permit:", permitId);
      
      // Start polling for results
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/permits/${permitId}/suggestions`, {
            credentials: "include"
          });
          if (response.ok) {
            const suggestions = await response.json();
            if (suggestions.length > 0) {
              clearInterval(pollInterval);
              setIsAnalyzing(false);
              setAnalysisDialogOpen(false);
              setResultType('success');
              setResultMessage(`AI-Analyse abgeschlossen. ${suggestions.length} Verbesserungsvorschläge erhalten.`);
              setResultDialogOpen(true);
              refetch();
            }
          }
        } catch (error) {
          console.error("Polling error:", error);
        }
      }, 3000);

      // Stop polling after 3 minutes
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
      const response = await apiRequest(`/api/suggestions/${suggestionId}/apply`, 'POST');
      return await response.json();
    },
    onSuccess: (data) => {
      if (activePermitId) {
        queryClient.invalidateQueries({ queryKey: [`/api/permits/${activePermitId}/suggestions`] });
        queryClient.invalidateQueries({ queryKey: [`/api/permits/${activePermitId}`] });
        queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
        queryClient.refetchQueries({ queryKey: [`/api/permits/${activePermitId}`] });
      }
      
      toast({
        title: "Vorschlag übernommen",
        description: data?.message || "Der AI-Vorschlag wurde erfolgreich übernommen.",
      });
    },
    onError: (error: any) => {
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
      }).then(async (response) => {
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API Error: ${response.status} - ${errorText}`);
        }
        return await response.json();
      });
    },
    onSuccess: (data, variables) => {
      if (activePermitId) {
        queryClient.invalidateQueries({ queryKey: [`/api/permits/${activePermitId}/suggestions`] });
      }
      toast({
        title: variables.status === 'accepted' ? 'Vorschlag akzeptiert' : 'Vorschlag abgelehnt',
        description: variables.status === 'accepted' ? 'Änderung wurde akzeptiert.' : 'Änderung wurde abgelehnt.',
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || String(error) || "Fehler beim Aktualisieren des Vorschlags.";
      toast({
        title: "Fehler",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleApplyAll = () => {
    if (!activePermitId) return;
    
    toast({
      title: "Alle Vorschläge werden übernommen...",
      description: "Bitte warten Sie einen Moment.",
    });

    fetch(`/api/permits/${activePermitId}/suggestions/apply-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    })
    .then(async (response) => {
      if (response.ok) {
        const data = await response.json();
        queryClient.invalidateQueries({ queryKey: [`/api/permits/${activePermitId}/suggestions`] });
        queryClient.invalidateQueries({ queryKey: [`/api/permits/${activePermitId}`] });
        queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
        queryClient.refetchQueries({ queryKey: [`/api/permits/${activePermitId}`] });
        
        toast({
          title: "Alle Vorschläge übernommen",
          description: `${data.applied || 0} Vorschläge wurden erfolgreich übernommen.`,
        });
      } else {
        throw new Error("Fehler beim Übernehmen aller Vorschläge");
      }
    })
    .catch((error) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Übernehmen aller Vorschläge.",
        variant: "destructive",
      });
    });
  };

  const handleRejectAll = () => {
    if (!activePermitId) return;
    
    fetch(`/api/permits/${activePermitId}/suggestions/reject-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    })
    .then(async (response) => {
      if (response.ok) {
        const data = await response.json();
        queryClient.invalidateQueries({ queryKey: [`/api/permits/${activePermitId}/suggestions`] });
        
        toast({
          title: "Alle Vorschläge abgelehnt",
          description: `${data.rejected || 0} Vorschläge wurden abgelehnt.`,
        });
      } else {
        throw new Error("Fehler beim Ablehnen aller Vorschläge");
      }
    })
    .catch((error) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Ablehnen aller Vorschläge.",
        variant: "destructive",
      });
    });
  };

  const handleDeleteAll = () => {
    if (!activePermitId) return;
    
    fetch(`/api/permits/${activePermitId}/suggestions/delete-all`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    })
    .then(async (response) => {
      if (response.ok) {
        const data = await response.json();
        queryClient.invalidateQueries({ queryKey: [`/api/permits/${activePermitId}/suggestions`] });
        
        toast({
          title: "Alle Vorschläge gelöscht",
          description: `${data.deleted || 0} Vorschläge wurden gelöscht.`,
        });
      } else {
        throw new Error("Fehler beim Löschen aller Vorschläge");
      }
    })
    .catch((error) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Löschen aller Vorschläge.",
        variant: "destructive",
      });
    });
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'outline';
      case 'accepted': return 'default';
      case 'rejected': return 'secondary';
      case 'applied': return 'default';
      default: return 'outline';
    }
  };

  if (!activePermitId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">KI-Verbesserungsvorschläge</h3>
          <Button 
            onClick={() => startAnalysisMutation.mutate()}
            disabled={startAnalysisMutation.isPending}
            className="flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            AI-Analyse starten
          </Button>
        </div>
        
        <div className="text-center py-8">
          <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Keine AI-Vorschläge verfügbar</p>
          <p className="text-sm text-muted-foreground">
            Starten Sie eine AI-Analyse, um Verbesserungsvorschläge zu erhalten
          </p>
        </div>

        {/* Analysis Progress Dialog */}
        <Dialog open={analysisDialogOpen} onOpenChange={setAnalysisDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>AI-Analyse läuft</DialogTitle>
              <DialogDescription>
                Die Genehmigung wird analysiert, um Verbesserungsvorschläge zu finden.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center space-y-4 py-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm text-center">Analysiere Genehmigung...</p>
              <p className="text-xs text-muted-foreground text-center">
                Denke nach über mögliche Verbesserungen
              </p>
            </div>
          </DialogContent>
        </Dialog>

        {/* Results Dialog */}
        <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
          <DialogContent className="sm:max-w-md">
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
                Die Aktion wurde erfolgreich ausgeführt.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm">{resultMessage}</p>
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">KI-Verbesserungsvorschläge</h3>
        <Button 
          onClick={() => startAnalysisMutation.mutate()}
          disabled={startAnalysisMutation.isPending}
          className="flex items-center gap-2"
        >
          <Send className="h-4 w-4" />
          AI-Analyse starten
        </Button>
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleApplyAll}
            className="flex items-center gap-1"
          >
            <CheckCircle className="h-4 w-4" />
            Alle übernehmen
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRejectAll}
            className="flex items-center gap-1"
          >
            <XCircle className="h-4 w-4" />
            Alle ablehnen
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDeleteAll}
            className="flex items-center gap-1"
          >
            <Trash2 className="h-4 w-4" />
            Alle löschen
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-4">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">Lade AI-Vorschläge...</p>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-8">
          <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Keine AI-Vorschläge verfügbar</p>
          <p className="text-sm text-muted-foreground">
            Starten Sie eine AI-Analyse, um Verbesserungsvorschläge zu erhalten
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <Card key={suggestion.id} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <Badge variant={getPriorityBadgeVariant(suggestion.priority)}>
                      {suggestion.priority === 'high' ? 'High' : 
                       suggestion.priority === 'medium' ? 'Medium' : 'Low'}
                    </Badge>
                    <Badge variant="outline">
                      {suggestion.suggestionType === 'hazard_replacement' ? 'Ausgewählte Gefährdungen' :
                       suggestion.suggestionType === 'hazard_notes' ? 'Gefährdungsnotizen' :
                       suggestion.suggestionType === 'field_improvement' ? 'Feldverbesserung' :
                       suggestion.suggestionType}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(suggestion.createdAt).toLocaleString('de-DE')}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {suggestion.originalValue && (
                  <div>
                    <p className="text-sm font-medium mb-1">Aktueller Wert:</p>
                    <p className="text-sm text-muted-foreground font-mono bg-gray-50 p-2 rounded">
                      {typeof suggestion.originalValue === 'string' && suggestion.originalValue.startsWith('[') ? 
                        JSON.parse(suggestion.originalValue).join(', ') : 
                        suggestion.originalValue}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium mb-1 text-blue-600">Vorgeschlagene Verbesserung:</p>
                  <p className="text-sm bg-blue-50 p-2 rounded font-mono">
                    {typeof suggestion.suggestedValue === 'string' && suggestion.suggestedValue.startsWith('[') ? 
                      JSON.parse(suggestion.suggestedValue).join(', ') : 
                      suggestion.suggestedValue}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium mb-1 text-amber-600">Begründung:</p>
                  <p className="text-sm bg-amber-50 p-2 rounded">
                    {suggestion.reasoning}
                  </p>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <Badge variant={getStatusBadgeVariant(suggestion.status)}>
                    {suggestion.status === 'pending' ? 'Ausstehend' :
                     suggestion.status === 'accepted' ? 'Akzeptiert' :
                     suggestion.status === 'rejected' ? 'Abgelehnt' :
                     suggestion.status === 'applied' ? 'Angewendet' :
                     suggestion.status}
                  </Badge>

                  {suggestion.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => applySuggestionMutation.mutate(suggestion.id)}
                        disabled={applySuggestionMutation.isPending}
                        className="flex items-center gap-1"
                      >
                        <ThumbsUp className="h-3 w-3" />
                        Übernehmen
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatusMutation.mutate({ 
                          suggestionId: suggestion.id, 
                          status: 'rejected' 
                        })}
                        disabled={updateStatusMutation.isPending}
                        className="flex items-center gap-1"
                      >
                        <ThumbsDown className="h-3 w-3" />
                        Ablehnen
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Analysis Progress Dialog */}
      <Dialog open={analysisDialogOpen} onOpenChange={setAnalysisDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>AI-Analyse läuft</DialogTitle>
            <DialogDescription>
              Die Genehmigung wird analysiert, um Verbesserungsvorschläge zu finden.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 py-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-center">Analysiere Genehmigung...</p>
            <p className="text-xs text-muted-foreground text-center">
              Denke nach über mögliche Verbesserungen
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Results Dialog */}
      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent className="sm:max-w-md">
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
              Die Aktion wurde erfolgreich ausgeführt.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">{resultMessage}</p>
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