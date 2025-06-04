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
import type { Permit } from "@shared/schema";
import { useLocation } from "wouter";

interface PermitTableProps {
  permits: Permit[];
  isLoading?: boolean;
  onEdit?: (permit: Permit) => void;
}

export function PermitTable({ permits, isLoading, onEdit }: PermitTableProps) {
  const [, setLocation] = useLocation();

  const formatDateTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
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
              <div class="field-value">${new Date(permit.startDate).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Enddatum:</div>
              <div class="field-value">${new Date(permit.endDate).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
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

          <div class="section">
            <div class="section-title">SICHERHEITSCHECKLISTE</div>
            <div class="field-row">
              <div class="checkbox">${permit.atmosphereTest ? '☑' : '☐'}</div>
              <div class="field-value">Atmosphärenprüfung durchgeführt</div>
            </div>
            <div class="field-row">
              <div class="checkbox">${permit.ventilation ? '☑' : '☐'}</div>
              <div class="field-value">Belüftung sichergestellt</div>
            </div>
            <div class="field-row">
              <div class="checkbox">${permit.ppe ? '☑' : '☐'}</div>
              <div class="field-value">Persönliche Schutzausrüstung vorhanden</div>
            </div>
            <div class="field-row">
              <div class="checkbox">${permit.emergencyProcedures ? '☑' : '☐'}</div>
              <div class="field-value">Notfallverfahren kommuniziert</div>
            </div>
            <div class="field-row">
              <div class="checkbox">${permit.fireWatch ? '☑' : '☐'}</div>
              <div class="field-value">Brandwache zugewiesen</div>
            </div>
            <div class="field-row">
              <div class="checkbox">${permit.isolationLockout ? '☑' : '☐'}</div>
              <div class="field-value">Isolierung/Absperrung durchgeführt</div>
            </div>
          </div>

          ${permit.oxygenLevel || permit.lelLevel || permit.h2sLevel ? `
          <div class="section">
            <div class="section-title">ATMOSPHÄREN-MESSWERTE</div>
            ${permit.oxygenLevel ? `<div class="field-row"><div class="field-label">Sauerstoff:</div><div class="field-value">${permit.oxygenLevel}</div></div>` : ''}
            ${permit.lelLevel ? `<div class="field-row"><div class="field-label">LEL:</div><div class="field-value">${permit.lelLevel}</div></div>` : ''}
            ${permit.h2sLevel ? `<div class="field-row"><div class="field-label">H2S:</div><div class="field-value">${permit.h2sLevel}</div></div>` : ''}
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
                ${permit.operationsManagerApproval ? `Genehmigt: ${permit.operationsManagerApprovalDate ? new Date(permit.operationsManagerApprovalDate).toLocaleDateString('de-DE') : ''}` : 'Ausstehend'}
              </div>
            </div>
          </div>

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
