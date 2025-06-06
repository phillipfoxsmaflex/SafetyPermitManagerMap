import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Bot, 
  ThumbsUp, 
  ThumbsDown, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Lightbulb,
  Send,
  Loader2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

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

export function AiSuggestions({ permitId }: AiSuggestionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: suggestions = [], isLoading } = useQuery<AiSuggestion[]>({
    queryKey: ["/api/permits", permitId, "suggestions"],
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/permits/${permitId}/analyze`, "POST");
    },
    onSuccess: () => {
      setIsAnalyzing(true);
      toast({
        title: "AI-Analyse gestartet",
        description: "Die Genehmigung wird zur Verbesserung analysiert. Vorschläge werden in Kürze verfügbar sein.",
      });
      
      // Poll for new suggestions
      const pollInterval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/permits", permitId, "suggestions"] });
      }, 5000);

      // Stop polling after 2 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        setIsAnalyzing(false);
      }, 120000);
    },
    onError: (error: any) => {
      toast({
        title: "Fehler bei AI-Analyse",
        description: error.message || "Die AI-Analyse konnte nicht gestartet werden.",
        variant: "destructive",
      });
    },
  });

  const applySuggestionMutation = useMutation({
    mutationFn: async (suggestionId: number) => {
      return apiRequest(`/api/suggestions/${suggestionId}/apply`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permits", permitId, "suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/permits", permitId] });
      toast({
        title: "Vorschlag übernommen",
        description: "Der AI-Vorschlag wurde erfolgreich in die Genehmigung übernommen.",
      });
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Der Vorschlag konnte nicht übernommen werden.",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ suggestionId, status }: { suggestionId: number; status: string }) => {
      return apiRequest(`/api/suggestions/${suggestionId}/status`, "PATCH", { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permits", permitId, "suggestions"] });
    },
  });

  const handleApplySuggestion = (suggestionId: number) => {
    applySuggestionMutation.mutate(suggestionId);
  };

  const handleAcceptSuggestion = (suggestionId: number) => {
    updateStatusMutation.mutate({ suggestionId, status: 'accepted' });
  };

  const handleRejectSuggestion = (suggestionId: number) => {
    updateStatusMutation.mutate({ suggestionId, status: 'rejected' });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
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

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-600" />
            AI-Verbesserungsvorschläge
          </CardTitle>
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
      </CardHeader>
      <CardContent>
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
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant="outline" 
                      className={getPriorityColor(suggestion.priority)}
                    >
                      {getPriorityIcon(suggestion.priority)}
                      <span className="ml-1">{suggestion.priority.charAt(0).toUpperCase() + suggestion.priority.slice(1)}</span>
                    </Badge>
                    <Badge variant="secondary">
                      {getTypeLabel(suggestion.suggestionType)}
                    </Badge>
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
                      {suggestion.fieldName && (
                        <Button
                          size="sm"
                          onClick={() => handleApplySuggestion(suggestion.id)}
                          disabled={applySuggestionMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Automatisch übernehmen
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAcceptSuggestion(suggestion.id)}
                        disabled={updateStatusMutation.isPending}
                      >
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        Akzeptieren
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejectSuggestion(suggestion.id)}
                        disabled={updateStatusMutation.isPending}
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
      </CardContent>
    </Card>
  );
}