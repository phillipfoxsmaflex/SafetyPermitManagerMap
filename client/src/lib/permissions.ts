import type { User, Permit } from "@shared/schema";

export function hasPermission(user: User, permit: Permit, requiredPermissions: string[]): boolean {
  // If 'any' is in required permissions, always allow
  if (requiredPermissions.includes('any')) {
    return true;
  }
  
  const userPermissions = getUserPermissions(user, permit);
  return requiredPermissions.some(permission => userPermissions.includes(permission));
}

export function getUserPermissions(user: User, permit: Permit): string[] {
  const permissions: string[] = [];
  
  // Admin hat alle Rechte
  if (user.role === 'admin') {
    permissions.push('admin', 'creator', 'approver', 'supervisor', 'performer');
    return permissions;
  }
  
  // Ersteller-Rechte (basierend auf requestorName)
  if (permit.requestorName === user.username) {
    permissions.push('creator');
  }
  
  // Genehmiger-Rechte basierend auf Rolle
  if (user.role === 'department_head') {
    permissions.push('approver');
  }
  if (user.role === 'safety_officer') {
    permissions.push('approver');
  }
  if (user.role === 'maintenance') {
    permissions.push('approver');
  }
  
  // Supervisor-Rechte - Department Heads, Safety Officers und Maintenance können als Supervisors agieren
  if (user.role === 'supervisor' || user.role === 'department_head' || user.role === 'safety_officer' || user.role === 'maintenance') {
    permissions.push('supervisor');
  }
  
  // Durchführer-Rechte (basierend auf performerName)
  if (permit.performerName === user.username) {
    permissions.push('performer');
  }
  
  // Spezifische Genehmiger-Rechte basierend auf Namen in der Genehmigung
  if (permit.departmentHead === user.username) {
    permissions.push('approver');
  }
  if (permit.safetyOfficer === user.username) {
    permissions.push('approver');
  }
  if (permit.maintenanceApprover === user.username) {
    permissions.push('approver');
  }
  
  return permissions;
}

export function canEditPermit(user: User, permit: Permit): boolean {
  // Admin kann immer bearbeiten
  if (user.role === 'admin') {
    return true;
  }
  
  // Nur im Draft-Status editierbar
  if (permit.status !== 'draft') {
    return false;
  }
  
  // Ersteller kann eigene Entwürfe bearbeiten
  return permit.requestorName === user.username;
}

export function canApprovePermit(user: User, permit: Permit): boolean {
  // Muss im pending Status sein
  if (permit.status !== 'pending') {
    return false;
  }
  
  const userPermissions = getUserPermissions(user, permit);
  return userPermissions.includes('approver') || userPermissions.includes('admin');
}

export function isAllApprovalReceived(permit: Permit): boolean {
  // Prüfe ob alle erforderlichen Genehmigungen vorliegen
  let requiredApprovals = 0;
  let receivedApprovals = 0;
  
  // Abteilungsleiter (immer erforderlich)
  if (permit.departmentHead) {
    requiredApprovals++;
    if (permit.departmentHeadApproval) {
      receivedApprovals++;
    }
  }
  
  // Instandhaltung/Engineering (immer erforderlich)
  if (permit.maintenanceApprover) {
    requiredApprovals++;
    if (permit.maintenanceApproval) {
      receivedApprovals++;
    }
  }
  
  // Sicherheitsbeauftragter (optional, aber wenn gesetzt dann erforderlich)
  if (permit.safetyOfficer) {
    requiredApprovals++;
    if (permit.safetyOfficerApproval) {
      receivedApprovals++;
    }
  }
  
  return requiredApprovals > 0 && receivedApprovals === requiredApprovals;
}