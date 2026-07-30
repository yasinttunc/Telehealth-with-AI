/*
 * Mock data for the Telehealth With AI demo frontend.
 *
 * This is the ONLY module that owns demo arrays. Pages must never import
 * from here directly — they go through src/api (see spec §2). Keeping the
 * data in one place gives a clean replacement path once the Spring backend
 * exposes real clinic/consultation/symptom/alert endpoints.
 *
 * Sizes follow spec §7: 3 doctors, 6 patients, 3 clinics, 6 consultations,
 * 3 alerts. IDs are stable and numeric to match the planned backend schema.
 */

import type {
  Alert,
  AppUser,
  Clinic,
  Consultation,
  Doctor,
  Patient,
  Role,
  SymptomRecord,
} from '../types/domain'

/** Demo login accounts. Passwords are plain text ON PURPOSE — this is a
 *  mock-mode stand-in until Spring JWT login exists. Do NOT treat as real
 *  security (spec §3). */
export interface DemoAccount {
  userId: number
  username: string
  password: string
  displayName: string
  email: string
  role: Role
  patientId?: number
  doctorId?: number
}

export const demoAccounts: DemoAccount[] = [
  {
    userId: 1,
    username: 'admin',
    password: 'admin',
    displayName: 'System Administrator',
    email: 'admin@telehealth.example',
    role: 'ADMIN',
  },
  {
    userId: 2,
    username: 'dr.sarah.patel',
    password: 'password',
    displayName: 'Dr Sarah Patel',
    email: 'sarah.patel@telehealth.example',
    role: 'DOCTOR',
    doctorId: 1,
  },
  {
    userId: 5,
    username: 'patient.oliver.hughes',
    password: 'password',
    displayName: 'Oliver Hughes',
    email: 'oliver.hughes@telehealth.example',
    role: 'PATIENT',
    patientId: 1,
  },
]

/** All app_user rows (admin management screen). Includes the demo accounts
 *  plus a few unlinked profiles so the Users list is not trivial. */
export const appUsers: AppUser[] = [
  { userId: 1, username: 'admin', email: 'admin@telehealth.example', role: 'ADMIN', enabled: true },
  { userId: 2, username: 'dr.sarah.patel', email: 'sarah.patel@telehealth.example', role: 'DOCTOR', enabled: true },
  { userId: 3, username: 'dr.james.okoro', email: 'james.okoro@telehealth.example', role: 'DOCTOR', enabled: true },
  { userId: 4, username: 'dr.mei.lin', email: 'mei.lin@telehealth.example', role: 'DOCTOR', enabled: true },
  { userId: 5, username: 'patient.oliver.hughes', email: 'oliver.hughes@telehealth.example', role: 'PATIENT', enabled: true },
  { userId: 6, username: 'patient.amara.said', email: 'amara.said@telehealth.example', role: 'PATIENT', enabled: true },
  { userId: 7, username: 'patient.tomasz.nowak', email: 'tomasz.nowak@telehealth.example', role: 'PATIENT', enabled: false },
]

export const doctors: Doctor[] = [
  {
    doctorId: 1,
    appUserId: 2,
    firstName: 'Sarah',
    lastName: 'Patel',
    specialty: 'General Practice',
    availableTimes: ['Mon 09:00', 'Wed 13:00', 'Fri 10:00'],
  },
  {
    doctorId: 2,
    appUserId: 3,
    firstName: 'James',
    lastName: 'Okoro',
    specialty: 'Cardiology',
    availableTimes: ['Tue 11:00', 'Thu 15:00'],
  },
  {
    doctorId: 3,
    appUserId: 4,
    firstName: 'Mei',
    lastName: 'Lin',
    specialty: 'Dermatology',
    availableTimes: ['Mon 14:00', 'Wed 09:00'],
  },
]

export const patients: Patient[] = [
  { patientId: 1, appUserId: 5, firstName: 'Oliver', lastName: 'Hughes', nhsNumber: '4857773456', dateOfBirth: '1985-04-12' },
  { patientId: 2, appUserId: 6, firstName: 'Amara', lastName: 'Said', nhsNumber: '9012345678', dateOfBirth: '1992-11-03' },
  { patientId: 3, appUserId: 7, firstName: 'Tomasz', lastName: 'Nowak', nhsNumber: '3216549870', dateOfBirth: '1978-07-21' },
  { patientId: 4, firstName: 'Priya', lastName: 'Sharma', nhsNumber: '7418529630', dateOfBirth: '2001-01-30' },
  { patientId: 5, firstName: 'Liam', lastName: "O'Brien", nhsNumber: '8529637410', dateOfBirth: '1965-09-15' },
  { patientId: 6, firstName: 'Grace', lastName: 'Bennett', nhsNumber: '1597534862', dateOfBirth: '1990-03-08' },
]

export const clinics: Clinic[] = [
  { clinicId: 1, name: 'Swansea Central Clinic', address: '12 Kingsway, Swansea SA1 5JQ' },
  { clinicId: 2, name: 'Cardiff Bay Health Centre', address: '5 Bute Terrace, Cardiff CF10 2FL' },
  { clinicId: 3, name: 'Newport Riverside Practice', address: '88 Commercial St, Newport NP20 1LN' },
]

const COMPLETED_TRANSCRIPT_1 =
  'Patient reports a persistent dry cough for the past ten days, worse at night. ' +
  'Mild shortness of breath on exertion. No fever. No chest pain. ' +
  'Occasional headaches. Advised rest, fluids, and a follow-up if symptoms worsen.'

const COMPLETED_TRANSCRIPT_2 =
  'Patient describes an itchy rash on both forearms lasting five days. ' +
  'No known new allergens. Mild fatigue reported. Prescribed a topical steroid ' +
  'cream and advised to monitor for spreading.'

/* Clinician IDs reference AppUser.userId (schema: consultation.clinician_id
 * -> app_user.user_id): 2 = Dr Sarah Patel, 3 = Dr James Okoro, 4 = Dr Mei Lin.
 * Patient 1 (Oliver Hughes) owns c1 (upcoming) and c2 (completed history) so the
 * patient demo account has a meaningful, isolated view (spec §7). */
export const consultations: Consultation[] = [
  { consultationId: 1, patientId: 1, clinicianId: 2, clinicId: 1, scheduledAt: '2026-08-05T09:00:00Z', status: 'SCHEDULED', transcript: null },
  { consultationId: 2, patientId: 1, clinicianId: 3, clinicId: 2, scheduledAt: '2026-06-10T13:30:00Z', status: 'COMPLETED', transcript: COMPLETED_TRANSCRIPT_1 },
  { consultationId: 3, patientId: 2, clinicianId: 2, clinicId: 1, scheduledAt: '2026-07-30T11:00:00Z', status: 'IN_PROGRESS', transcript: null },
  { consultationId: 4, patientId: 3, clinicianId: 2, clinicId: 1, scheduledAt: '2026-08-02T14:00:00Z', status: 'SCHEDULED', transcript: null },
  { consultationId: 5, patientId: 4, clinicianId: 4, clinicId: 3, scheduledAt: '2026-05-20T10:00:00Z', status: 'COMPLETED', transcript: COMPLETED_TRANSCRIPT_2 },
  { consultationId: 6, patientId: 5, clinicianId: 3, clinicId: 2, scheduledAt: '2026-06-25T15:30:00Z', status: 'CANCELLED', transcript: null },
]

/* Reviewed symptom records keyed to completed consultations that have a
 * transcript. This is MOCK AI output, not a live clinical extraction. */
export const symptomRecords: SymptomRecord[] = [
  {
    symptomRecordId: 1,
    consultationId: 2,
    modelName: 'clinical-extractor (mock)',
    promptVersion: 'demo-v1',
    createdAt: '2026-06-10T13:55:00Z',
    symptoms: [
      { name: 'Dry cough', severity: 'MODERATE', confidence: 0.88 },
      { name: 'Shortness of breath', severity: 'MILD', confidence: 0.72 },
      { name: 'Headache', severity: 'MILD', confidence: 0.61 },
    ],
  },
  {
    symptomRecordId: 2,
    consultationId: 5,
    modelName: 'clinical-extractor (mock)',
    promptVersion: 'demo-v1',
    createdAt: '2026-05-20T10:20:00Z',
    symptoms: [
      { name: 'Skin rash', severity: 'MODERATE', confidence: 0.9 },
      { name: 'Fatigue', severity: 'MILD', confidence: 0.55 },
    ],
  },
]

export const alerts: Alert[] = [
  { alertId: 1, clinicId: 1, symptomName: 'Dry cough', score: 3.4, status: 'OPEN', createdAt: '2026-07-29T08:00:00Z' },
  { alertId: 2, clinicId: 2, symptomName: 'Fever', score: 2.1, status: 'ACKNOWLEDGED', createdAt: '2026-07-28T16:30:00Z' },
  { alertId: 3, clinicId: 3, symptomName: 'Skin rash', score: 1.8, status: 'RESOLVED', createdAt: '2026-07-20T09:15:00Z' },
]
