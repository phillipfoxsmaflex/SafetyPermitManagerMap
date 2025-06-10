import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle, XCircle, Clock, AlertTriangle, CheckIcon, XIcon, Trash2, Brain, ChevronDown, ChevronRight, Diff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
}

// Diff component to show original vs suggested values
function DiffView({ original, suggested, fieldName }: { original?: string; suggested: string; fieldName?: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!original) {
    return (
      <div className="bg-green-50 border border-green-200 rounded p-3">
        <div className="flex items-center gap-2 mb-2">
          <Diff className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-800">Neuer Wert {fieldName ? `für ${fieldName}` : ''}</span>
        </div>
        <div className="text-sm text-green-700">{suggested}</div>
      </div>
    );
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="p-0 h-auto">
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <Diff className="h-4 w-4" />
            <span className="text-sm">Änderungen anzeigen {fieldName ? `(${fieldName})` : ''}</span>
          </div>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 mt-2">
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <div className="text-xs font-medium text-red-800 mb-1">Aktuell:</div>
          <div className="text-sm text-red-700">{original}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded p-3">
          <div className="text-xs font-medium text-green-800 mb-1">Vorschlag:</div>
          <div className="text-sm text-green-700">{suggested}</div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// Simple fetch wrapper with proper error handling
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Request failed: ${response.status} ${response.statusText}. ${errorText}`);
  }

  return response.json();
}

export function AiSuggestionsNew({ permitId }: AiSuggestionsProps) {
  const { toast } = useToast();
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [resultType, setResultType] = useState<'success' | 'error'>('success');
  const [resultMessage, setResultMessage] = useState('');
  const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false);

  // Fetch suggestions
  const { data: suggestions = [], isLoading, refetch } = useQuery({
    queryKey: [`/api/permits/${permitId}/suggestions`],
    queryFn: () => fetchWithAuth(`/api/permits/${permitId}/suggestions`),
  });

  // Start AI analysis with loading modal
  const startAnalysisMutation = useMutation({
    mutationFn: () => 
      fetchWithAuth(`/api/permits/${permitId}/analyze`, { method: 'POST' }),
    onMutate: () => {
      setAnalysisDialogOpen(true);
    },
    onSuccess: () => {
      // Refetch suggestions after a delay to allow processing
      setTimeout(() => {
        refetch();
        setAnalysisDialogOpen(false);
        setResultType('success');
        setResultMessage('AI-Analyse abgeschlossen. Neue Vorschläge verfügbar.');
        setResultDialogOpen(true);
      }, 3000);
    },
    onError: (error: Error) => {
      setAnalysisDialogOpen(false);
      setResultType('error');
      setResultMessage(`Fehler beim Starten der Analyse: ${error.message}`);
      setResultDialogOpen(true);
    },
  });

  // Apply single suggestion
  const applySuggestionMutation = useMutation({
    mutationFn: async (suggestionId: number) => {
      console.log('Applying suggestion:', suggestionId);
      const result = await fetchWithAuth(`/api/suggestions/${suggestionId}/apply`, { method: 'POST' });
      console.log('Apply suggestion result:', result);
      return result;
    },
    onSuccess: (data, suggestionId) => {
      console.log('Apply suggestion success:', data, suggestionId);
      refetch();
      queryClient.invalidateQueries({ queryKey: [`/api/permits/${permitId}`] });
      setResultType('success');
      setResultMessage('Vorschlag erfolgreich übernommen');
      setResultDialogOpen(true);
    },
    onError: (error: Error) => {
      console.error('Apply suggestion error:', error);
      setResultType('error');
      setResultMessage(`Fehler beim Übernehmen: ${error.message}`);
      setResultDialogOpen(true);
    },
  });

  // Update suggestion status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ suggestionId, status }: { suggestionId: number; status: string }) => {
      console.log('Updating suggestion status:', suggestionId, status);
      const result = await fetchWithAuth(`/api/suggestions/${suggestionId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      console.log('Update status result:', result);
      return result;
    },
    onSuccess: (data, variables) => {
      console.log('Update status success:', data, variables);
      refetch();
      setResultType('success');
      setResultMessage(variables.status === 'accepted' ? 'Vorschlag akzeptiert' : 'Vorschlag abgelehnt');
      setResultDialogOpen(true);
    },
    onError: (error: Error) => {
      console.error('Update status error:', error);
      setResultType('error');
      setResultMessage(`Fehler beim Aktualisieren: ${error.message}`);
      setResultDialogOpen(true);
    },
  });

  // Apply all suggestions
  const applyAllMutation = useMutation({
    mutationFn: () => 
      fetchWithAuth(`/api/permits/${permitId}/suggestions/apply-all`, { method: 'POST' }),
    onSuccess: (data) => {
      refetch();
      queryClient.invalidateQueries({ queryKey: [`/api/permits/${permitId}`] });
      setResultType('success');
      setResultMessage(data?.message || 'Alle Vorschläge erfolgreich übernommen');
      setResultDialogOpen(true);
    },
    onError: (error: Error) => {
      setResultType('error');
      setResultMessage(`Fehler beim Übernehmen aller Vorschläge: ${error.message}`);
      setResultDialogOpen(true);
    },
  });

  // Reject all suggestions
  const rejectAllMutation = useMutation({
    mutationFn: () => 
      fetchWithAuth(`/api/permits/${permitId}/suggestions/reject-all`, { method: 'POST' }),
    onSuccess: (data) => {
      refetch();
      setResultType('success');
      setResultMessage(data?.message || 'Alle Vorschläge abgelehnt');
      setResultDialogOpen(true);
    },
    onError: (error: Error) => {
      setResultType('error');
      setResultMessage(`Fehler beim Ablehnen: ${error.message}`);
      setResultDialogOpen(true);
    },
  });

  // Delete all suggestions
  const deleteAllMutation = useMutation({
    mutationFn: () => 
      fetchWithAuth(`/api/permits/${permitId}/suggestions`, { method: 'DELETE' }),
    onSuccess: (data) => {
      refetch();
      setResultType('success');
      setResultMessage(data?.message || 'Alle Vorschläge gelöscht');
      setResultDialogOpen(true);
    },
    onError: (error: Error) => {
      setResultType('error');
      setResultMessage(`Fehler beim Löschen: ${error.message}`);
      setResultDialogOpen(true);
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'accepted': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'applied': return <CheckIcon className="h-4 w-4 text-blue-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI-Vorschläge</CardTitle>
          <CardDescription>Lade Vorschläge...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Show empty state with AI analysis button if no suggestions
  if (!suggestions.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            AI-Vorschläge (0)
            <Button
              onClick={() => startAnalysisMutation.mutate()}
              disabled={startAnalysisMutation.isPending}
              size="sm"
              variant="outline"
              className="flex items-center gap-2"
            >
              <Brain className="h-4 w-4" />
              {startAnalysisMutation.isPending ? 'Analysiert...' : 'AI-Analyse starten'}
            </Button>
          </CardTitle>
          <CardDescription>
            Keine Vorschläge verfügbar. Starten Sie eine AI-Analyse für automatische Verbesserungsvorschläge.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const pendingSuggestions = suggestions.filter((s: AiSuggestion) => s.status === 'pending');

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            AI-Vorschläge ({suggestions.length})
            <div className="flex gap-2">
              {/* AI Analysis Button */}
              <Button
                onClick={() => startAnalysisMutation.mutate()}
                disabled={startAnalysisMutation.isPending}
                size="sm"
                variant="outline"
                className="flex items-center gap-2"
              >
                <Brain className="h-4 w-4" />
                {startAnalysisMutation.isPending ? 'Analysiert...' : 'AI-Analyse starten'}
              </Button>
              
              {/* Bulk Actions */}
              {pendingSuggestions.length > 0 && (
                <>
                  <Button
                    onClick={() => applyAllMutation.mutate()}
                    disabled={applyAllMutation.isPending}
                    size="sm"
                    variant="default"
                  >
                    Alle übernehmen
                  </Button>
                  <Button
                    onClick={() => rejectAllMutation.mutate()}
                    disabled={rejectAllMutation.isPending}
                    size="sm"
                    variant="outline"
                  >
                    Alle ablehnen
                  </Button>
                  <Button
                    onClick={() => deleteAllMutation.mutate()}
                    disabled={deleteAllMutation.isPending}
                    size="sm"
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </CardTitle>
          <CardDescription>
            KI-generierte Verbesserungsvorschläge für diesen Erlaubnisschein
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {suggestions.map((suggestion: AiSuggestion) => (
            <div key={suggestion.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(suggestion.status)}
                  <Badge className={getPriorityColor(suggestion.priority)}>
                    {suggestion.priority} Priorität
                  </Badge>
                  <Badge variant="outline">{suggestion.suggestionType}</Badge>
                </div>
                {suggestion.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => applySuggestionMutation.mutate(suggestion.id)}
                      disabled={applySuggestionMutation.isPending}
                      size="sm"
                      variant="default"
                    >
                      <CheckIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => updateStatusMutation.mutate({ suggestionId: suggestion.id, status: 'rejected' })}
                      disabled={updateStatusMutation.isPending}
                      size="sm"
                      variant="outline"
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {suggestion.fieldName && (
                <div>
                  <span className="font-medium">Feld: </span>
                  <span className="text-sm">{suggestion.fieldName}</span>
                </div>
              )}

              {/* Diff View */}
              <DiffView 
                original={suggestion.originalValue} 
                suggested={suggestion.suggestedValue}
                fieldName={suggestion.fieldName}
              />

              <div>
                <span className="font-medium">Begründung: </span>
                <span className="text-sm text-muted-foreground">{suggestion.reasoning}</span>
              </div>

              <div className="text-xs text-muted-foreground">
                Erstellt: {new Date(suggestion.createdAt).toLocaleString('de-DE')}
                {suggestion.appliedAt && (
                  <> • Angewendet: {new Date(suggestion.appliedAt).toLocaleString('de-DE')}</>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Analysis Loading Dialog */}
      <Dialog open={analysisDialogOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              AI-Analyse läuft
            </DialogTitle>
            <DialogDescription>
              Die KI analysiert den Erlaubnisschein und generiert Verbesserungsvorschläge. 
              Dies kann einige Sekunden dauern...
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        </DialogContent>
      </Dialog>

      {/* Result Dialog */}
      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {resultType === 'success' ? 'Erfolg' : 'Fehler'}
            </DialogTitle>
            <DialogDescription>
              {resultMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setResultDialogOpen(false)}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}