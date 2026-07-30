/*
 * Domain types for the Telehealth With AI frontend.
 *
 * IDs are numeric to match the planned Spring/PostgreSQL schema
 * (BIGSERIAL primary keys) described in docs/current-backend-task-roadmap.md.
 * AppUser is the login identity; Patient and Doctor are role-specific
 * profiles linked one-to-one via appUserId.
 */

export type Role = 'ADMIN' | 'DOCTOR' | 'PATIENT'

export type ConsultationStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'

export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'DISMISSED' | 'RESOLVED'

/** The authenticated demo user held in AuthContext/session storage. */
export interface AuthUser {
  userId: number
  username: string
  displayName: string
  email: string
  role: Role
  /** For a PATIENT login, the patient profile this account owns. */
  patientId?: number
  /** For a DOCTOR login, the doctor profile / clinician account link. */
  doctorId?: number
}

export interface AppUser {
  userId: number
  username: string
  email: string
  role: Role
  enabled: boolean
}

export interface Doctor {
  doctorId: number
  appUserId?: number
  firstName: string
  lastName: string
  specialty: string
  /** Human-readable availability slots for the demo, e.g. "Mon 09:00". */
  availableTimes: string[]
}

export interface Patient {
  patientId: number
  appUserId?: number
  firstName: string
  lastName: string
  nhsNumber: string
  dateOfBirth: string // ISO date, e.g. "1985-04-12"
}

export interface Clinic {
  clinicId: number
  name: string
  address: string
}

export interface Consultation {
  consultationId: number
  patientId: number
  /** Clinician is an AppUser with role DOCTOR (schema: consultation.clinician_id). */
  clinicianId: number
  clinicId: number
  scheduledAt: string // ISO datetime
  status: ConsultationStatus
  transcript?: string | null
}

/** One clinician-reviewed symptom extracted from a transcript (mock AI output). */
export interface SymptomItem {
  name: string
  severity: 'MILD' | 'MODERATE' | 'SEVERE'
  confidence: number // 0..1
}

export interface SymptomRecord {
  symptomRecordId: number
  consultationId: number
  symptoms: SymptomItem[]
  modelName: string
  promptVersion: string
  createdAt: string
}

export interface Alert {
  alertId: number
  clinicId: number
  symptomName: string
  score: number
  status: AlertStatus
  createdAt: string
}
