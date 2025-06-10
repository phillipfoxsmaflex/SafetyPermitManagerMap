import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Printer, 
  FileText, 
  Image, 
  File,
  Calendar,
  MapPin,
  User,
  AlertTriangle,
  CheckCircle,
  Clock
} from "lucide-react";
import type { Permit } from "@shared/schema";

interface PermitAttachment {
  id: number;
  permitId: number;
  fileName: string;
  originalName: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  uploadedBy: number;
  description?: string;
  createdAt: string;
}

interface PermitPrintViewProps {
  permit: Permit;
  onClose: () => void;
}

export function PermitPrintView({ permit, onClose }: PermitPrintViewProps) {
  // Fetch attachments for this permit
  const { data: attachments = [] } = useQuery<PermitAttachment[]>({
    queryKey: ["/api/permits", permit.id, "attachments"],
  });

  const handlePrint = () => {
    window.print();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string, mimeType: string) => {
    if (fileType === 'image') {
      return <Image className="h-4 w-4" />;
    } else if (mimeType === 'application/pdf') {
      return <FileText className="h-4 w-4" />;
    } else {
      return <File className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: "Entwurf", variant: "secondary" as const },
      pending: { label: "Ausstehend", variant: "default" as const },
      approved: { label: "Genehmigt", variant: "default" as const },
      active: { label: "Aktiv", variant: "default" as const },
      completed: { label: "Abgeschlossen", variant: "default" as const },
      expired: { label: "Abgelaufen", variant: "destructive" as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { label: status, variant: "outline" as const };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const parseSelectedHazards = (hazardsStr: string) => {
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

  const selectedHazards = parseSelectedHazards(permit.selectedHazards as any);
  const hazardNotes = parseHazardNotes(permit.hazardNotes || '{}');

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-auto">
      {/* Print Header - Hidden in print */}
      <div className="print:hidden bg-gray-50 border-b p-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Druckvorschau - {permit.permitId}</h2>
        <div className="flex gap-2">
          <Button onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Drucken
          </Button>
          <Button variant="outline" onClick={onClose}>
            Schließen
          </Button>
        </div>
      </div>

      {/* Print Content */}
      <div className="max-w-4xl mx-auto p-8 space-y-6">
        {/* Header */}
        <div className="text-center border-b pb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            ARBEITSERLAUBNIS
          </h1>
          <div className="flex justify-center items-center gap-4 text-sm text-gray-600">
            <span>Genehmigungs-ID: <strong>{permit.permitId}</strong></span>
            <span>•</span>
            <span>Status: {getStatusBadge(permit.status)}</span>
            <span>•</span>
            <span>Erstellt: {permit.createdAt ? new Date(permit.createdAt).toLocaleDateString('de-DE') : 'Nicht verfügbar'}</span>
          </div>
        </div>

        {/* Basic Information */}
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
                <label className="text-sm font-medium text-gray-600">Genehmigungstyp</label>
                <p className="text-sm font-medium">{permit.type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Arbeitsort</label>
                <p className="text-sm font-medium flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {permit.location}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Antragsteller</label>
                <p className="text-sm font-medium flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {permit.requestorName}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Gültigkeitszeitraum</label>
                <p className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {permit.startDate ? new Date(permit.startDate).toLocaleDateString('de-DE') : 'Nicht festgelegt'} - {permit.endDate ? new Date(permit.endDate).toLocaleDateString('de-DE') : 'Nicht festgelegt'}
                </p>
              </div>
            </div>
            
            {permit.description && (
              <div>
                <label className="text-sm font-medium text-gray-600">Beschreibung</label>
                <p className="text-sm mt-1">{permit.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Safety Assessment */}
        {selectedHazards.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Gefährdungsbeurteilung
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedHazards.map((hazardId: string, index: number) => (
                  <div key={index} className="border rounded p-3">
                    <div className="text-sm font-medium">Gefährdung #{index + 1}</div>
                    <div className="text-sm text-gray-600 mt-1">ID: {hazardId}</div>
                    {hazardNotes[hazardId] && (
                      <div className="text-sm mt-2 p-2 bg-yellow-50 rounded">
                        <strong>Notiz:</strong> {hazardNotes[hazardId]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Approval Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Genehmigungsverfahren
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {permit.departmentHead && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Abteilungsleiter</label>
                  <p className="text-sm font-medium">{permit.departmentHead}</p>
                </div>
              )}
              {permit.safetyOfficer && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Sicherheitsbeauftragter</label>
                  <p className="text-sm font-medium">{permit.safetyOfficer}</p>
                </div>
              )}
              {permit.maintenanceApprover && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Instandhaltung/Engineering</label>
                  <p className="text-sm font-medium">{permit.maintenanceApprover}</p>
                </div>
              )}
            </div>
            
            {permit.additionalComments && (
              <div>
                <label className="text-sm font-medium text-gray-600">Zusätzliche Kommentare</label>
                <p className="text-sm mt-1">{permit.additionalComments}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Work Execution */}
        {(permit.performerName || permit.workStartedAt || permit.workCompletedAt) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Arbeitsausführung
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {permit.performerName && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Durchführer</label>
                    <p className="text-sm font-medium">{permit.performerName}</p>
                  </div>
                )}
                {permit.workStartedAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Arbeitsbeginn</label>
                    <p className="text-sm font-medium">
                      {new Date(permit.workStartedAt).toLocaleString('de-DE')}
                    </p>
                  </div>
                )}
                {permit.workCompletedAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Arbeitsende</label>
                    <p className="text-sm font-medium">
                      {new Date(permit.workCompletedAt).toLocaleString('de-DE')}
                    </p>
                  </div>
                )}
              </div>

              {permit.performerSignature && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Unterschrift Durchführer</label>
                  <div className="mt-2 border rounded p-4 bg-gray-50">
                    <img 
                      src={permit.performerSignature} 
                      alt="Unterschrift Durchführer" 
                      className="max-h-16"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Attachments */}
        {attachments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <File className="h-5 w-5" />
                Anhänge ({attachments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      {getFileIcon(attachment.fileType, attachment.mimeType)}
                      <div>
                        <div className="font-medium text-sm">{attachment.originalName}</div>
                        <div className="text-xs text-gray-500">
                          {formatFileSize(attachment.fileSize)} • {new Date(attachment.createdAt).toLocaleDateString('de-DE')}
                        </div>
                        {attachment.description && (
                          <div className="text-xs text-gray-600 mt-1">{attachment.description}</div>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline">
                      {attachment.fileType === 'image' ? 'Bild' : 
                       attachment.fileType === 'document' ? 'Dokument' : 'Datei'}
                    </Badge>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
                <strong>Hinweis:</strong> Anhänge können über das digitale System heruntergeladen werden. 
                Genehmigungsnummer: {permit.permitId}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <Separator />
        <div className="text-center text-xs text-gray-500 space-y-1">
          <p>Dieses Dokument wurde automatisch generiert am {new Date().toLocaleString('de-DE')}</p>
          <p>Arbeitserlaubnis-System • Version 1.0</p>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { 
            margin: 0; 
            font-size: 12px; 
          }
          .print\\:hidden { 
            display: none !important; 
          }
          .max-w-4xl {
            max-width: none;
            margin: 0;
            padding: 20px;
          }
          .space-y-6 > * + * {
            margin-top: 1rem;
          }
          .space-y-4 > * + * {
            margin-top: 0.75rem;
          }
          .space-y-3 > * + * {
            margin-top: 0.5rem;
          }
          .grid {
            break-inside: avoid;
          }
          .card {
            break-inside: avoid;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            margin-bottom: 1rem;
          }
        }
      `}</style>
    </div>
  );
}