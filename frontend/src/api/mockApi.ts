/*
 * mockApi — in-memory implementation of the whole API surface.
 *
 * This remains a development-only fallback. The live application uses
 * springApi through src/api/index.ts.
 *
 * State lives in module-level arrays seeded from ../data/mockData. Mutations
 * persist for the browser session and reset on reload, which is fine for a demo.
 */

import {
  alerts as seedAlerts,
  appUsers as seedUsers,
  clinics as seedClinics,
  consultations as seedConsultations,
  demoAccounts,
  doctors as seedDoctors,
  patients as seedPatients,
  symptomRecords as seedSymptoms,
} from '../data/mockData'
import type {
  Alert,
  AppUser,
  AuthUser,
  Clinic,
  Consultation,
  Doctor,
  Patient,
  SymptomRecord,
} from '../types/domain'
import {
  ApiError,
  type ConsultationQuery,
  type CreateClinicRequest,
  type CreateConsultationRequest,
  type CreateDoctorRequest,
  type CreatePatientRequest,
  type CreateUserRequest,
  type LoginRequest,
  type UpdateAlertStatusRequest,
  type UpdateClinicRequest,
  type UpdateConsultationStatusRequest,
  type UpdateDoctorRequest,
  type UpdatePatientRequest,
  type UpdateUserRequest,
} from './types'

// --- mutable session state (deep-ish copies of the seed data) -------------
let users: AppUser[] = seedUsers.map((u) => ({ ...u }))
let doctors: Doctor[] = seedDoctors.map((d) => ({ ...d, availableTimes: [...d.availableTimes] }))
let patients: Patient[] = seedPatients.map((p) => ({ ...p }))
let clinics: Clinic[] = seedClinics.map((c) => ({ ...c }))
let consultations: Consultation[] = seedConsultations.map((c) => ({ ...c }))
const symptoms: SymptomRecord[] = seedSymptoms.map((s) => ({ ...s, symptoms: s.symptoms.map((x) => ({ ...x })) }))
let alerts: Alert[] = seedAlerts.map((a) => ({ ...a }))

// Simulate network latency so loading states are exercised.
const delay = (ms = 250) => new Promise((res) => setTimeout(res, ms))
const nextId = (rows: { [k: string]: unknown }[], key: string) =>
  rows.reduce((max, r) => Math.max(max, Number(r[key]) || 0), 0) + 1

// --- auth ------------------------------------------------------------------
// TODO: replace with POST /api/auth/login once Phase 3 backend JWT work lands.
async function login({ usernameOrEmail, password }: LoginRequest): Promise<AuthUser> {
  await delay()
  const account = demoAccounts.find(
    (a) => a.username.toLowerCase() === usernameOrEmail.trim().toLowerCase() && a.password === password,
  )
  if (!account) {
    // One generic message whether username or password is wrong (spec §5.1).
    throw new ApiError(401, 'Invalid username or password')
  }
  const { password: _pw, ...authUser } = account
  return authUser
}

// --- users (real routes: /api/users, ADMIN only) ---------------------------
async function listUsers(): Promise<AppUser[]> {
  await delay()
  return users.map((u) => ({ ...u }))
}
async function createUser(req: CreateUserRequest): Promise<AppUser> {
  await delay()
  if (users.some((u) => u.username.toLowerCase() === req.username.trim().toLowerCase())) {
    throw new ApiError(409, 'Username already exists', { username: 'Username already exists' })
  }
  if (users.some((u) => u.email.toLowerCase() === req.email.trim().toLowerCase())) {
    throw new ApiError(409, 'Email already exists', { email: 'Email already exists' })
  }
  const user: AppUser = {
    userId: nextId(users as never, 'userId'),
    username: req.username.trim(),
    email: req.email.trim(),
    role: req.role,
    enabled: true,
  }
  users = [...users, user]
  return { ...user }
}
async function updateUser(id: number, req: UpdateUserRequest): Promise<AppUser> {
  await delay()
  const existing = users.find((u) => u.userId === id)
  if (!existing) throw new ApiError(404, 'User not found')
  users = users.map((u) =>
    u.userId === id
      ? { ...u, username: req.username.trim(), email: req.email.trim(), role: req.role, enabled: req.enabled }
      : u,
  )
  return { ...users.find((u) => u.userId === id)! }
}
async function deleteUser(id: number): Promise<void> {
  await delay()
  const target = users.find((u) => u.userId === id)
  if (!target) throw new ApiError(404, 'User not found')
  const remainingAdmins = users.filter((u) => u.role === 'ADMIN' && u.userId !== id)
  if (target.role === 'ADMIN' && remainingAdmins.length === 0) {
    throw new ApiError(409, 'Cannot delete the last remaining ADMIN account')
  }
  if (doctors.some((doctor) => doctor.appUserId === id) || patients.some((patient) => patient.appUserId === id)) {
    throw new ApiError(409, 'Cannot delete an account while it is linked to a profile')
  }
  users = users.filter((u) => u.userId !== id)
}

// --- doctors (real routes: /api/doctors; mutations ADMIN only) -------------
async function listDoctors(): Promise<Doctor[]> {
  await delay()
  return doctors.map((d) => ({ ...d }))
}
async function getDoctor(id: number): Promise<Doctor> {
  await delay()
  const d = doctors.find((x) => x.doctorId === id)
  if (!d) throw new ApiError(404, 'Doctor not found')
  return { ...d }
}
async function createDoctor(req: CreateDoctorRequest): Promise<Doctor> {
  await delay()
  if (users.some((u) => u.username.toLowerCase() === req.username.trim().toLowerCase())) throw new ApiError(409, 'Username already exists', { username: 'Username already exists' })
  if (users.some((u) => u.email.toLowerCase() === req.email.trim().toLowerCase())) throw new ApiError(409, 'Email already exists', { email: 'Email already exists' })
  const account: AppUser = { userId: nextId(users as never, 'userId'), username: req.username.trim(), email: req.email.trim(), role: 'DOCTOR', enabled: true }
  users = [...users, account]
  const doctor: Doctor = {
    doctorId: nextId(doctors as never, 'doctorId'),
    appUserId: account.userId,
    firstName: req.firstName.trim(),
    lastName: req.lastName.trim(),
    specialty: req.specialty.trim(),
    availableTimes: req.availableTimes,
  }
  doctors = [...doctors, doctor]
  return { ...doctor }
}
async function updateDoctor(id: number, req: UpdateDoctorRequest): Promise<Doctor> {
  await delay()
  const existing = doctors.find((d) => d.doctorId === id)
  if (!existing) throw new ApiError(404, 'Doctor not found')
  const account = users.find((u) => u.userId === existing.appUserId)
  if (!account) throw new ApiError(409, 'Doctor account is missing')
  if (users.some((u) => u.userId !== account.userId && u.username.toLowerCase() === req.username.trim().toLowerCase())) throw new ApiError(409, 'Username already exists', { username: 'Username already exists' })
  if (users.some((u) => u.userId !== account.userId && u.email.toLowerCase() === req.email.trim().toLowerCase())) throw new ApiError(409, 'Email already exists', { email: 'Email already exists' })
  users = users.map((u) => u.userId === account.userId ? { ...u, username: req.username.trim(), email: req.email.trim(), enabled: req.enabled } : u)
  doctors = doctors.map((d) =>
    d.doctorId === id
      ? { ...d, firstName: req.firstName.trim(), lastName: req.lastName.trim(), specialty: req.specialty.trim(), availableTimes: req.availableTimes }
      : d,
  )
  return { ...doctors.find((d) => d.doctorId === id)! }
}
async function deleteDoctor(id: number): Promise<void> {
  await delay()
  if (!doctors.some((d) => d.doctorId === id)) throw new ApiError(404, 'Doctor not found')
  doctors = doctors.filter((d) => d.doctorId !== id)
}

// --- patients (real routes: /api/patients; mutations ADMIN/DOCTOR) ---------
async function listPatients(): Promise<Patient[]> {
  await delay()
  return patients.map((p) => ({ ...p }))
}
async function getPatient(id: number): Promise<Patient> {
  await delay()
  const p = patients.find((x) => x.patientId === id)
  if (!p) throw new ApiError(404, 'Patient not found')
  return { ...p }
}
async function createPatient(req: CreatePatientRequest): Promise<Patient> {
  await delay()
  if (patients.some((p) => p.nhsNumber === req.nhsNumber.trim())) {
    throw new ApiError(409, 'NHS number already exists', { nhsNumber: 'NHS number already exists' })
  }
  if (users.some((u) => u.username.toLowerCase() === req.username.trim().toLowerCase())) throw new ApiError(409, 'Username already exists', { username: 'Username already exists' })
  if (users.some((u) => u.email.toLowerCase() === req.email.trim().toLowerCase())) throw new ApiError(409, 'Email already exists', { email: 'Email already exists' })
  const account: AppUser = { userId: nextId(users as never, 'userId'), username: req.username.trim(), email: req.email.trim(), role: 'PATIENT', enabled: true }
  users = [...users, account]
  const patient: Patient = {
    patientId: nextId(patients as never, 'patientId'),
    appUserId: account.userId,
    firstName: req.firstName.trim(),
    lastName: req.lastName.trim(),
    nhsNumber: req.nhsNumber.trim(),
    dateOfBirth: req.dateOfBirth,
  }
  patients = [...patients, patient]
  return { ...patient }
}
async function updatePatient(id: number, req: UpdatePatientRequest): Promise<Patient> {
  await delay()
  const existing = patients.find((p) => p.patientId === id)
  if (!existing) throw new ApiError(404, 'Patient not found')
  const account = users.find((u) => u.userId === existing.appUserId)
  if (!account) throw new ApiError(409, 'Patient account is missing')
  if (users.some((u) => u.userId !== account.userId && u.username.toLowerCase() === req.username.trim().toLowerCase())) throw new ApiError(409, 'Username already exists', { username: 'Username already exists' })
  if (users.some((u) => u.userId !== account.userId && u.email.toLowerCase() === req.email.trim().toLowerCase())) throw new ApiError(409, 'Email already exists', { email: 'Email already exists' })
  users = users.map((u) => u.userId === account.userId ? { ...u, username: req.username.trim(), email: req.email.trim(), enabled: req.enabled } : u)
  patients = patients.map((p) =>
    p.patientId === id
      ? { ...p, firstName: req.firstName.trim(), lastName: req.lastName.trim(), dateOfBirth: req.dateOfBirth }
      : p,
  )
  return { ...patients.find((p) => p.patientId === id)! }
}
async function deletePatient(id: number): Promise<void> {
  await delay()
  if (!patients.some((p) => p.patientId === id)) throw new ApiError(404, 'Patient not found')
  patients = patients.filter((p) => p.patientId !== id)
}

// --- clinics (planned backend feature; mock only) --------------------------
async function listClinics(): Promise<Clinic[]> {
  await delay()
  return clinics.map((c) => ({ ...c }))
}
async function createClinic(req: CreateClinicRequest): Promise<Clinic> {
  await delay()
  const clinic: Clinic = {
    clinicId: nextId(clinics as never, 'clinicId'),
    clinicName: req.clinicName.trim(),
    clinicAddress: req.clinicAddress.trim(),
  }
  clinics = [...clinics, clinic]
  return { ...clinic }
}
async function updateClinic(id: number, req: UpdateClinicRequest): Promise<Clinic> {
  await delay()
  if (!clinics.some((c) => c.clinicId === id)) throw new ApiError(404, 'Clinic not found')
  clinics = clinics.map((c) => (c.clinicId === id ? { ...c, clinicName: req.clinicName.trim(), clinicAddress: req.clinicAddress.trim() } : c))
  return { ...clinics.find((c) => c.clinicId === id)! }
}
async function deleteClinic(id: number): Promise<void> {
  await delay()
  if (!clinics.some((c) => c.clinicId === id)) throw new ApiError(404, 'Clinic not found')
  clinics = clinics.filter((c) => c.clinicId !== id)
}

// --- consultations (planned backend feature; mock only) --------------------
async function listConsultations(query: ConsultationQuery = {}): Promise<Consultation[]> {
  await delay()
  let rows = consultations.map((c) => ({ ...c }))
  if (query.patientId != null) rows = rows.filter((c) => c.patientId === query.patientId)
  if (query.clinicianId != null) rows = rows.filter((c) => c.clinicianId === query.clinicianId)
  return rows.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
}
async function getConsultation(id: number): Promise<Consultation> {
  await delay()
  const c = consultations.find((x) => x.consultationId === id)
  if (!c) throw new ApiError(404, 'Consultation not found')
  return { ...c }
}
async function createConsultation(req: CreateConsultationRequest): Promise<Consultation> {
  await delay()
  const consultation: Consultation = {
    consultationId: nextId(consultations as never, 'consultationId'),
    patientId: req.patientId,
    clinicianId: req.clinicianId,
    clinicId: req.clinicId,
    scheduledAt: req.scheduledAt,
    status: 'SCHEDULED',
    transcript: null,
  }
  consultations = [...consultations, consultation]
  return { ...consultation }
}
async function updateConsultationStatus(id: number, req: UpdateConsultationStatusRequest): Promise<Consultation> {
  await delay()
  const existing = consultations.find((c) => c.consultationId === id)
  if (!existing) throw new ApiError(404, 'Consultation not found')
  const allowed: Record<Consultation['status'], Consultation['status'][]> = {
    SCHEDULED: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
  }
  if (!allowed[existing.status].includes(req.status)) {
    throw new ApiError(400, `Cannot change ${existing.status} consultation to ${req.status}`)
  }
  consultations = consultations.map((c) =>
    c.consultationId === id
      ? { ...c, status: req.status }
      : c,
  )
  return { ...consultations.find((c) => c.consultationId === id)! }
}
async function updateTranscript(id: number, transcript: string): Promise<Consultation> {
  await delay()
  if (!consultations.some((c) => c.consultationId === id)) throw new ApiError(404, 'Consultation not found')
  consultations = consultations.map((c) => (c.consultationId === id ? { ...c, transcript } : c))
  return { ...consultations.find((c) => c.consultationId === id)! }
}
async function deleteConsultation(id: number): Promise<void> {
  await delay()
  if (!consultations.some((c) => c.consultationId === id)) throw new ApiError(404, 'Consultation not found')
  consultations = consultations.filter((c) => c.consultationId !== id)
}

// --- symptom records (mock AI output, clinician-reviewed) ------------------
async function getSymptomRecord(consultationId: number): Promise<SymptomRecord | null> {
  await delay()
  const record = symptoms.find((s) => s.consultationId === consultationId)
  return record ? { ...record, symptoms: record.symptoms.map((x) => ({ ...x })) } : null
}

// --- alerts (staff only; planned backend feature) --------------------------
async function listAlerts(): Promise<Alert[]> {
  await delay()
  return alerts.map((a) => ({ ...a })).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
async function updateAlertStatus(id: number, req: UpdateAlertStatusRequest): Promise<Alert> {
  await delay()
  if (!alerts.some((a) => a.alertId === id)) throw new ApiError(404, 'Alert not found')
  alerts = alerts.map((a) => (a.alertId === id ? { ...a, status: req.status } : a))
  return { ...alerts.find((a) => a.alertId === id)! }
}

export const mockApi = {
  auth: { login },
  users: { list: listUsers, create: createUser, update: updateUser, remove: deleteUser },
  doctors: { list: listDoctors, get: getDoctor, create: createDoctor, update: updateDoctor, remove: deleteDoctor },
  patients: { list: listPatients, get: getPatient, create: createPatient, update: updatePatient, remove: deletePatient },
  clinics: { list: listClinics, create: createClinic, update: updateClinic, remove: deleteClinic },
  consultations: {
    list: listConsultations,
    get: getConsultation,
    create: createConsultation,
    updateStatus: updateConsultationStatus,
    updateTranscript,
    remove: deleteConsultation,
  },
  symptoms: { getByConsultation: getSymptomRecord },
  alerts: { list: listAlerts, updateStatus: updateAlertStatus },
}
