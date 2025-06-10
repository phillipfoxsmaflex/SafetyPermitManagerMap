import type { Permit } from "@shared/schema";

export async function printPermitUnified(permit: Permit, attachments: any[] = []) {
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

  const getHazardDetails = (hazardId: string) => {
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
    
    return { category: category?.category || '', hazard: hazard || '' };
  };

  const formatDateTime = (dateTime: string | null) => {
    if (!dateTime) return 'Nicht angegeben';
    return new Date(dateTime).toLocaleDateString('de-DE', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string, mimeType: string) => {
    if (fileType === 'image') return '🖼️';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) return '📊';
    if (mimeType?.includes('word') || mimeType?.includes('document')) return '📝';
    return '📎';
  };

  const calculateWorkDuration = (start: string | null, end: string | null) => {
    if (!start || !end) return 'Nicht berechnet';
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const diffMs = endTime - startTime;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours}h ${diffMinutes}min`;
  };

  // Try to get company logo from admin settings
  let companyLogoHtml = '';
  try {
    const logoResponse = await fetch('/api/admin/company-logo');
    if (logoResponse.ok) {
      const logoData = await logoResponse.json();
      if (logoData.logoUrl) {
        companyLogoHtml = `<img src="${logoData.logoUrl}" alt="Firmenlogo" style="max-height: 80px; max-width: 200px; object-fit: contain;" />`;
      }
    }
  } catch (error) {
    console.log('No company logo found');
  }

  // Parse AI recommendations
  let immediateActionsHtml = '';
  let beforeWorkStartsHtml = '';
  let complianceNotesHtml = '';

  try {
    if (permit.immediateActions) {
      const actions = JSON.parse(permit.immediateActions);
      immediateActionsHtml = Array.isArray(actions) ? actions.map(action => `• ${action}`).join('<br>') : permit.immediateActions;
    }
    if (permit.beforeWorkStarts) {
      const actions = JSON.parse(permit.beforeWorkStarts);
      beforeWorkStartsHtml = Array.isArray(actions) ? actions.map(action => `• ${action}`).join('<br>') : permit.beforeWorkStarts;
    }
    if (permit.complianceNotes) {
      const notes = JSON.parse(permit.complianceNotes);
      complianceNotesHtml = Array.isArray(notes) ? notes.map(note => `• ${note}`).join('<br>') : permit.complianceNotes;
    }
  } catch (e) {
    // If JSON parsing fails, use the raw text
    immediateActionsHtml = permit.immediateActions || '';
    beforeWorkStartsHtml = permit.beforeWorkStarts || '';
    complianceNotesHtml = permit.complianceNotes || '';
  }

  // Parse completed measures
  let completedMeasuresHtml = '';
  if (permit.completedMeasures && permit.completedMeasures.length > 0) {
    completedMeasuresHtml = permit.completedMeasures.map(measure => `• ${measure}`).join('<br>');
  }

  // Generate hazard assessment HTML
  let hazardsHtml = '';
  let hazardNotesHtml = '';
  
  if (permit.selectedHazards && permit.selectedHazards.length > 0) {
    hazardsHtml = permit.selectedHazards.map(hazardId => {
      const details = getHazardDetails(hazardId);
      return `
        <div style="margin-bottom: 12px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; background-color: #f8f9fa;">
          <div style="font-weight: bold; color: #333; margin-bottom: 4px;">☑ ${details.category}</div>
          <div style="color: #666; margin-left: 16px;">• ${details.hazard}</div>
        </div>
      `;
    }).join('');

    // Parse hazard notes
    if (permit.hazardNotes && permit.hazardNotes !== '{}') {
      try {
        const notes = JSON.parse(permit.hazardNotes);
        hazardNotesHtml = Object.entries(notes).map(([hazardId, note]) => {
          if (!note) return '';
          const details = getHazardDetails(hazardId);
          return `<div style="margin-bottom: 8px;"><span style="font-weight: bold;">${details.hazard}:</span> ${note}</div>`;
        }).join('');
      } catch (e) {
        console.error('Error parsing hazard notes:', e);
      }
    }
  }

  // Generate attachments HTML
  let attachmentsHtml = '';
  if (attachments && attachments.length > 0) {
    attachmentsHtml = attachments.map(attachment => 
      `<div style="margin-bottom: 6px;">${getFileIcon(attachment.fileType, attachment.mimeType)} ${attachment.originalName} (${formatFileSize(attachment.fileSize)})</div>`
    ).join('');
  }

  const printContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Arbeitserlaubnis ${permit.permitId}</title>
        <meta charset="UTF-8">
        <style>
          @page { 
            size: A4; 
            margin: 1.5cm 2cm; 
          }
          body { 
            font-family: 'Arial', sans-serif; 
            font-size: 11px; 
            line-height: 1.3; 
            color: #000; 
            margin: 0;
            padding: 0;
          }
          .header { 
            text-align: center; 
            margin-bottom: 20px; 
            border-bottom: 2px solid #000; 
            padding-bottom: 15px; 
            position: relative;
          }
          .company-logo {
            position: absolute;
            top: 0;
            left: 0;
            max-height: 60px;
            max-width: 150px;
          }
          .header h1 { 
            font-size: 20px; 
            font-weight: bold; 
            margin: 0 0 8px 0; 
            letter-spacing: 2px;
          }
          .header .permit-info { 
            display: flex; 
            justify-content: space-between; 
            font-size: 10px; 
            margin-top: 10px;
          }
          .section-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
          }
          .section-full {
            grid-column: 1 / -1;
          }
          .section { 
            margin-bottom: 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 8px;
          }
          .section-title { 
            font-weight: bold; 
            font-size: 12px; 
            margin-bottom: 8px; 
            background-color: #f0f0f0;
            padding: 4px 6px;
            margin: -8px -8px 8px -8px;
            border-bottom: 1px solid #ccc;
          }
          .field-row { 
            display: flex; 
            margin-bottom: 4px; 
            align-items: flex-start;
          }
          .field-label { 
            font-weight: bold; 
            width: 110px; 
            flex-shrink: 0; 
            font-size: 10px;
          }
          .field-value { 
            flex: 1; 
            font-size: 10px;
            word-wrap: break-word;
          }
          .hazard-item {
            margin-bottom: 8px;
            padding: 6px;
            border: 1px solid #ddd;
            border-radius: 3px;
            background-color: #f8f9fa;
            font-size: 10px;
          }
          .hazard-category {
            font-weight: bold;
            color: #333;
            margin-bottom: 3px;
          }
          .hazard-detail {
            color: #666;
            margin-left: 12px;
          }
          .signatures-container {
            margin-top: 20px;
            page-break-inside: avoid;
          }
          .signatures-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
          }
          .signature-box {
            border: 1px solid #000;
            padding: 8px;
            text-align: center;
            min-height: 60px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .signature-title {
            font-weight: bold;
            font-size: 10px;
            margin-bottom: 5px;
          }
          .signature-line {
            border-top: 1px solid #000;
            margin-top: auto;
            padding-top: 5px;
          }
          .signature-name {
            font-size: 9px;
            margin-top: 3px;
          }
          .signature-date {
            font-size: 8px;
            color: #666;
          }
          .performer-section {
            border: 2px solid #333;
            padding: 10px;
            margin-top: 15px;
            background-color: #f9f9f9;
          }
          .performer-signature {
            border: 1px solid #000;
            padding: 10px;
            margin: 10px 0;
            min-height: 50px;
            text-align: center;
            background-color: white;
          }
          .performer-signature img {
            max-height: 40px;
            max-width: 200px;
          }
          .work-tracking {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 10px;
          }
          .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 8px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 8px;
          }
          .status-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .status-approved {
            background-color: #d4edda;
            color: #155724;
          }
          .status-pending {
            background-color: #fff3cd;
            color: #856404;
          }
          .status-active {
            background-color: #cce5ff;
            color: #004085;
          }
          .measures-list {
            margin-bottom: 10px;
          }
          .measures-list > div {
            margin-bottom: 6px;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; }
            .section { page-break-inside: avoid; }
            .signatures-container { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header">
          ${companyLogoHtml ? `<div class="company-logo">${companyLogoHtml}</div>` : ''}
          <h1>ARBEITSERLAUBNIS</h1>
          <div class="permit-info">
            <span>Genehmigungsnummer: <strong>${permit.permitId}</strong></span>
            <span>Status: <span class="status-badge status-${permit.status.toLowerCase()}">${permit.status}</span></span>
            <span>Erstellt: ${formatDateTime(permit.createdAt)}</span>
          </div>
        </div>

        <!-- Basic Information Grid -->
        <div class="section-container">
          <div class="section">
            <div class="section-title">ANTRAGSTELLER & ARBEITSORT</div>
            <div class="field-row">
              <div class="field-label">Name:</div>
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
              <div class="field-label">Notfall:</div>
              <div class="field-value">${permit.emergencyContact}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Arbeitsort:</div>
              <div class="field-value">${permit.location}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Beschreibung:</div>
              <div class="field-value">${permit.description}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">GENEHMIGUNGSDETAILS</div>
            <div class="field-row">
              <div class="field-label">Typ:</div>
              <div class="field-value">${getPermitTypeLabel(permit.type)}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Risikostufe:</div>
              <div class="field-value">${permit.riskLevel || 'Nicht angegeben'}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Gesamtrisiko:</div>
              <div class="field-value">${permit.overallRisk || 'Nicht bewertet'}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Start:</div>
              <div class="field-value">${formatDateTime(permit.startDate)}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Ende:</div>
              <div class="field-value">${formatDateTime(permit.endDate)}</div>
            </div>
          </div>
        </div>

        <!-- TRBS Hazard Assessment -->
        ${hazardsHtml ? `
        <div class="section section-full">
          <div class="section-title">TRBS GEFÄHRDUNGSBEURTEILUNG</div>
          ${hazardsHtml}
          ${hazardNotesHtml ? `
          <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #ddd;">
            <strong>Zusätzliche Notizen zu Gefahren:</strong><br>
            ${hazardNotesHtml}
          </div>` : ''}
          ${completedMeasuresHtml ? `
          <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #ddd;">
            <strong>Abgeschlossene Schutzmaßnahmen:</strong><br>
            ${completedMeasuresHtml}
          </div>` : ''}
          ${permit.identifiedHazards ? `
          <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #ddd;">
            <strong>Identifizierte Gefahren:</strong><br>
            ${permit.identifiedHazards}
          </div>` : ''}
        </div>` : ''}

        <!-- Measures Section -->
        ${(immediateActionsHtml || beforeWorkStartsHtml || complianceNotesHtml || permit.additionalComments) ? `
        <div class="section section-full">
          <div class="section-title">MAßNAHMEN</div>
          ${immediateActionsHtml ? `
          <div class="measures-list">
            <strong>Allgemeine Maßnahmen:</strong><br>
            ${immediateActionsHtml}
          </div>` : ''}
          ${beforeWorkStartsHtml ? `
          <div class="measures-list">
            <strong>Vor Arbeitsbeginn durchzuführen:</strong><br>
            ${beforeWorkStartsHtml}
          </div>` : ''}
          ${complianceNotesHtml ? `
          <div class="measures-list">
            <strong>Compliance-Hinweise:</strong><br>
            ${complianceNotesHtml}
          </div>` : ''}
          ${permit.additionalComments ? `
          <div class="measures-list">
            <strong>Zusätzliche Kommentare:</strong><br>
            ${permit.additionalComments}
          </div>` : ''}
        </div>` : ''}

        <!-- Attachments -->
        ${attachmentsHtml ? `
        <div class="section section-full">
          <div class="section-title">ANHÄNGE & DOKUMENTE</div>
          ${attachmentsHtml}
        </div>` : ''}

        <!-- Approvals -->
        <div class="signatures-container">
          <div class="section-title">GENEHMIGUNGEN & UNTERSCHRIFTEN</div>
          <div class="signatures-grid">
            <div class="signature-box">
              <div class="signature-title">ABTEILUNGSLEITER</div>
              <div class="signature-line">
                <div class="signature-name">${permit.departmentHead || 'Nicht zugewiesen'}</div>
                <div class="signature-date">
                  ${permit.departmentHeadApproval ? `✓ ${formatDateTime(permit.departmentHeadApprovalDate)}` : 'Ausstehend'}
                </div>
              </div>
            </div>
            <div class="signature-box">
              <div class="signature-title">SICHERHEITSBEAUFTR.</div>
              <div class="signature-line">
                <div class="signature-name">${permit.safetyOfficer || 'Nicht zugewiesen'}</div>
                <div class="signature-date">
                  ${permit.safetyOfficerApproval ? `✓ ${formatDateTime(permit.safetyOfficerApprovalDate)}` : 'Ausstehend'}
                </div>
              </div>
            </div>
            <div class="signature-box">
              <div class="signature-title">BETRIEBSLEITER</div>
              <div class="signature-line">
                <div class="signature-name">${permit.maintenanceApprover || 'Nicht zugewiesen'}</div>
                <div class="signature-date">
                  ${permit.maintenanceApproval ? `✓ ${formatDateTime(permit.maintenanceApprovalDate)}` : 'Ausstehend'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Performer Section -->
        ${permit.performerName ? `
        <div class="performer-section">
          <div class="section-title">DURCHFÜHRUNG & ARBEITSNACHWEIS</div>
          <div class="work-tracking">
            <div>
              <div class="field-row">
                <div class="field-label">Durchführer:</div>
                <div class="field-value">${permit.performerName}</div>
              </div>
              <div class="field-row">
                <div class="field-label">Arbeitsbeginn:</div>
                <div class="field-value">${formatDateTime(permit.workStartedAt)}</div>
              </div>
              <div class="field-row">
                <div class="field-label">Arbeitsende:</div>
                <div class="field-value">${formatDateTime(permit.workCompletedAt)}</div>
              </div>
            </div>
            <div>
              <div class="field-row">
                <div class="field-label">Arbeitszeit:</div>
                <div class="field-value">${calculateWorkDuration(permit.workStartedAt, permit.workCompletedAt)}</div>
              </div>
              <div class="field-row">
                <div class="field-label">Status:</div>
                <div class="field-value">${permit.workCompletedAt ? 'Abgeschlossen' : 'In Bearbeitung'}</div>
              </div>
            </div>
          </div>
          
          <div style="margin-top: 15px;">
            <strong>Unterschrift Durchführer:</strong>
            <div class="performer-signature">
              ${permit.performerSignature ? 
                `<img src="${permit.performerSignature}" alt="Unterschrift ${permit.performerName}" />
                 <div style="margin-top: 10px; font-size: 10px;">${permit.performerName} - ${formatDateTime(permit.workCompletedAt || permit.workStartedAt)}</div>` : 
                `<div style="padding: 20px; color: #666;">Unterschrift ausstehend</div>`
              }
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
            <div>
              <strong>Brandwache/Sicherheitsposten:</strong>
              <div style="border-bottom: 1px solid #000; margin-top: 10px; padding-bottom: 5px; min-height: 20px;"></div>
              <div style="font-size: 9px; margin-top: 5px;">Name, Unterschrift</div>
            </div>
            <div>
              <strong>Arbeitsende bestätigt:</strong>
              <div style="border-bottom: 1px solid #000; margin-top: 10px; padding-bottom: 5px; min-height: 20px;"></div>
              <div style="font-size: 9px; margin-top: 5px;">Vorgesetzter, Datum</div>
            </div>
          </div>
        </div>` : ''}

        <!-- Footer -->
        <div class="footer">
          <div style="display: flex; justify-content: space-between;">
            <span>Erstellt: ${formatDateTime(permit.createdAt)}</span>
            <span>Letzte Änderung: ${formatDateTime(permit.updatedAt)}</span>
          </div>
          <div style="margin-top: 5px;">
            <span>System: Biggs v2.1 | Dokument-ID: ${permit.permitId} | Version: ${permit.id}.${new Date().getTime()}</span>
          </div>
        </div>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for images and styles to load before printing
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 1500);
  } else {
    alert('Pop-up blockiert. Bitte erlauben Sie Pop-ups für diese Seite, um zu drucken.');
  }
}

// Legacy function for backward compatibility
export function printPermit(permit: Permit) {
  printPermitUnified(permit, []);
}