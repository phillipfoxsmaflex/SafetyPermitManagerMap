import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Printer, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { PermitStatusBadge } from "@/components/permit-status-badge";
import { Permit, User, WorkLocation } from "@shared/schema";

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

      {/* Print Content */}
      <div className="max-w-4xl mx-auto p-8">
        {/* Document Header */}
        <div className="text-center mb-8 border-b-2 border-gray-300 pb-6">
          <h1 className="text-3xl font-bold text-industrial-gray mb-2">
            Arbeitserlaubnis / Permit to Work
          </h1>
          <h2 className="text-xl text-secondary-gray mb-4">
            {getPermitTypeLabel(permit.type)}
          </h2>
          <div className="flex justify-center items-center gap-4">
            <div className="text-lg font-mono font-bold">{permit.permitId}</div>
            <PermitStatusBadge status={permit.status} />
          </div>
        </div>

        {/* Basic Information */}
        <Card className="mb-6 print-avoid-break">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Grundinformationen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-sm font-medium text-secondary-gray mb-1">Arbeitstyp</div>
                <div className="text-industrial-gray font-medium">{getPermitTypeLabel(permit.type)}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-secondary-gray mb-1">Arbeitsort</div>
                <div className="text-industrial-gray">{getWorkLocationName(permit.workLocationId || '')}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-secondary-gray mb-1">Abteilung</div>
                <div className="text-industrial-gray">{permit.department}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-secondary-gray mb-1">Gesamtrisiko</div>
                <Badge className={riskLevel.color}>{riskLevel.label}</Badge>
              </div>
              <div>
                <div className="text-sm font-medium text-secondary-gray mb-1">Eingereicht von</div>
                <div className="text-industrial-gray">{getSubmittedByName(permit.submittedBy || null)}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-secondary-gray mb-1">Kontaktnummer</div>
                <div className="text-industrial-gray">{permit.contactNumber || 'Nicht angegeben'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Work Description */}
        <Card className="mb-6 print-avoid-break">
          <CardHeader>
            <CardTitle>Beschreibung der Arbeiten</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-md">
              {permit.description || 'Keine Beschreibung angegeben'}
            </div>
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card className="mb-6 print-avoid-break">
          <CardHeader>
            <CardTitle>Zeitplan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-sm font-medium text-secondary-gray mb-1">Startdatum</div>
                <div className="text-industrial-gray">
                  {permit.startDate ? formatDateTime(permit.startDate) : 'Nicht angegeben'}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-secondary-gray mb-1">Enddatum</div>
                <div className="text-industrial-gray">
                  {permit.endDate ? formatDateTime(permit.endDate) : 'Nicht angegeben'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Comments */}
        {permit.additionalComments && (
          <Card className="mb-6 print-avoid-break">
            <CardHeader>
              <CardTitle>Zusätzliche Kommentare</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-md">
                {permit.additionalComments}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Document Footer */}
        <div className="mt-12 pt-8 border-t-2 border-gray-300">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="text-sm font-medium text-secondary-gray mb-2">Erstellt am</div>
              <div className="text-industrial-gray">{formatDateTime(permit.createdAt)}</div>
            </div>
            {permit.updatedAt && (
              <div>
                <div className="text-sm font-medium text-secondary-gray mb-2">Zuletzt aktualisiert</div>
                <div className="text-industrial-gray">{formatDateTime(permit.updatedAt)}</div>
              </div>
            )}
          </div>
          
          {/* Signature Areas */}
          <div className="grid grid-cols-3 gap-8 mt-12">
            <div className="text-center">
              <div className="border-t border-gray-400 pt-2 mt-16">
                <div className="text-sm font-medium">Antragsteller</div>
                <div className="text-xs text-secondary-gray">Unterschrift / Datum</div>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-gray-400 pt-2 mt-16">
                <div className="text-sm font-medium">Sicherheitsbeauftragte/r</div>
                <div className="text-xs text-secondary-gray">Unterschrift / Datum</div>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-gray-400 pt-2 mt-16">
                <div className="text-sm font-medium">Abteilungsleiter/in</div>
                <div className="text-xs text-secondary-gray">Unterschrift / Datum</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}