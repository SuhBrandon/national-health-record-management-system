/**
 * Audit Log Utility
 * Handles all audit logging operations across the NHRMS system
 */

interface AuditLogEntry {
  userId: string;
  action: string;
  tableName: string;
  recordId?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

/**
 * Log an action to the audit system
 */
export async function logAction(entry: AuditLogEntry): Promise<void> {
  try {
    const response = await fetch('/api/audit-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });

    if (!response.ok) {
      console.error('[v0] Failed to log audit entry:', await response.text());
    }
  } catch (error) {
    console.error('[v0] Audit logging error:', error);
  }
}

/**
 * Get audit logs for a user
 */
export async function getUserAuditLogs(
  userId: string,
  limit: number = 50
): Promise<AuditLogEntry[]> {
  try {
    const response = await fetch(
      `/api/audit-logs?userId=${userId}&limit=${limit}`
    );
    const data = await response.json();
    return data.logs || [];
  } catch (error) {
    console.error('[v0] Failed to fetch audit logs:', error);
    return [];
  }
}

/**
 * Get audit logs for a specific table
 */
export async function getTableAuditLogs(
  tableName: string,
  limit: number = 50
): Promise<AuditLogEntry[]> {
  try {
    const response = await fetch(
      `/api/audit-logs?tableName=${tableName}&limit=${limit}`
    );
    const data = await response.json();
    return data.logs || [];
  } catch (error) {
    console.error('[v0] Failed to fetch audit logs:', error);
    return [];
  }
}

/**
 * Common audit actions
 */
export const AUDIT_ACTIONS = {
  // Patient actions
  PATIENT_CREATED: 'patient.created',
  PATIENT_UPDATED: 'patient.updated',
  PATIENT_VIEWED: 'patient.viewed',
  PATIENT_RECORD_ACCESSED: 'patient.record_accessed',

  // Doctor actions
  PRESCRIPTION_ISSUED: 'prescription.issued',
  PRESCRIPTION_MODIFIED: 'prescription.modified',
  MEDICAL_RECORD_CREATED: 'medical_record.created',
  MEDICAL_RECORD_UPDATED: 'medical_record.updated',
  REFERRAL_CREATED: 'referral.created',

  // Nurse actions
  VITALS_RECORDED: 'vitals.recorded',
  MEDICATION_ADMINISTERED: 'medication.administered',
  PATIENT_NOTE_ADDED: 'patient_note.added',

  // Lab staff actions
  LAB_TEST_REQUESTED: 'lab_test.requested',
  LAB_RESULT_UPLOADED: 'lab_result.uploaded',
  LAB_RESULT_VALIDATED: 'lab_result.validated',

  // Pharmacist actions
  DRUG_DISPENSED: 'drug.dispensed',
  INVENTORY_UPDATED: 'inventory.updated',
  DRUG_ADDED: 'drug.added',
  STOCK_ADJUSTED: 'stock.adjusted',

  // Admin actions
  USER_CREATED: 'user.created',
  USER_DEACTIVATED: 'user.deactivated',
  APPOINTMENT_SCHEDULED: 'appointment.scheduled',
  APPOINTMENT_CANCELLED: 'appointment.cancelled',

  // System actions
  EMERGENCY_OVERRIDE: 'emergency.override',
  ACCESS_DENIED: 'access.denied',
  DATA_EXPORT: 'data.export',
};

/**
 * Helper to log medical record access
 */
export async function logRecordAccess(
  userId: string,
  recordId: string,
  recordType: 'patient' | 'prescription' | 'lab_result'
): Promise<void> {
  await logAction({
    userId,
    action: 'record.accessed',
    tableName: recordType,
    recordId,
    metadata: {
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Helper to log prescription action
 */
export async function logPrescriptionAction(
  userId: string,
  prescriptionId: string,
  action: 'created' | 'modified' | 'approved' | 'dispensed',
  changes?: Record<string, any>
): Promise<void> {
  await logAction({
    userId,
    action: `prescription.${action}`,
    tableName: 'prescriptions',
    recordId: prescriptionId,
    changes,
  });
}

/**
 * Helper to log vital signs recording
 */
export async function logVitalRecording(
  userId: string,
  patientId: string,
  vitalData: Record<string, any>
): Promise<void> {
  await logAction({
    userId,
    action: AUDIT_ACTIONS.VITALS_RECORDED,
    tableName: 'vitals_log',
    recordId: patientId,
    changes: vitalData,
  });
}

/**
 * Helper to log inventory changes
 */
export async function logInventoryChange(
  userId: string,
  itemId: string,
  action: 'added' | 'updated' | 'dispensed',
  changes: Record<string, any>
): Promise<void> {
  await logAction({
    userId,
    action: `inventory.${action}`,
    tableName: 'pharmacy_inventory',
    recordId: itemId,
    changes,
  });
}

/**
 * Helper to log compliance event
 */
export async function logComplianceEvent(
  userId: string,
  eventType: string,
  description: string,
  severity: 'low' | 'medium' | 'high'
): Promise<void> {
  await logAction({
    userId,
    action: 'compliance.event',
    tableName: 'compliance_events',
    metadata: {
      eventType,
      description,
      severity,
      timestamp: new Date().toISOString(),
    },
  });
}
