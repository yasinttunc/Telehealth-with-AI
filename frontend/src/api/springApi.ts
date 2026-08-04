import { http, toApiError } from './http'
import type {
  CreateClinicRequest,
  CreateConsultationRequest,
  CreateDoctorRequest,
  CreatePatientRequest,
  CreateUserRequest,
  LoginRequest,
  LoginResponse,
  UpdateAlertStatusRequest,
  UpdateClinicRequest,
  UpdateConsultationStatusRequest,
  UpdateDoctorRequest,
  UpdatePatientRequest,
  UpdateUserRequest,
} from './types'
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

async function request<T>(call: Promise<{ data: T }>): Promise<T> {
  try {
    return (await call).data
  } catch (error) {
    throw toApiError(error)
  }
}

function toAuthUser(response: LoginResponse): AuthUser {
  return {
    userId: response.userId,
    username: response.username,
    displayName: response.username,
    email: response.email,
    role: response.role,
  }
}

async function login(requestBody: LoginRequest): Promise<{ user: AuthUser; accessToken: string }> {
  const response = await request(http.post<LoginResponse>('/auth/login', requestBody))
  return { user: toAuthUser(response), accessToken: response.accessToken }
}

async function listSymptomRecords(consultationId: number): Promise<SymptomRecord | null> {
  const records = await request(http.get<SymptomRecord[]>(`/consultations/${consultationId}/symptom-records`))
  return records[0] ?? null
}

async function extractSymptoms(consultationId: number): Promise<SymptomRecord> {
  return request(http.post<SymptomRecord>(`/consultations/${consultationId}/symptom-records`))
}

export const springApi = {
  auth: { login },
  users: {
    list: () => request(http.get<AppUser[]>('/users')),
    create: (body: CreateUserRequest) => request(http.post<AppUser>('/users', body)),
    update: (id: number, body: UpdateUserRequest) => request(http.put<AppUser>(`/users/${id}`, body)),
    remove: (id: number) => request(http.delete<void>(`/users/${id}`)),
  },
  doctors: {
    list: () => request(http.get<Doctor[]>('/doctors')),
    get: (id: number) => request(http.get<Doctor>(`/doctors/${id}`)),
    create: (body: CreateDoctorRequest) => request(http.post<Doctor>('/doctors', body)),
    update: (id: number, body: UpdateDoctorRequest) => request(http.put<Doctor>(`/doctors/${id}`, body)),
    remove: (id: number) => request(http.delete<void>(`/doctors/${id}`)),
  },
  patients: {
    list: () => request(http.get<Patient[]>('/patients')),
    get: (id: number) => request(http.get<Patient>(`/patients/${id}`)),
    create: (body: CreatePatientRequest) => request(http.post<Patient>('/patients', body)),
    update: (id: number, body: UpdatePatientRequest) => request(http.put<Patient>(`/patients/${id}`, body)),
    remove: (id: number) => request(http.delete<void>(`/patients/${id}`)),
  },
  clinics: {
    list: () => request(http.get<Clinic[]>('/clinics')),
    create: (body: CreateClinicRequest) => request(http.post<Clinic>('/clinics', body)),
    update: (id: number, body: UpdateClinicRequest) => request(http.put<Clinic>(`/clinics/${id}`, body)),
    remove: (id: number) => request(http.delete<void>(`/clinics/${id}`)),
  },
  consultations: {
    list: () => request(http.get<Consultation[]>('/consultations')),
    mine: () => request(http.get<Consultation[]>('/consultations/mine')),
    get: (id: number) => request(http.get<Consultation>(`/consultations/${id}`)),
    create: (body: CreateConsultationRequest) => request(http.post<Consultation>('/consultations', body)),
    updateStatus: (id: number, body: UpdateConsultationStatusRequest) => request(http.put<Consultation>(`/consultations/${id}/status`, body)),
    updateTranscript: (id: number, transcript: string) => request(http.put<Consultation>(`/consultations/${id}/transcript`, { transcript })),
  },
  symptoms: { getByConsultation: listSymptomRecords, extract: extractSymptoms },
  alerts: {
    list: () => request(http.get<Alert[]>('/alerts')),
    updateStatus: (id: number, body: UpdateAlertStatusRequest) => request(http.put<Alert>(`/alerts/${id}/status`, body)),
  },
}
