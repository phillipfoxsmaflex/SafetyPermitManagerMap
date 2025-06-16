import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Edit, Printer, FileText, Users, Settings, Brain, GitBranch, Activity } from "lucide-react";
import { Link } from "wouter";
import { PermitStatusBadge } from "@/components/permit-status-badge";
import { EditPermitModalUnified } from "@/components/edit-permit-modal-unified";
import { AiSuggestions } from "@/components/ai-suggestions";
import { WorkflowButtons } from "@/components/workflow-buttons";
import { PermitAttachments } from "@/components/permit-attachments";
import { StatusIndicator } from "@/components/status-indicator";
import { WorkflowVisualization } from "@/components/workflow-visualization";
import { Permit, User } from "@shared/schema";

export default function PermitDetails() {
  const [match, params] = useRoute("/permit/:id");
  const permitId = params?.id;
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { data: permit, isLoading } = useQuery<Permit>({
    queryKey: [`/api/permits/${permitId}`],
    enabled: !!permitId,
  });

  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/user"],
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

  const getRiskLevelLabel = (level: string) => {
    const levelMap: Record<string, { label: string; color: string }> = {
      'niedrig': { label: 'Niedrig', color: 'bg-green-100 text-green-800' },
      'mittel': { label: 'Mittel', color: 'bg-yellow-100 text-yellow-800' },
      'hoch': { label: 'Hoch', color: 'bg-red-100 text-red-800' },
    };
    return levelMap[level] || { label: level, color: 'bg-gray-100 text-gray-800' };
  };

  const handleWorkflowAction = async (action: string, nextStatus: string) => {
    // This will be handled by the WorkflowButtons component
    console.log('Workflow action triggered:', action, nextStatus);
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

  const riskLevel = getRiskLevelLabel(permit.overallRisk || 'niedrig');

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
              <Button variant="outline" size="sm">
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
            <Card>
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
                    <div className="text-industrial-gray">{permit.location}</div>
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
                    <div className="text-industrial-gray">{permit.submittedBy ? `Benutzer ID: ${permit.submittedBy}` : 'Nicht angegeben'}</div>
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

            {/* Sicherheitsinformationen */}
            <Card>
              <CardHeader>
                <CardTitle>Sicherheitsinformationen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-secondary-gray">Schutzausrüstung erforderlich</div>
                    <div className="text-industrial-gray">
                      {permit.ppeRequired ? (
                        Array.isArray(permit.ppeRequired) ? permit.ppeRequired.join(', ') : permit.ppeRequired
                      ) : 'Keine Angabe'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-secondary-gray">Isolierung erforderlich</div>
                    <div className="text-industrial-gray">
                      {permit.isolationRequired ? 'Ja' : 'Nein'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-secondary-gray">Feuerwache erforderlich</div>
                    <div className="text-industrial-gray">
                      {permit.fireWatchRequired ? 'Ja' : 'Nein'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-secondary-gray">Gasmessung erforderlich</div>
                    <div className="text-industrial-gray">
                      {permit.gasTestRequired ? 'Ja' : 'Nein'}
                    </div>
                  </div>
                </div>

                {permit.specialPrecautions && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-sm font-medium text-secondary-gray mb-2">Besondere Vorsichtsmaßnahmen</div>
                      <div className="text-industrial-gray bg-gray-50 p-3 rounded-md">
                        {permit.specialPrecautions}
                      </div>
                    </div>
                  </>
                )}

                {permit.emergencyProcedures && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-sm font-medium text-secondary-gray mb-2">Notfallverfahren</div>
                      <div className="text-industrial-gray bg-gray-50 p-3 rounded-md">
                        {permit.emergencyProcedures}
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

            {/* KI-Vorschläge */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  KI-Vorschläge
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AiSuggestions permitId={permit.id} disabled={permit.status !== 'draft'} />
              </CardContent>
            </Card>

            {/* Anhänge */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Datei-Anhänge
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PermitAttachments permitId={permit.id} />
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
                      isLoading={false}
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