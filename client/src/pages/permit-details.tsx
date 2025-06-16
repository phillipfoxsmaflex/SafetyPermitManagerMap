import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Edit, Printer, FileText, Users, Settings, Brain, GitBranch, Activity, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { PermitStatusBadge } from "@/components/permit-status-badge";
import { EditPermitModalUnified } from "@/components/edit-permit-modal-unified";
import { AiSuggestions } from "@/components/ai-suggestions";
import { WorkflowButtons } from "@/components/workflow-buttons";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PermitAttachments } from "@/components/permit-attachments";
import { StatusIndicator } from "@/components/status-indicator";
import { WorkflowVisualization } from "@/components/workflow-visualization";
import { Permit, User } from "@shared/schema";

export default function PermitDetails() {
  const [match, params] = useRoute("/permit/:id");
  const permitId = params?.id;
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: permit, isLoading } = useQuery<Permit>({
    queryKey: [`/api/permits/${permitId}`],
    enabled: !!permitId,
  });

  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const { data: workLocations = [] } = useQuery<any[]>({
    queryKey: ["/api/work-locations/active"],
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const formatDateTime = (date: Date | string | null) => {
    if (!date) return 'Nicht angegeben';
    return new Date(date).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'Nicht angegeben';
    return new Date(date).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
    });
  };

  const getPermitTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'general': 'Allgemeiner Erlaubnisschein',
      'hot_work': 'Heißarbeiten (Schweißen, Schneiden, Löten)',
      'height_work': 'Arbeiten in der Höhe (>2m Absturzgefahr)',
      'confined_space': 'Arbeiten in engen Räumen/Behältern',
      'electrical_work': 'Elektrische Arbeiten (Schaltanlagen, Kabel)',
      'chemical_work': 'Arbeiten mit Gefahrstoffen',
      'machinery_work': 'Arbeiten an Maschinen/Anlagen',
      'excavation': 'Erdarbeiten/Grabungen',
      'maintenance': 'Instandhaltungsarbeiten',
    };
    return typeMap[type] || type;
  };

  const getRiskLevel = (level: string) => {
    const levelMap: Record<string, { label: string; color: string }> = {
      'niedrig': { label: 'Niedrig', color: 'bg-green-100 text-green-800' },
      'mittel': { label: 'Mittel', color: 'bg-yellow-100 text-yellow-800' },
      'hoch': { label: 'Hoch', color: 'bg-red-100 text-red-800' },
    };
    return levelMap[level] || { label: level, color: 'bg-gray-100 text-gray-800' };
  };

  // TRBS-konforme Gefährdungsstruktur 
  const hazardCategories = {
    1: {
      name: "Mechanische Gefährdungen",
      hazards: [
        "Quetschung durch bewegte Teile",
        "Schneiden an scharfen Kanten", 
        "Stoßen an Gegenstände",
        "Erfasst werden von rotierenden Teilen",
        "Sturz durch rutschige Oberflächen"
      ]
    },
    2: {
      name: "Elektrische Gefährdungen",
      hazards: [
        "Stromschlag durch defekte Isolierung",
        "Lichtbogen bei Schalthandlungen",
        "Elektrostatische Aufladung", 
        "Blitzschlag bei Außenarbeiten",
        "Überspannung in Anlagen"
      ]
    },
    3: {
      name: "Gefahrstoffe",
      hazards: [
        "Einatmen von Dämpfen",
        "Hautkontakt mit Chemikalien",
        "Verschlucken von Substanzen",
        "Brand- und Explosionsgefahr",
        "Allergische Reaktionen"
      ]
    },
    4: {
      name: "Biologische Arbeitsstoffe",
      hazards: [
        "Infektionsgefahr durch Bakterien",
        "Virale Kontamination",
        "Pilzsporen in der Luft",
        "Parasitärer Befall",
        "Allergene biologische Stoffe"
      ]
    },
    5: {
      name: "Brand- und Explosionsgefährdungen",
      hazards: [
        "Entzündung brennbarer Stoffe",
        "Gasexplosion in Behältern",
        "Staubexplosion",
        "Selbstentzündung von Materialien",
        "Heiße Oberflächen"
      ]
    },
    6: {
      name: "Thermische Gefährdungen",
      hazards: [
        "Verbrennungen durch heiße Oberflächen",
        "Erfrierungen durch Kälte",
        "Hitzschlag bei hohen Temperaturen",
        "Unterkühlung in kalter Umgebung",
        "Strahlungswärme"
      ]
    },
    7: {
      name: "Gefährdungen durch spezielle physikalische Einwirkungen",
      hazards: [
        "Lärm über Grenzwerten",
        "Vibration durch Maschinen",
        "Ionisierende Strahlung",
        "Nichtionisierende Strahlung",
        "Unter- oder Überdruck"
      ]
    },
    8: {
      name: "Gefährdungen durch Arbeitsumgebungsbedingungen",
      hazards: [
        "Unzureichende Beleuchtung",
        "Klimatische Belastung",
        "Unzureichende Verkehrswege",
        "Absturzgefahr",
        "Ertrinkungsgefahr"
      ]
    },
    9: {
      name: "Physische Belastung/Arbeitsschwere",
      hazards: [
        "Schweres Heben und Tragen",
        "Ungünstige Körperhaltung",
        "Repetitive Bewegungen",
        "Einseitige Belastung",
        "Zeitdruck bei körperlicher Arbeit"
      ]
    },
    10: {
      name: "Psychische Faktoren",
      hazards: [
        "Stress durch Zeitdruck",
        "Überforderung bei komplexen Aufgaben",
        "Monotone Tätigkeiten",
        "Soziale Isolation",
        "Verantwortungsdruck"
      ]
    }
  };

  const getHazardDescription = (hazardId: string): { category: string; description: string; note?: string } => {
    const [categoryId, hazardIndex] = hazardId.split('-').map(Number);
    const category = hazardCategories[categoryId as keyof typeof hazardCategories];
    
    if (!category || !category.hazards[hazardIndex]) {
      return { category: `Kategorie ${categoryId}`, description: `Unbekannte Gefährdung ${hazardIndex + 1}` };
    }

    // Notiz für diese Gefährdung extrahieren
    let note: string | undefined;
    if (permit?.hazardNotes && permit.hazardNotes !== '{}') {
      try {
        const notes = JSON.parse(permit.hazardNotes);
        note = notes[hazardId];
      } catch (e) {
        // Ignore parsing errors
      }
    }

    return {
      category: category.name,
      description: category.hazards[hazardIndex],
      note
    };
  };

  const getWorkLocationName = (workLocationId: number | null) => {
    if (!workLocationId || !Array.isArray(workLocations) || workLocations.length === 0) {
      return permit?.location || 'Nicht angegeben';
    }
    const location = workLocations.find((loc: any) => loc.id === workLocationId);
    return location ? `${location.name} - ${location.description}` : permit?.location || 'Nicht angegeben';
  };

  const getSubmittedByName = (submittedById: number | null) => {
    if (!submittedById || !Array.isArray(users) || users.length === 0) {
      return 'Nicht angegeben';
    }
    const user = users.find((u: any) => u.id === submittedById);
    return user ? user.fullName || user.username : `Benutzer ID: ${submittedById}`;
  };

  // Workflow mutation
  const workflowMutation = useMutation({
    mutationFn: async ({ actionId, nextStatus }: { actionId: string; nextStatus: string }) => {
      if (!permit) throw new Error("No permit selected");
      return apiRequest(`/api/permits/${permit.id}/workflow`, "POST", { action: actionId, nextStatus });
    },
    onSuccess: () => {
      if (permit) {
        queryClient.invalidateQueries({ queryKey: [`/api/permits/${permit.id}`] });
        queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
      }
      toast({
        title: "Erfolg",
        description: "Status erfolgreich aktualisiert.",
      });
    },
    onError: (error: Error) => {
      const errorMessage = error.message || "Fehler beim Status-Update.";
      toast({
        title: "Fehler",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleWorkflowAction = async (actionId: string, nextStatus: string) => {
    console.log('Permit Details: Handling workflow action:', actionId, nextStatus);
    await workflowMutation.mutateAsync({ actionId, nextStatus });
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-industrial-gray mx-auto mb-4"></div>
          <div>Lade Genehmigungsdetails...</div>
        </div>
      </div>
    );
  }

  if (!permit) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Genehmigung nicht gefunden</h2>
          <p className="text-gray-600 mb-6">Die angeforderte Genehmigung konnte nicht gefunden werden.</p>
          <Link href="/permits">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück zur Übersicht
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const riskLevel = getRiskLevel(permit.overallRisk || 'niedrig');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <Link href="/permits">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Zurück
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-industrial-gray">{permit.permitId}</h1>
                <p className="text-secondary-gray">{getPermitTypeLabel(permit.type)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <PermitStatusBadge status={permit.status} />
              <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Bearbeiten
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Drucken
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Grundinformationen */}
            <Card className="print-avoid-break">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Grundinformationen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-secondary-gray">Arbeitstyp</div>
                    <div className="text-industrial-gray font-medium">{getPermitTypeLabel(permit.type)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-secondary-gray">Arbeitsort</div>
                    <div className="text-industrial-gray">{getWorkLocationName(permit.workLocationId)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-secondary-gray">Abteilung</div>
                    <div className="text-industrial-gray">{permit.department}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-secondary-gray">Gesamtrisiko</div>
                    <Badge className={riskLevel.color}>{riskLevel.label}</Badge>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-secondary-gray">Status</div>
                    <PermitStatusBadge status={permit.status} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-secondary-gray">Eingereicht von</div>
                    <div className="text-industrial-gray">{getSubmittedByName(permit.submittedBy)}</div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <div className="text-sm font-medium text-secondary-gray mb-2">Beschreibung der Arbeiten</div>
                  <div className="text-industrial-gray bg-gray-50 p-3 rounded-md">
                    {permit.description || 'Keine Beschreibung angegeben'}
                  </div>
                </div>



                {permit.additionalComments && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-sm font-medium text-secondary-gray mb-2">Zusätzliche Kommentare</div>
                      <div className="text-industrial-gray bg-gray-50 p-3 rounded-md">
                        {permit.additionalComments}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Zeitplan */}
            <Card>
              <CardHeader>
                <CardTitle>Zeitplan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-secondary-gray">Geplanter Beginn</div>
                    <div className="text-industrial-gray">{formatDateTime(permit.startDate)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-secondary-gray">Geplantes Ende</div>
                    <div className="text-industrial-gray">{formatDateTime(permit.endDate)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-secondary-gray">Gültig bis</div>
                    <div className="text-industrial-gray">{formatDate(permit.endDate)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-secondary-gray">Erstellt am</div>
                    <div className="text-industrial-gray">{formatDateTime(permit.createdAt)}</div>
                  </div>
                </div>

                {(permit.workStartedAt || permit.workCompletedAt) && (
                  <>
                    <Separator />
                    <div className="bg-blue-50 p-4 rounded-md">
                      <h4 className="font-medium text-blue-900 mb-3">Durchführung</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {permit.workStartedAt && (
                          <div>
                            <div className="text-sm font-medium text-blue-700">Arbeit begonnen am</div>
                            <div className="text-blue-900">{formatDateTime(permit.workStartedAt)}</div>
                          </div>
                        )}
                        {permit.workCompletedAt && (
                          <div>
                            <div className="text-sm font-medium text-blue-700">Arbeit abgeschlossen am</div>
                            <div className="text-blue-900">{formatDateTime(permit.workCompletedAt)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Kontaktinformationen */}
            <Card>
              <CardHeader>
                <CardTitle>Verantwortliche Personen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-secondary-gray">Antragsteller</div>
                    <div className="text-industrial-gray font-medium">{permit.requestorName}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-secondary-gray">Kontaktnummer</div>
                    <div className="text-industrial-gray">{permit.contactNumber}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-secondary-gray">Notfallkontakt</div>
                    <div className="text-industrial-gray">{permit.emergencyContact}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-secondary-gray">Durchführende Person</div>
                    <div className="text-industrial-gray">{permit.performerName || 'Nicht angegeben'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gefährdungsbeurteilung */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  TRBS-konforme Gefährdungsbeurteilung
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-secondary-gray">Risikokategorie</div>
                    <div className="text-industrial-gray">
                      <Badge className={riskLevel.color}>{riskLevel.label}</Badge>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-secondary-gray">Gefährdungen identifiziert</div>
                    <div className="text-industrial-gray">
                      {permit.selectedHazards && permit.selectedHazards.length > 0 
                        ? `${permit.selectedHazards.length} Gefährdung(en) ausgewählt`
                        : 'Keine Gefährdungen ausgewählt'
                      }
                    </div>
                  </div>
                </div>

                {permit.selectedHazards && permit.selectedHazards.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-sm font-medium text-secondary-gray mb-3">Ausgewählte Gefährdungen</div>
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {permit.selectedHazards.map((hazardId: string, index: number) => {
                          const hazardInfo = getHazardDescription(hazardId);
                          return (
                            <div key={index} className="bg-orange-50 border border-orange-200 p-4 rounded-md">
                              <div className="mb-2">
                                <div className="text-sm font-medium text-orange-900 mb-1">
                                  {hazardInfo.category}
                                </div>
                                <div className="text-sm text-orange-800 font-medium">
                                  {hazardInfo.description}
                                </div>
                              </div>
                              {hazardInfo.note && (
                                <div className="mt-3 pt-2 border-t border-orange-200">
                                  <div className="text-xs font-medium text-orange-700 mb-1">
                                    Schutzmaßnahmen:
                                  </div>
                                  <div className="text-xs text-orange-700 bg-orange-25 p-2 rounded">
                                    {hazardInfo.note}
                                  </div>
                                </div>
                              )}
                              <div className="text-xs text-orange-600 mt-2 opacity-75">
                                ID: {hazardId}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {permit.identifiedHazards && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-sm font-medium text-secondary-gray mb-2">Zusätzliche Gefahren und Kommentare</div>
                      <div className="text-industrial-gray bg-gray-50 p-3 rounded-md">
                        {permit.identifiedHazards}
                      </div>
                    </div>
                  </>
                )}


              </CardContent>
            </Card>

            {/* Genehmigungen */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Genehmigungen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div>
                      <div className="text-sm font-medium text-secondary-gray">Abteilungsleiter</div>
                      <div className="text-industrial-gray">{permit.departmentHead || 'Nicht zugewiesen'}</div>
                    </div>
                    <div className="text-right">
                      {permit.departmentHeadApproval ? (
                        <div>
                          <Badge className="bg-green-100 text-green-800">Genehmigt</Badge>
                          <div className="text-xs text-secondary-gray mt-1">
                            {formatDateTime(permit.departmentHeadApprovalDate)}
                          </div>
                        </div>
                      ) : (
                        <Badge variant="outline">Ausstehend</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div>
                      <div className="text-sm font-medium text-secondary-gray">Sicherheitsbeauftragter</div>
                      <div className="text-industrial-gray">{permit.safetyOfficer || 'Nicht zugewiesen'}</div>
                    </div>
                    <div className="text-right">
                      {permit.safetyOfficerApproval ? (
                        <div>
                          <Badge className="bg-green-100 text-green-800">Genehmigt</Badge>
                          <div className="text-xs text-secondary-gray mt-1">
                            {formatDateTime(permit.safetyOfficerApprovalDate)}
                          </div>
                        </div>
                      ) : (
                        <Badge variant="outline">Ausstehend</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div>
                      <div className="text-sm font-medium text-secondary-gray">Wartungsgenehmiger</div>
                      <div className="text-industrial-gray">{permit.maintenanceApprover || 'Nicht zugewiesen'}</div>
                    </div>
                    <div className="text-right">
                      {permit.maintenanceApproval ? (
                        <div>
                          <Badge className="bg-green-100 text-green-800">Genehmigt</Badge>
                          <div className="text-xs text-secondary-gray mt-1">
                            {formatDateTime(permit.maintenanceApprovalDate)}
                          </div>
                        </div>
                      ) : (
                        <Badge variant="outline">Ausstehend</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>




          </div>

          {/* Sidebar - Right Side */}
          <div className="space-y-6">
            
            {/* Status & Workflow */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Status-Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <StatusIndicator status={permit.status} />
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-medium mb-3">Verfügbare Aktionen</h4>
                  {currentUser && (
                    <WorkflowButtons 
                      permit={permit} 
                      currentUser={currentUser} 
                      onAction={handleWorkflowAction}
                      isLoading={workflowMutation.isPending}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Workflow Visualization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  Workflow-Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <WorkflowVisualization currentStatus={permit.status} />
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card>
              <CardHeader>
                <CardTitle>Schnellinfo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-secondary-gray">Permit-ID:</span>
                  <span className="font-mono font-medium">{permit.permitId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-gray">Status:</span>
                  <PermitStatusBadge status={permit.status} />
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-gray">Risiko:</span>
                  <Badge className={riskLevel.color}>{riskLevel.label}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-gray">Erstellt:</span>
                  <span>{formatDate(permit.createdAt)}</span>
                </div>
                {permit.updatedAt && (
                  <div className="flex justify-between">
                    <span className="text-secondary-gray">Aktualisiert:</span>
                    <span>{formatDate(permit.updatedAt)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <EditPermitModalUnified 
        permit={permit}
        open={isEditModalOpen} 
        onOpenChange={setIsEditModalOpen}
        mode="edit"
      />
    </div>
  );
}