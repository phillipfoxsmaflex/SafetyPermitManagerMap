import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Printer, Eye } from "lucide-react";
import { Link } from "wouter";
import { PermitStatusBadge } from "@/components/permit-status-badge";
import { EditPermitModalEnhanced } from "@/components/edit-permit-modal-enhanced";
import { AiSuggestions } from "@/components/ai-suggestions";
import { Permit } from "@shared/schema";

export default function PermitDetails() {
  const [match, params] = useRoute("/permit/:id");
  const permitId = params?.id;
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Use specific permit query to avoid cache invalidation issues
  const { data: permit, isLoading } = useQuery<Permit>({
    queryKey: [`/api/permits/${permitId}`],
    enabled: !!permitId,
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

  const handlePrint = () => {
    if (!permit) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const hazardCategories = [
      { id: 1, category: "Mechanische Gefährdungen", hazards: ["Quetschung durch bewegte Teile", "Schneiden an scharfen Kanten", "Stoß durch herunterfallende Gegenstände", "Sturz durch ungesicherte Öffnungen"] },
      { id: 2, category: "Elektrische Gefährdungen", hazards: ["Stromschlag durch defekte Geräte", "Lichtbogen bei Schalthandlungen", "Statische Entladung", "Induktive Kopplung"] },
      { id: 3, category: "Gefahrstoffe", hazards: ["Hautkontakt mit Gefahrstoffen", "Einatmen von Gefahrstoffen", "Verschlucken von Gefahrstoffen", "Hautkontakt mit unter Druck stehenden Flüssigkeiten"] },
      { id: 4, category: "Biologische Arbeitsstoffe", hazards: ["Infektionsgefährdung", "sensibilisierende Wirkung", "toxische Wirkung"] },
      { id: 5, category: "Brand- und Explosionsgefährdungen", hazards: ["brennbare Feststoffe, Flüssigkeiten, Gase", "explosionsfähige Atmosphäre", "Explosivstoffe"] },
      { id: 6, category: "Thermische Gefährdungen", hazards: ["heiße Medien/Oberflächen", "kalte Medien/Oberflächen", "Brand, Explosion"] },
      { id: 7, category: "Gefährdungen durch spezielle physikalische Einwirkungen", hazards: ["Lärm", "Ultraschall, Infraschall", "Ganzkörpervibrationen", "Hand-Arm-Vibrationen", "optische Strahlung", "ionisierende Strahlung", "elektromagnetische Felder", "Unter- oder Überdruck"] },
      { id: 8, category: "Gefährdungen durch Arbeitsumgebungsbedingungen", hazards: ["Klima (Hitze, Kälte)", "unzureichende Beleuchtung", "Lärm", "unzureichende Verkehrswege", "Sturz, Ausgleiten", "unzureichende Flucht- und Rettungswege"] },
      { id: 9, category: "Physische Belastung/Arbeitsschwere", hazards: ["schwere dynamische Arbeit", "einseitige dynamische Arbeit", "Haltungsarbeit/Zwangshaltungen", "Fortbewegung/ungünstige Körperhaltung", "Kombination körperlicher Belastungsfaktoren"] },
      { id: 10, category: "Psychische Faktoren", hazards: ["unzureichend gestaltete Arbeitsaufgabe", "unzureichend gestaltete Arbeitsorganisation", "unzureichend gestaltete soziale Bedingungen", "unzureichend gestaltete Arbeitsplatz- und Arbeitsumgebungsfaktoren"] },
      { id: 11, category: "Sonstige Gefährdungen", hazards: ["durch Menschen (körperliche Gewalt)", "durch Tiere", "durch Pflanzen und pflanzliche Produkte", "Absturz in/durch Behälter, Becken, Gruben"] }
    ];

    let selectedHazardsHtml = '';
    if (permit.selectedHazards && permit.selectedHazards.length > 0) {
      selectedHazardsHtml = permit.selectedHazards.map((hazardId: string) => {
        const [categoryId, hazardIndex] = hazardId.split('-').map(Number);
        const category = hazardCategories.find(c => c.id === categoryId);
        const hazard = category?.hazards[hazardIndex];
        
        if (!category || !hazard) return '';
        
        return `
          <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; background-color: #f8f9fa;">
            <div style="font-weight: bold; color: #333; margin-bottom: 5px;">${category.category}</div>
            <div style="color: #666;">${hazard}</div>
          </div>
        `;
      }).join('');
    }

    let hazardNotesHtml = '';
    if (permit.hazardNotes && permit.hazardNotes !== '{}') {
      try {
        const notes = JSON.parse(permit.hazardNotes);
        hazardNotesHtml = Object.entries(notes).map(([hazardId, note]) => {
          if (!note) return '';
          const [categoryId, hazardIndex] = hazardId.split('-').map(Number);
          const category = hazardCategories.find(c => c.id === categoryId);
          const hazard = category?.hazards[hazardIndex];
          
          return `
            <div style="margin-bottom: 10px;">
              <span style="font-weight: bold; color: #2563eb;">${hazard}:</span>
              <span style="color: #666; margin-left: 10px;">${note}</span>
            </div>
          `;
        }).join('');
      } catch (e) {
        console.error('Error parsing hazard notes:', e);
      }
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Arbeitserlaubnis - ${permit.permitId}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #ccc; padding-bottom: 15px; }
            .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .permit-id { font-size: 18px; color: #666; }
            .section { margin-bottom: 20px; }
            .section-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            .field-row { display: flex; margin-bottom: 8px; }
            .field-label { width: 150px; font-weight: bold; color: #555; }
            .field-value { flex: 1; color: #333; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
            .signature-box { border: 1px solid #ccc; padding: 15px; width: 30%; text-align: center; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">ARBEITSERLAUBNIS</div>
            <div class="permit-id">${permit.permitId}</div>
          </div>

          <div class="grid">
            <div>
              <div class="section">
                <div class="section-title">ALLGEMEINE INFORMATIONEN</div>
                <div class="field-row">
                  <div class="field-label">Typ:</div>
                  <div class="field-value">${getPermitTypeLabel(permit.type)}</div>
                </div>
                <div class="field-row">
                  <div class="field-label">Standort:</div>
                  <div class="field-value">${permit.location}</div>
                </div>
                <div class="field-row">
                  <div class="field-label">Beschreibung:</div>
                  <div class="field-value">${permit.description}</div>
                </div>
                <div class="field-row">
                  <div class="field-label">Abteilung:</div>
                  <div class="field-value">${permit.department}</div>
                </div>
              </div>

              <div class="section">
                <div class="section-title">KONTAKTINFORMATIONEN</div>
                <div class="field-row">
                  <div class="field-label">Antragsteller:</div>
                  <div class="field-value">${permit.requestorName}</div>
                </div>
                <div class="field-row">
                  <div class="field-label">Kontaktnummer:</div>
                  <div class="field-value">${permit.contactNumber}</div>
                </div>
                <div class="field-row">
                  <div class="field-label">Notfallkontakt:</div>
                  <div class="field-value">${permit.emergencyContact}</div>
                </div>
              </div>
            </div>

            <div>
              <div class="section">
                <div class="section-title">ZEITPLAN</div>
                <div class="field-row">
                  <div class="field-label">Startdatum:</div>
                  <div class="field-value">${formatDateTime(permit.startDate)}</div>
                </div>
                <div class="field-row">
                  <div class="field-label">Enddatum:</div>
                  <div class="field-value">${formatDateTime(permit.endDate)}</div>
                </div>
              </div>

              <div class="section">
                <div class="section-title">GENEHMIGUNGEN</div>
                <div class="field-row">
                  <div class="field-label">Abteilungsleiter:</div>
                  <div class="field-value">${permit.departmentHead}</div>
                </div>
                <div class="field-row">
                  <div class="field-label">Wartungsgenehmiger:</div>
                  <div class="field-value">${permit.maintenanceApprover}</div>
                </div>
                ${permit.safetyOfficer ? `
                <div class="field-row">
                  <div class="field-label">Sicherheitsbeauftragter:</div>
                  <div class="field-value">${permit.safetyOfficer}</div>
                </div>` : ''}
              </div>
            </div>
          </div>

          ${selectedHazardsHtml ? `
          <div class="section">
            <div class="section-title">TRBS GEFÄHRDUNGSBEURTEILUNG</div>
            ${selectedHazardsHtml}
          </div>` : ''}

          ${hazardNotesHtml ? `
          <div class="section">
            <div class="section-title">ZUSÄTZLICHE NOTIZEN ZU GEFAHREN</div>
            ${hazardNotesHtml}
          </div>` : ''}

          ${permit.additionalComments ? `
          <div class="section">
            <div class="section-title">ZUSÄTZLICHE KOMMENTARE</div>
            <div class="field-value">${permit.additionalComments}</div>
          </div>` : ''}

          <div class="signatures">
            <div class="signature-box">
              <div>Abteilungsleiter</div>
              <div style="margin-top: 20px; font-size: 10px;">
                ${permit.departmentHeadApproval ? `Genehmigt: ${permit.departmentHeadApprovalDate ? formatDateTime(permit.departmentHeadApprovalDate) : ''}` : 'Ausstehend'}
              </div>
            </div>
            <div class="signature-box">
              <div>Sicherheitsbeauftragter</div>
              <div style="margin-top: 20px; font-size: 10px;">
                ${permit.safetyOfficerApproval ? `Genehmigt: ${permit.safetyOfficerApprovalDate ? formatDateTime(permit.safetyOfficerApprovalDate) : ''}` : 'Ausstehend'}
              </div>
            </div>
            <div class="signature-box">
              <div>Technik</div>
              <div style="margin-top: 20px; font-size: 10px;">
                ${permit.maintenanceApproval ? `Genehmigt: ${permit.maintenanceApprovalDate ? formatDateTime(permit.maintenanceApprovalDate) : ''}` : 'Ausstehend'}
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Lade Genehmigungsdetails...</div>
      </div>
    );
  }

  if (!permit) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Genehmigung nicht gefunden</h2>
          <p className="text-gray-600 mb-6">Die angeforderte Genehmigung konnte nicht gefunden werden.</p>
          <Link href="/">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück zum Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{permit.permitId}</h1>
            <p className="text-gray-600">{getPermitTypeLabel(permit.type)}</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Grundinformationen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-secondary-gray">Standort</div>
                <div className="text-industrial-gray">{permit.location}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-secondary-gray">Abteilung</div>
                <div className="text-industrial-gray">{permit.department}</div>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-secondary-gray">Beschreibung</div>
              <div className="text-industrial-gray">{permit.description}</div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Kontaktinformationen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-secondary-gray">Antragsteller</div>
                <div className="text-industrial-gray">{permit.requestorName}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-secondary-gray">Kontaktnummer</div>
                <div className="text-industrial-gray">{permit.contactNumber}</div>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-secondary-gray">Notfallkontakt</div>
              <div className="text-industrial-gray">{permit.emergencyContact}</div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Zeitplan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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

        {/* TRBS Hazard Assessment */}
        {permit.selectedHazards && permit.selectedHazards.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>TRBS Gefährdungsbeurteilung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {permit.selectedHazards.map((hazardId: string) => {
                const categories = [
                  { id: 1, category: "Mechanische Gefährdungen", hazards: ["Quetschung durch bewegte Teile", "Schneiden an scharfen Kanten", "Stoß durch herunterfallende Gegenstände", "Sturz durch ungesicherte Öffnungen"] },
                  { id: 2, category: "Elektrische Gefährdungen", hazards: ["Stromschlag durch defekte Geräte", "Lichtbogen bei Schalthandlungen", "Statische Entladung", "Induktive Kopplung"] },
                  { id: 3, category: "Gefahrstoffe", hazards: ["Hautkontakt mit Gefahrstoffen", "Einatmen von Gefahrstoffen", "Verschlucken von Gefahrstoffen", "Hautkontakt mit unter Druck stehenden Flüssigkeiten"] },
                  { id: 4, category: "Biologische Arbeitsstoffe", hazards: ["Infektionsgefährdung", "sensibilisierende Wirkung", "toxische Wirkung"] },
                  { id: 5, category: "Brand- und Explosionsgefährdungen", hazards: ["brennbare Feststoffe, Flüssigkeiten, Gase", "explosionsfähige Atmosphäre", "Explosivstoffe"] },
                  { id: 6, category: "Thermische Gefährdungen", hazards: ["heiße Medien/Oberflächen", "kalte Medien/Oberflächen", "Brand, Explosion"] },
                  { id: 7, category: "Gefährdungen durch spezielle physikalische Einwirkungen", hazards: ["Lärm", "Ultraschall, Infraschall", "Ganzkörpervibrationen", "Hand-Arm-Vibrationen", "optische Strahlung", "ionisierende Strahlung", "elektromagnetische Felder", "Unter- oder Überdruck"] },
                  { id: 8, category: "Gefährdungen durch Arbeitsumgebungsbedingungen", hazards: ["Klima (Hitze, Kälte)", "unzureichende Beleuchtung", "Lärm", "unzureichende Verkehrswege", "Sturz, Ausgleiten", "unzureichende Flucht- und Rettungswege"] },
                  { id: 9, category: "Physische Belastung/Arbeitsschwere", hazards: ["schwere dynamische Arbeit", "einseitige dynamische Arbeit", "Haltungsarbeit/Zwangshaltungen", "Fortbewegung/ungünstige Körperhaltung", "Kombination körperlicher Belastungsfaktoren"] },
                  { id: 10, category: "Psychische Faktoren", hazards: ["unzureichend gestaltete Arbeitsaufgabe", "unzureichend gestaltete Arbeitsorganisation", "unzureichend gestaltete soziale Bedingungen", "unzureichend gestaltete Arbeitsplatz- und Arbeitsumgebungsfaktoren"] },
                  { id: 11, category: "Sonstige Gefährdungen", hazards: ["durch Menschen (körperliche Gewalt)", "durch Tiere", "durch Pflanzen und pflanzliche Produkte", "Absturz in/durch Behälter, Becken, Gruben"] }
                ];
                
                const [categoryId, hazardIndex] = hazardId.split('-').map(Number);
                const category = categories.find(c => c.id === categoryId);
                const hazard = category?.hazards[hazardIndex];
                
                if (!category || !hazard) return null;
                
                return (
                  <div key={hazardId} className="border rounded-lg p-4 bg-blue-50">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded border-2 bg-safety-green border-safety-green flex items-center justify-center mt-1">
                        <span className="text-white text-xs">✓</span>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm text-industrial-gray">
                          {category.category}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {hazard}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {permit.hazardNotes && permit.hazardNotes !== '{}' && (
                <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-medium text-sm text-industrial-gray mb-2">Zusätzliche Notizen:</h4>
                  {Object.entries(JSON.parse(permit.hazardNotes)).map(([hazardId, note]) => {
                    if (!note) return null;
                    
                    const [categoryId, hazardIndex] = hazardId.split('-').map(Number);
                    const categories = [
                      { id: 1, category: "Mechanische Gefährdungen", hazards: ["Quetschung durch bewegte Teile", "Schneiden an scharfen Kanten", "Stoß durch herunterfallende Gegenstände", "Sturz durch ungesicherte Öffnungen"] },
                      { id: 2, category: "Elektrische Gefährdungen", hazards: ["Stromschlag durch defekte Geräte", "Lichtbogen bei Schalthandlungen", "Statische Entladung", "Induktive Kopplung"] },
                      { id: 3, category: "Gefahrstoffe", hazards: ["Hautkontakt mit Gefahrstoffen", "Einatmen von Gefahrstoffen", "Verschlucken von Gefahrstoffen", "Hautkontakt mit unter Druck stehenden Flüssigkeiten"] },
                      { id: 4, category: "Biologische Arbeitsstoffe", hazards: ["Infektionsgefährdung", "sensibilisierende Wirkung", "toxische Wirkung"] },
                      { id: 5, category: "Brand- und Explosionsgefährdungen", hazards: ["brennbare Feststoffe, Flüssigkeiten, Gase", "explosionsfähige Atmosphäre", "Explosivstoffe"] },
                      { id: 6, category: "Thermische Gefährdungen", hazards: ["heiße Medien/Oberflächen", "kalte Medien/Oberflächen", "Brand, Explosion"] },
                      { id: 7, category: "Gefährdungen durch spezielle physikalische Einwirkungen", hazards: ["Lärm", "Ultraschall, Infraschall", "Ganzkörpervibrationen", "Hand-Arm-Vibrationen", "optische Strahlung", "ionisierende Strahlung", "elektromagnetische Felder", "Unter- oder Überdruck"] },
                      { id: 8, category: "Gefährdungen durch Arbeitsumgebungsbedingungen", hazards: ["Klima (Hitze, Kälte)", "unzureichende Beleuchtung", "Lärm", "unzureichende Verkehrswege", "Sturz, Ausgleiten", "unzureichende Flucht- und Rettungswege"] },
                      { id: 9, category: "Physische Belastung/Arbeitsschwere", hazards: ["schwere dynamische Arbeit", "einseitige dynamische Arbeit", "Haltungsarbeit/Zwangshaltungen", "Fortbewegung/ungünstige Körperhaltung", "Kombination körperlicher Belastungsfaktoren"] },
                      { id: 10, category: "Psychische Faktoren", hazards: ["unzureichend gestaltete Arbeitsaufgabe", "unzureichend gestaltete Arbeitsorganisation", "unzureichend gestaltete soziale Bedingungen", "unzureichend gestaltete Arbeitsplatz- und Arbeitsumgebungsfaktoren"] },
                      { id: 11, category: "Sonstige Gefährdungen", hazards: ["durch Menschen (körperliche Gewalt)", "durch Tiere", "durch Pflanzen und pflanzliche Produkte", "Absturz in/durch Behälter, Becken, Gruben"] }
                    ];
                    const category = categories.find(c => c.id === categoryId);
                    const hazard = category?.hazards[hazardIndex];
                    
                    return hazard ? (
                      <div key={hazardId} className="text-sm mb-2">
                        <span className="font-medium text-blue-700">{hazard}:</span>
                        <span className="text-gray-600 ml-2">{note}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              )}
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
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Genehmigungen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Department Head */}
              <div className="text-center p-4 border rounded-lg">
                <div className="font-medium text-gray-900 mb-2">Abteilungsleiter</div>
                <div className="text-sm text-gray-600 mb-3">{permit.departmentHead}</div>
                <div className="flex items-center justify-center mb-2">
                  {permit.departmentHeadApproval ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Genehmigt
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Ausstehend</Badge>
                  )}
                </div>
                {permit.departmentHeadApprovalDate && (
                  <div className="text-xs text-gray-500">
                    {formatDateTime(permit.departmentHeadApprovalDate)}
                  </div>
                )}
              </div>

              {/* Safety Officer */}
              <div className="text-center p-4 border rounded-lg">
                <div className="font-medium text-gray-900 mb-2">Sicherheitsbeauftragter</div>
                <div className="text-sm text-gray-600 mb-3">{permit.safetyOfficer || 'Nicht zugewiesen'}</div>
                <div className="flex items-center justify-center mb-2">
                  {permit.safetyOfficerApproval ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Genehmigt
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Ausstehend</Badge>
                  )}
                </div>
                {permit.safetyOfficerApprovalDate && (
                  <div className="text-xs text-gray-500">
                    {formatDateTime(permit.safetyOfficerApprovalDate)}
                  </div>
                )}
              </div>

              {/* Maintenance Approver */}
              <div className="text-center p-4 border rounded-lg">
                <div className="font-medium text-gray-900 mb-2">Technik</div>
                <div className="text-sm text-gray-600 mb-3">{permit.maintenanceApprover}</div>
                <div className="flex items-center justify-center mb-2">
                  {permit.maintenanceApproval ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Genehmigt
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Ausstehend</Badge>
                  )}
                </div>
                {permit.maintenanceApprovalDate && (
                  <div className="text-xs text-gray-500">
                    {formatDateTime(permit.maintenanceApprovalDate)}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Suggestions - only show in edit mode */}
        {isEditModalOpen && <AiSuggestions permitId={permit.id} />}
      </div>

      <EditPermitModalEnhanced
        permit={permit}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
      />
    </div>
  );
}