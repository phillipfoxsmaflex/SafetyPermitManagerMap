import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { NavigationHeader } from "@/components/navigation-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Printer, Edit, FileText } from "lucide-react";
import { PermitStatusBadge } from "@/components/permit-status-badge";
import { EditPermitModal } from "@/components/edit-permit-modal";
import type { Permit } from "@shared/schema";
import { Link } from "wouter";
import { useState } from "react";

export default function PermitDetails() {
  const [match, params] = useRoute("/permit/:id");
  const permitId = params?.id;
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { data: permits = [], isLoading } = useQuery<Permit[]>({
    queryKey: ["/api/permits"],
  });

  const permit = permits.find(p => p.id.toString() === permitId);

  const getPermitTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'confined_space': 'Enger Raum Zutritt',
      'hot_work': 'Heißarbeiten',
      'electrical': 'Elektrische Arbeiten',
      'chemical': 'Chemische Arbeiten',
      'height': 'Höhenarbeiten',
    };
    return typeMap[type] || type;
  };

  const formatDateTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handlePrint = () => {
    // Create a print-friendly version
    const printContent = `
      <html>
        <head>
          <title>Arbeitserlaubnis ${permit?.permitId}</title>
          <style>
            @page { 
              size: A4; 
              margin: 2cm; 
            }
            body { 
              font-family: Arial, sans-serif; 
              font-size: 12px; 
              line-height: 1.4; 
              color: #000; 
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #000; 
              padding-bottom: 20px; 
            }
            .section { 
              margin-bottom: 20px; 
            }
            .section-title { 
              font-weight: bold; 
              font-size: 14px; 
              margin-bottom: 10px; 
              border-bottom: 1px solid #ccc; 
              padding-bottom: 5px; 
            }
            .field-row { 
              display: flex; 
              margin-bottom: 8px; 
            }
            .field-label { 
              font-weight: bold; 
              width: 180px; 
              flex-shrink: 0; 
            }
            .field-value { 
              flex: 1; 
            }
            .checkbox { 
              margin-right: 5px; 
            }
            .status { 
              text-transform: uppercase; 
              font-weight: bold; 
            }
            .signatures { 
              margin-top: 40px; 
              display: grid; 
              grid-template-columns: 1fr 1fr 1fr; 
              gap: 30px; 
            }
            .signature-box { 
              border-top: 1px solid #000; 
              padding-top: 10px; 
              text-align: center; 
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>ARBEITSERLAUBNIS</h1>
            <h2>Genehmigung Nr. ${permit?.permitId}</h2>
          </div>

          <div class="section">
            <div class="section-title">GRUNDINFORMATIONEN</div>
            <div class="field-row">
              <div class="field-label">Genehmigungstyp:</div>
              <div class="field-value">${getPermitTypeLabel(permit?.type || '')}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Arbeitsort:</div>
              <div class="field-value">${permit?.location}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Beschreibung:</div>
              <div class="field-value">${permit?.description}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Antragsteller:</div>
              <div class="field-value">${permit?.requestorName}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Abteilung:</div>
              <div class="field-value">${permit?.department}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Kontakt:</div>
              <div class="field-value">${permit?.contactNumber}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Notfallkontakt:</div>
              <div class="field-value">${permit?.emergencyContact}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">ZEITRAUM UND STATUS</div>
            <div class="field-row">
              <div class="field-label">Startdatum:</div>
              <div class="field-value">${formatDateTime(permit?.startDate || '')}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Enddatum:</div>
              <div class="field-value">${formatDateTime(permit?.endDate || '')}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Status:</div>
              <div class="field-value status">${permit?.status}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Risikostufe:</div>
              <div class="field-value">${permit?.riskLevel || 'Nicht angegeben'}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">SICHERHEITSCHECKLISTE</div>
            <div class="field-row">
              <div class="checkbox">${permit?.atmosphereTest ? '☑' : '☐'}</div>
              <div class="field-value">Atmosphärenprüfung durchgeführt</div>
            </div>
            <div class="field-row">
              <div class="checkbox">${permit?.ventilation ? '☑' : '☐'}</div>
              <div class="field-value">Belüftung sichergestellt</div>
            </div>
            <div class="field-row">
              <div class="checkbox">${permit?.ppe ? '☑' : '☐'}</div>
              <div class="field-value">Persönliche Schutzausrüstung vorhanden</div>
            </div>
            <div class="field-row">
              <div class="checkbox">${permit?.emergencyProcedures ? '☑' : '☐'}</div>
              <div class="field-value">Notfallverfahren kommuniziert</div>
            </div>
            <div class="field-row">
              <div class="checkbox">${permit?.fireWatch ? '☑' : '☐'}</div>
              <div class="field-value">Brandwache zugewiesen</div>
            </div>
            <div class="field-row">
              <div class="checkbox">${permit?.isolationLockout ? '☑' : '☐'}</div>
              <div class="field-value">Isolierung/Absperrung durchgeführt</div>
            </div>
          </div>

          ${permit?.oxygenLevel || permit?.lelLevel || permit?.h2sLevel ? `
          <div class="section">
            <div class="section-title">ATMOSPHÄREN-MESSWERTE</div>
            ${permit?.oxygenLevel ? `<div class="field-row"><div class="field-label">Sauerstoff:</div><div class="field-value">${permit.oxygenLevel}</div></div>` : ''}
            ${permit?.lelLevel ? `<div class="field-row"><div class="field-label">LEL:</div><div class="field-value">${permit.lelLevel}</div></div>` : ''}
            ${permit?.h2sLevel ? `<div class="field-row"><div class="field-label">H2S:</div><div class="field-value">${permit.h2sLevel}</div></div>` : ''}
          </div>` : ''}

          <div class="section">
            <div class="section-title">IDENTIFIZIERTE GEFAHREN</div>
            <div class="field-value">${permit?.identifiedHazards || 'Keine spezifischen Gefahren identifiziert'}</div>
          </div>

          ${permit?.additionalComments ? `
          <div class="section">
            <div class="section-title">ZUSÄTZLICHE KOMMENTARE</div>
            <div class="field-value">${permit.additionalComments}</div>
          </div>` : ''}

          <div class="signatures">
            <div class="signature-box">
              <div>Vorgesetzter</div>
              <div style="margin-top: 20px; font-size: 10px;">
                ${permit?.supervisorApproval ? `Genehmigt: ${permit.supervisorApprovalDate ? formatDateTime(permit.supervisorApprovalDate) : ''}` : 'Ausstehend'}
              </div>
            </div>
            <div class="signature-box">
              <div>Sicherheitsbeauftragter</div>
              <div style="margin-top: 20px; font-size: 10px;">
                ${permit?.safetyOfficerApproval ? `Genehmigt: ${permit.safetyOfficerApprovalDate ? formatDateTime(permit.safetyOfficerApprovalDate) : ''}` : 'Ausstehend'}
              </div>
            </div>
            <div class="signature-box">
              <div>Betriebsleiter</div>
              <div style="margin-top: 20px; font-size: 10px;">
                ${permit?.operationsManagerApproval ? `Genehmigt: ${permit.operationsManagerApprovalDate ? formatDateTime(permit.operationsManagerApprovalDate) : ''}` : 'Ausstehend'}
              </div>
            </div>
          </div>

          <div style="margin-top: 40px; text-align: center; font-size: 10px; color: #666;">
            Erstellt am: ${permit?.createdAt ? formatDateTime(permit.createdAt) : ''} | 
            Letzte Aktualisierung: ${permit?.updatedAt ? formatDateTime(permit.updatedAt) : ''}
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationHeader />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center py-8">
            <div className="text-secondary-gray">Genehmigung wird geladen...</div>
          </div>
        </main>
      </div>
    );
  }

  if (!permit) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationHeader />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center py-8">
            <div className="text-secondary-gray">Genehmigung nicht gefunden</div>
            <Link href="/">
              <Button className="mt-4">Zurück zum Dashboard</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Zurück
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-industrial-gray">
                Genehmigung {permit.permitId}
              </h1>
              <p className="text-secondary-gray">{getPermitTypeLabel(permit.type)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handlePrint} variant="outline">
              <Printer className="w-4 h-4 mr-2" />
              Drucken
            </Button>
            <Button 
              onClick={() => setIsEditModalOpen(true)}
              className="bg-safety-blue text-white hover:bg-blue-700"
            >
              <Edit className="w-4 h-4 mr-2" />
              Bearbeiten
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Status and Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Grundinformationen</span>
                <PermitStatusBadge status={permit.status} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-secondary-gray">Arbeitsort</div>
                  <div className="text-industrial-gray">{permit.location}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-secondary-gray">Risikostufe</div>
                  <div className="text-industrial-gray">{permit.riskLevel || 'Nicht angegeben'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-secondary-gray">Antragsteller</div>
                  <div className="text-industrial-gray">{permit.requestorName}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-secondary-gray">Abteilung</div>
                  <div className="text-industrial-gray">{permit.department}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-secondary-gray">Kontakt</div>
                  <div className="text-industrial-gray">{permit.contactNumber}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-secondary-gray">Notfallkontakt</div>
                  <div className="text-industrial-gray">{permit.emergencyContact}</div>
                </div>
              </div>
              <Separator />
              <div>
                <div className="text-sm font-medium text-secondary-gray mb-2">Arbeitsbeschreibung</div>
                <div className="text-industrial-gray">{permit.description}</div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Zeitraum</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-secondary-gray">Startdatum</div>
                  <div className="text-industrial-gray">{formatDateTime(permit.startDate)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-secondary-gray">Enddatum</div>
                  <div className="text-industrial-gray">{formatDateTime(permit.endDate)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Safety Checklist */}
          <Card>
            <CardHeader>
              <CardTitle>Sicherheitscheckliste</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${permit.atmosphereTest ? 'bg-safety-green border-safety-green' : 'border-gray-300'}`}>
                  {permit.atmosphereTest && <span className="text-white text-xs">✓</span>}
                </div>
                <span className="text-industrial-gray">Atmosphärenprüfung durchgeführt</span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${permit.ventilation ? 'bg-safety-green border-safety-green' : 'border-gray-300'}`}>
                  {permit.ventilation && <span className="text-white text-xs">✓</span>}
                </div>
                <span className="text-industrial-gray">Belüftung sichergestellt</span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${permit.ppe ? 'bg-safety-green border-safety-green' : 'border-gray-300'}`}>
                  {permit.ppe && <span className="text-white text-xs">✓</span>}
                </div>
                <span className="text-industrial-gray">Persönliche Schutzausrüstung vorhanden</span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${permit.emergencyProcedures ? 'bg-safety-green border-safety-green' : 'border-gray-300'}`}>
                  {permit.emergencyProcedures && <span className="text-white text-xs">✓</span>}
                </div>
                <span className="text-industrial-gray">Notfallverfahren kommuniziert</span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${permit.fireWatch ? 'bg-safety-green border-safety-green' : 'border-gray-300'}`}>
                  {permit.fireWatch && <span className="text-white text-xs">✓</span>}
                </div>
                <span className="text-industrial-gray">Brandwache zugewiesen</span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${permit.isolationLockout ? 'bg-safety-green border-safety-green' : 'border-gray-300'}`}>
                  {permit.isolationLockout && <span className="text-white text-xs">✓</span>}
                </div>
                <span className="text-industrial-gray">Isolierung/Absperrung durchgeführt</span>
              </div>
            </CardContent>
          </Card>

          {/* Atmospheric Monitoring */}
          {(permit.oxygenLevel || permit.lelLevel || permit.h2sLevel) && (
            <Card>
              <CardHeader>
                <CardTitle>Atmosphären-Messwerte</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {permit.oxygenLevel && (
                    <div>
                      <div className="text-sm font-medium text-secondary-gray">Sauerstoff</div>
                      <div className="text-industrial-gray">{permit.oxygenLevel}</div>
                    </div>
                  )}
                  {permit.lelLevel && (
                    <div>
                      <div className="text-sm font-medium text-secondary-gray">LEL (Lower Explosive Limit)</div>
                      <div className="text-industrial-gray">{permit.lelLevel}</div>
                    </div>
                  )}
                  {permit.h2sLevel && (
                    <div>
                      <div className="text-sm font-medium text-secondary-gray">H2S</div>
                      <div className="text-industrial-gray">{permit.h2sLevel}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Hazards and Comments */}
          {(permit.identifiedHazards || permit.additionalComments) && (
            <Card>
              <CardHeader>
                <CardTitle>Gefahren und Kommentare</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {permit.identifiedHazards && (
                  <div>
                    <div className="text-sm font-medium text-secondary-gray mb-2">Identifizierte Gefahren</div>
                    <div className="text-industrial-gray">{permit.identifiedHazards}</div>
                  </div>
                )}
                {permit.additionalComments && (
                  <div>
                    <div className="text-sm font-medium text-secondary-gray mb-2">Zusätzliche Kommentare</div>
                    <div className="text-industrial-gray">{permit.additionalComments}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Approvals */}
          <Card>
            <CardHeader>
              <CardTitle>Genehmigungen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded">
                  <span className="font-medium">Vorgesetzter</span>
                  <div className="flex items-center gap-2">
                    {permit.supervisorApproval ? (
                      <>
                        <Badge className="bg-safety-green text-white">Genehmigt</Badge>
                        {permit.supervisorApprovalDate && (
                          <span className="text-sm text-secondary-gray">
                            {formatDateTime(permit.supervisorApprovalDate)}
                          </span>
                        )}
                      </>
                    ) : (
                      <Badge variant="secondary">Ausstehend</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <span className="font-medium">Sicherheitsbeauftragter</span>
                  <div className="flex items-center gap-2">
                    {permit.safetyOfficerApproval ? (
                      <>
                        <Badge className="bg-safety-green text-white">Genehmigt</Badge>
                        {permit.safetyOfficerApprovalDate && (
                          <span className="text-sm text-secondary-gray">
                            {formatDateTime(permit.safetyOfficerApprovalDate)}
                          </span>
                        )}
                      </>
                    ) : (
                      <Badge variant="secondary">Ausstehend</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <span className="font-medium">Betriebsleiter</span>
                  <div className="flex items-center gap-2">
                    {permit.operationsManagerApproval ? (
                      <>
                        <Badge className="bg-safety-green text-white">Genehmigt</Badge>
                        {permit.operationsManagerApprovalDate && (
                          <span className="text-sm text-secondary-gray">
                            {formatDateTime(permit.operationsManagerApprovalDate)}
                          </span>
                        )}
                      </>
                    ) : (
                      <Badge variant="secondary">Ausstehend</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <EditPermitModal
          permit={permit}
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
        />
      </main>
    </div>
  );
}