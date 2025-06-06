import { Eye, Edit, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PermitStatusBadge } from "./permit-status-badge";
import { printPermit } from "@/lib/print-utils";
import type { Permit } from "@shared/schema";
import { useLocation } from "wouter";

interface PermitTableProps {
  permits: Permit[];
  isLoading?: boolean;
  onEdit?: (permit: Permit) => void;
}

export function PermitTable({ permits, isLoading, onEdit }: PermitTableProps) {
  const [, setLocation] = useLocation();

  const formatDateTime = (date: Date | string | null) => {
    if (!date) return 'Nicht angegeben';
    const d = new Date(date);
    return d.toLocaleDateString('de-DE', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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

  const handleView = (permit: Permit) => {
    console.log("Viewing permit:", permit.permitId);
    setLocation(`/permit/${permit.id}`);
  };

  const handleEdit = (permit: Permit) => {
    console.log("Editing permit:", permit.permitId);
    setLocation(`/permit/${permit.id}`);
  };

  const handlePrint = (permit: Permit) => {
    console.log("Printing permit:", permit.permitId);
    
    // Create a print-friendly version
    const printContent = `
      <html>
        <head>
          <title>Arbeitserlaubnis ${permit.permitId}</title>
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
            <h2>Genehmigung Nr. ${permit.permitId}</h2>
          </div>

          <div class="section">
            <div class="section-title">GRUNDINFORMATIONEN</div>
            <div class="field-row">
              <div class="field-label">Genehmigungstyp:</div>
              <div class="field-value">${getPermitTypeLabel(permit.type)}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Arbeitsort:</div>
              <div class="field-value">${permit.location}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Beschreibung:</div>
              <div class="field-value">${permit.description}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Antragsteller:</div>
              <div class="field-value">${permit.requestorName}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Abteilung:</div>
              <div class="field-value">${permit.department}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Kontakt:</div>
              <div class="field-value">${permit.contactNumber}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Notfallkontakt:</div>
              <div class="field-value">${permit.emergencyContact}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">ZEITRAUM UND STATUS</div>
            <div class="field-row">
              <div class="field-label">Startdatum:</div>
              <div class="field-value">${permit.startDate ? new Date(permit.startDate).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Nicht angegeben'}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Enddatum:</div>
              <div class="field-value">${permit.endDate ? new Date(permit.endDate).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Nicht angegeben'}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Status:</div>
              <div class="field-value status">${permit.status}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Risikostufe:</div>
              <div class="field-value">${permit.riskLevel || 'Nicht angegeben'}</div>
            </div>
          </div>

          ${permit.selectedHazards && permit.selectedHazards.length > 0 ? `
          <div class="section">
            <div class="section-title">TRBS GEFÄHRDUNGSBEURTEILUNG</div>
            ${permit.selectedHazards.map(hazardId => {
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
              
              if (!category || !hazard) return '';
              
              return `<div class="field-row">
                <div class="field-label">${category.category}:</div>
                <div class="field-value">${hazard}</div>
              </div>`;
            }).join('')}
            
            ${permit?.hazardNotes && permit.hazardNotes !== '{}' ? `
            <div class="subsection">
              <div class="subsection-title">Zusätzliche Notizen:</div>
              ${Object.entries(JSON.parse(permit.hazardNotes || '{}')).map(([hazardId, note]) => {
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
                
                return note ? `<div class="field-row">
                  <div class="field-label">${hazard}:</div>
                  <div class="field-value">${note}</div>
                </div>` : '';
              }).join('')}
            </div>` : ''}
          </div>` : ''}

          <div class="section">
            <div class="section-title">IDENTIFIZIERTE GEFAHREN</div>
            <div class="field-value">${permit.identifiedHazards || 'Keine spezifischen Gefahren identifiziert'}</div>
          </div>

          ${permit.additionalComments ? `
          <div class="section">
            <div class="section-title">ZUSÄTZLICHE KOMMENTARE</div>
            <div class="field-value">${permit.additionalComments}</div>
          </div>` : ''}

          <div class="signatures">
            <div class="signature-box">
              <div>Vorgesetzter</div>
              <div style="margin-top: 20px; font-size: 10px;">
                ${permit.departmentHeadApproval ? `Genehmigt: ${permit.departmentHeadApprovalDate ? new Date(permit.departmentHeadApprovalDate).toLocaleDateString('de-DE') : ''}` : 'Ausstehend'}
              </div>
            </div>
            <div class="signature-box">
              <div>Sicherheitsbeauftragter</div>
              <div style="margin-top: 20px; font-size: 10px;">
                ${permit.safetyOfficerApproval ? `Genehmigt: ${permit.safetyOfficerApprovalDate ? new Date(permit.safetyOfficerApprovalDate).toLocaleDateString('de-DE') : ''}` : 'Ausstehend'}
              </div>
            </div>
            <div class="signature-box">
              <div>Betriebsleiter</div>
              <div style="margin-top: 20px; font-size: 10px;">
                ${permit.maintenanceApproval ? `Genehmigt: ${permit.maintenanceApprovalDate ? new Date(permit.maintenanceApprovalDate).toLocaleDateString('de-DE') : ''}` : 'Ausstehend'}
              </div>
            </div>
          </div>
          
          ${permit.performerName ? `
          <div class="section" style="margin-top: 40px;">
            <div class="section-title">DURCHFÜHRER</div>
            <div class="field-row">
              <div class="field-label">Name des Durchführers:</div>
              <div class="field-value">${permit.performerName}</div>
            </div>
            ${permit.workStartedAt ? `
            <div class="field-row">
              <div class="field-label">Arbeit begonnen:</div>
              <div class="field-value">${new Date(permit.workStartedAt).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            </div>` : ''}
            ${permit.workCompletedAt ? `
            <div class="field-row">
              <div class="field-label">Arbeit abgeschlossen:</div>
              <div class="field-value">${new Date(permit.workCompletedAt).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            </div>` : ''}
            <div style="margin-top: 30px; text-align: center;">
              ${permit.performerSignature ? `<img src="${permit.performerSignature}" style="max-width: 200px; max-height: 80px; border-bottom: 1px solid #000;" alt="Unterschrift Durchführer" />` : '<div style="border-top: 1px solid #000; width: 300px; padding-top: 10px;">Unterschrift Durchführer</div>'}
            </div>
          </div>` : ''}

          <div style="margin-top: 40px; text-align: center; font-size: 10px; color: #666;">
            Erstellt am: ${permit.createdAt ? new Date(permit.createdAt).toLocaleDateString('de-DE') : ''} | 
            Letzte Aktualisierung: ${permit.updatedAt ? new Date(permit.updatedAt).toLocaleDateString('de-DE') : ''}
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-industrial-gray">Aktuelle Genehmigungen</h3>
        </div>
        <div className="p-8 text-center">
          <div className="text-secondary-gray">Genehmigungen werden geladen...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-industrial-gray">Aktuelle Genehmigungen</h3>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="text-xs font-medium text-secondary-gray uppercase tracking-wider">
                Genehmigungs-ID
              </TableHead>
              <TableHead className="text-xs font-medium text-secondary-gray uppercase tracking-wider">
                Typ
              </TableHead>
              <TableHead className="text-xs font-medium text-secondary-gray uppercase tracking-wider">
                Standort
              </TableHead>
              <TableHead className="text-xs font-medium text-secondary-gray uppercase tracking-wider">
                Antragsteller
              </TableHead>
              <TableHead className="text-xs font-medium text-secondary-gray uppercase tracking-wider">
                Status
              </TableHead>
              <TableHead className="text-xs font-medium text-secondary-gray uppercase tracking-wider">
                Gültig bis
              </TableHead>
              <TableHead className="text-xs font-medium text-secondary-gray uppercase tracking-wider">
                Aktionen
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {permits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-secondary-gray">
                  Keine Genehmigungen gefunden. Erstellen Sie Ihre erste Genehmigung, um zu beginnen.
                </TableCell>
              </TableRow>
            ) : (
              permits.map((permit) => (
                <TableRow key={permit.id}>
                  <TableCell className="font-medium text-safety-blue">
                    #{permit.permitId}
                  </TableCell>
                  <TableCell className="text-industrial-gray">
                    {getPermitTypeLabel(permit.type)}
                  </TableCell>
                  <TableCell className="text-industrial-gray">
                    {permit.location}
                  </TableCell>
                  <TableCell className="text-industrial-gray">
                    {permit.requestorName}
                  </TableCell>
                  <TableCell>
                    <PermitStatusBadge status={permit.status} />
                  </TableCell>
                  <TableCell className="text-industrial-gray">
                    {formatDateTime(permit.endDate)}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleView(permit)}
                      >
                        <Eye className="h-4 w-4 text-safety-blue" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleEdit(permit)}
                      >
                        <Edit className="h-4 w-4 text-secondary-gray" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handlePrint(permit)}
                      >
                        <Printer className="h-4 w-4 text-secondary-gray" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
