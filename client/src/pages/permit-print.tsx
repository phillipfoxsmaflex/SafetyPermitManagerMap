import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Printer, ArrowLeft, AlertTriangle, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { PermitStatusBadge } from "@/components/permit-status-badge";
import { Permit, User, WorkLocation } from "@shared/schema";
import trbsData from "@/data/trbs_complete_hazards.json";

export default function PermitPrint() {
  const [match, params] = useRoute("/permit/:id/print");
  const permitId = params?.id;

  const { data: permit, isLoading } = useQuery<Permit>({
    queryKey: [`/api/permits/${permitId}`],
    enabled: !!permitId,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: workLocations = [] } = useQuery<WorkLocation[]>({
    queryKey: ["/api/work-locations/active"],
  });

  const getPermitTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'confined_space': 'Enger Raum',
      'hot_work': 'Heißarbeiten',
      'electrical': 'Elektrische Arbeiten',
      'chemical': 'Chemische Arbeiten',
      'height': 'Höhenarbeiten',
      'general_permit': 'Allgemeiner Erlaubnisschein',
    };
    return typeMap[type] || type;
  };

  const getRiskLevel = (risk: string) => {
    switch (risk?.toLowerCase()) {
      case 'low':
      case 'niedrig':
        return { label: 'Niedrig', color: 'bg-green-100 text-green-800' };
      case 'medium':
      case 'mittel':
        return { label: 'Mittel', color: 'bg-yellow-100 text-yellow-800' };
      case 'high':
      case 'hoch':
        return { label: 'Hoch', color: 'bg-red-100 text-red-800' };
      default:
        return { label: 'Nicht angegeben', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const getWorkLocationName = (workLocationId: string | number | null) => {
    if (!workLocationId) return 'Nicht angegeben';
    const location = workLocations.find(loc => loc.id === Number(workLocationId));
    return location ? location.name : 'Nicht angegeben';
  };

  const getSubmittedByName = (submittedById: number | null) => {
    if (!submittedById) {
      return 'Nicht angegeben';
    }
    const user = users.find((u: any) => u.id === submittedById);
    return user ? user.fullName || user.username : `Benutzer ID: ${submittedById}`;
  };

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string | Date | null) => {
    if (!dateString) return 'Nicht angegeben';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper functions for TRBS data
  const parseSelectedHazards = (hazardsStr: string | any[]) => {
    try {
      return Array.isArray(hazardsStr) ? hazardsStr : JSON.parse(hazardsStr || '[]');
    } catch {
      return [];
    }
  };

  const parseHazardNotes = (notesStr: string) => {
    try {
      return JSON.parse(notesStr || '{}');
    } catch {
      return {};
    }
  };



  const getHazardText = (hazardId: string) => {
    const [categoryId, hazardIndex] = hazardId.split('-');
    const category = trbsData.categories.find(cat => cat.id === categoryId);
    if (category && category.hazards[parseInt(hazardIndex)]) {
      return category.hazards[parseInt(hazardIndex)].hazard;
    }
    return hazardId;
  };

  const getCategoryName = (categoryId: string) => {
    const category = trbsData.categories.find(cat => cat.id === categoryId);
    return category ? category.category : `Kategorie ${categoryId}`;
  };

  const getUserName = (userIdOrName: number | string | null) => {
    if (!userIdOrName) return 'Nicht zugewiesen';
    if (typeof userIdOrName === 'string') return userIdOrName;
    const user = users.find(u => u.id === userIdOrName);
    return user ? (user.fullName || user.username) : `User ID: ${userIdOrName}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-industrial-gray mx-auto mb-4"></div>
          <div>Lade Druckansicht...</div>
        </div>
      </div>
    );
  }

  if (!permit) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">Genehmigung nicht gefunden</div>
          <Link href="/permits">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück zur Übersicht
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const riskLevel = getRiskLevel(permit.overallRisk || 'niedrig');
  const selectedHazards = parseSelectedHazards(permit.selectedHazards || []);
  const hazardNotes = parseHazardNotes(permit.hazardNotes || '{}');

  return (
    <div className="min-h-screen bg-white">
      {/* Print Header - only visible on screen */}
      <div className="print-hide bg-gray-50 border-b border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/permit/${permit.id}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Zurück zur Genehmigung
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-industrial-gray">
              Druckansicht - {permit.permitId}
            </h1>
          </div>
          <Button onClick={handlePrint} className="bg-safety-blue text-white hover:bg-blue-700">
            <Printer className="h-4 w-4 mr-2" />
            Drucken
          </Button>
        </div>
      </div>

      {/* Print Content - Optimized for A4 */}
      <div className="max-w-[210mm] mx-auto p-6 text-sm leading-tight">
        {/* Document Header */}
        <div className="text-center mb-4 border-b-2 border-black pb-3">
          <h1 className="text-xl font-bold text-black mb-1">
            ARBEITSERLAUBNIS / PERMIT TO WORK
          </h1>
          <h2 className="text-base font-semibold text-gray-800 mb-2">
            {getPermitTypeLabel(permit.type)}
          </h2>
          <div className="flex justify-center items-center gap-6 text-xs">
            <div><strong>Permit-ID:</strong> {permit.permitId}</div>
            <div><strong>Status:</strong> {permit.status}</div>
            <div><strong>Risiko:</strong> {riskLevel.label}</div>
          </div>
        </div>

        {/* Basic Information Section */}
        <div className="mb-4 print-avoid-break">
          <h3 className="text-sm font-bold border-b border-gray-400 pb-1 mb-2">1. GRUNDDATEN</h3>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <strong>Arbeitstyp:</strong><br />
              {getPermitTypeLabel(permit.type)}
            </div>
            <div>
              <strong>Arbeitsort:</strong><br />
              {getWorkLocationName(permit.workLocationId || '')}
            </div>
            <div>
              <strong>Abteilung:</strong><br />
              {permit.department}
            </div>
            <div>
              <strong>Antragsteller:</strong><br />
              {permit.requestorName || 'Nicht angegeben'}
            </div>
            <div>
              <strong>Kontaktnummer:</strong><br />
              {permit.contactNumber || 'Nicht angegeben'}
            </div>
            <div>
              <strong>Notfallkontakt:</strong><br />
              {permit.emergencyContact || 'Nicht angegeben'}
            </div>
          </div>
          <div className="mt-2">
            <strong className="text-xs">Arbeitsbeschreibung:</strong><br />
            <div className="text-xs mt-1 p-2 bg-gray-100 border">
              {permit.description || 'Keine Beschreibung angegeben'}
            </div>
          </div>
        </div>

        {/* Schedule Section */}
        <div className="mb-4 print-avoid-break">
          <h3 className="text-sm font-bold border-b border-gray-400 pb-1 mb-2">2. ZEITPLAN</h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <strong>Geplanter Start:</strong><br />
              {permit.startDate ? formatDateTime(permit.startDate) : 'Nicht angegeben'}
            </div>
            <div>
              <strong>Geplantes Ende:</strong><br />
              {permit.endDate ? formatDateTime(permit.endDate) : 'Nicht angegeben'}
            </div>
            <div>
              <strong>Tatsächlicher Start:</strong><br />
              {permit.workStartedAt ? formatDateTime(permit.workStartedAt) : 'Noch nicht begonnen'}
            </div>
            <div>
              <strong>Tatsächliches Ende:</strong><br />
              {permit.workCompletedAt ? formatDateTime(permit.workCompletedAt) : 'Noch nicht abgeschlossen'}
            </div>
          </div>
        </div>

        {/* Hazards Section */}
        <div className="mb-4 print-avoid-break">
          <h3 className="text-sm font-bold border-b border-gray-400 pb-1 mb-2">3. GEFÄHRDUNGSBEURTEILUNG (TRBS)</h3>
          {selectedHazards.length > 0 ? (
            <div className="text-xs space-y-2">
              {selectedHazards.map((hazardId: string, index: number) => {
                const [categoryId] = hazardId.split('-');
                return (
                  <div key={index} className="border-l-2 border-red-500 pl-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3 text-red-500" />
                      <strong>{getCategoryName(categoryId)}</strong>
                    </div>
                    <div className="ml-5">
                      {getHazardText(hazardId)}
                    </div>
                    {hazardNotes[hazardId] && (
                      <div className="ml-5 mt-1 text-gray-600 italic">
                        Schutzmaßnahme: {hazardNotes[hazardId]}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-gray-600">Keine spezifischen Gefährdungen identifiziert</div>
          )}
        </div>

        {/* Approvals Section */}
        <div className="mb-4 print-avoid-break">
          <h3 className="text-sm font-bold border-b border-gray-400 pb-1 mb-2">4. GENEHMIGUNGEN</h3>
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="border-l-2 border-blue-500 pl-2">
              <strong>Abteilungsleiter:</strong> {getUserName(permit.departmentHead)}
              <div className="ml-2 mt-1 text-gray-600">
                {permit.departmentHeadApproval ? (
                  <span className="text-green-600">
                    ✓ Genehmigt {permit.departmentHeadApprovalDate ? `am ${formatDateTime(permit.departmentHeadApprovalDate)}` : ''}
                  </span>
                ) : (
                  <span className="text-orange-600">⏳ Ausstehend</span>
                )}
              </div>
            </div>
            <div className="border-l-2 border-blue-500 pl-2">
              <strong>Sicherheitsbeauftragte/r:</strong> {getUserName(permit.safetyOfficer)}
              <div className="ml-2 mt-1 text-gray-600">
                {permit.safetyOfficerApproval ? (
                  <span className="text-green-600">
                    ✓ Genehmigt {permit.safetyOfficerApprovalDate ? `am ${formatDateTime(permit.safetyOfficerApprovalDate)}` : ''}
                  </span>
                ) : (
                  <span className="text-orange-600">⏳ Ausstehend</span>
                )}
              </div>
            </div>
            <div className="border-l-2 border-blue-500 pl-2">
              <strong>Wartungsverantwortliche/r:</strong> {getUserName(permit.maintenanceApprover)}
              <div className="ml-2 mt-1 text-gray-600">
                {permit.maintenanceApproval ? (
                  <span className="text-green-600">
                    ✓ Genehmigt {permit.maintenanceApprovalDate ? `am ${formatDateTime(permit.maintenanceApprovalDate)}` : ''}
                  </span>
                ) : (
                  <span className="text-orange-600">⏳ Ausstehend</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Execution Section */}
        <div className="mb-4 print-avoid-break">
          <h3 className="text-sm font-bold border-b border-gray-400 pb-1 mb-2">5. DURCHFÜHRUNG</h3>
          <div className="text-xs space-y-2">
            <div>
              <strong>Ausführende Person:</strong><br />
              {permit.performerName || 'Nicht angegeben'}
            </div>
            


            {permit.beforeWorkStarts && (
              <div>
                <strong>Vor Arbeitsbeginn:</strong><br />
                <div className="p-2 bg-gray-100 border mt-1">
                  {permit.beforeWorkStarts}
                </div>
              </div>
            )}

            {permit.immediateActions && (
              <div>
                <strong>Sofortmaßnahmen:</strong><br />
                <div className="p-2 bg-gray-100 border mt-1">
                  {permit.immediateActions}
                </div>
              </div>
            )}

            {permit.complianceNotes && (
              <div>
                <strong>Compliance-Hinweise:</strong><br />
                <div className="p-2 bg-gray-100 border mt-1">
                  {permit.complianceNotes}
                </div>
              </div>
            )}

            {/* Signature */}
            {permit.performerSignature && (
              <div>
                <strong>Unterschrift Ausführende/r:</strong><br />
                <div className="mt-1 border p-2 bg-gray-50">
                  <img 
                    src={permit.performerSignature} 
                    alt="Unterschrift" 
                    className="max-h-16 w-auto"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Additional Information Section */}
        <div className="mb-4 print-avoid-break">
          <h3 className="text-sm font-bold border-b border-gray-400 pb-1 mb-2">6. ZUSÄTZLICHE INFORMATIONEN</h3>
          
          {/* Compliance Notes */}
          {permit.complianceNotes && (
            <div className="mb-2">
              <strong className="text-xs">Relevante Vorschriften und Normen:</strong>
              <div className="text-xs p-2 bg-gray-100 border mt-1">
                {permit.complianceNotes}
              </div>
            </div>
          )}

          {/* Identified Hazards */}
          {permit.identifiedHazards && (
            <div className="mb-2">
              <strong className="text-xs">Zusätzliche Gefahren und Kommentare:</strong>
              <div className="text-xs p-2 bg-gray-100 border mt-1">
                {permit.identifiedHazards}
              </div>
            </div>
          )}

          {/* Additional Comments */}
          {permit.additionalComments && (
            <div className="mb-2">
              <strong className="text-xs">Weitere Kommentare:</strong>
              <div className="text-xs p-2 bg-gray-100 border mt-1">
                {permit.additionalComments}
              </div>
            </div>
          )}
        </div>

        {/* Document Footer */}
        <div className="mt-6 pt-4 border-t-2 border-black text-xs">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <strong>Erstellt:</strong> {formatDateTime(permit.createdAt)}
            </div>
            {permit.updatedAt && (
              <div>
                <strong>Aktualisiert:</strong> {formatDateTime(permit.updatedAt)}
              </div>
            )}
          </div>
          

        </div>
      </div>
    </div>
  );
}