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
  identifiedHazards?: string;
  additionalComments?: string;
  atmosphereTest?: boolean;
  ventilation?: boolean;
  ppe?: boolean;
  emergencyProcedures?: boolean;
  fireWatch?: boolean;
  isolationLockout?: boolean;
  oxygenLevel?: string;
  lelLevel?: string;
  h2sLevel?: string;
}
