export interface PermitStats {
  activePermits: number;
  pendingApproval: number;
  expiredToday: number;
  completed: number;
}

export interface CreatePermitFormData {
  type: string;
  location: string;
  description: string;
  requestorName: string;
  department: string;
  contactNumber: string;
  emergencyContact: string;
  startDate: string;
  endDate: string;
  riskLevel?: string;
  safetyOfficer?: string;
  departmentHead: string;
  maintenanceApprover: string;
  identifiedHazards?: string;
  additionalComments?: string;
  selectedHazards?: string[];
  hazardNotes?: string;
  completedMeasures?: string[];
}

export interface HazardCategory {
  id: number;
  category: string;
  hazards: Hazard[];
}

export interface Hazard {
  hazard: string;
  protectiveMeasures: string;
}

export interface HazardNote {
  [hazardId: string]: string;
}
