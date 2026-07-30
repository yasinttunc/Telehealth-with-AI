/*
 * Request payload shapes for the API layer.
 *
 * These mirror the real Spring DTOs (dto/request/*) so that when mockApi is
 * later swapped for a real springApi implementation, page code and form state
 * do not change. Response shapes are the domain types in ../types/domain.
 */

import type { AlertStatus, ConsultationStatus, Role } from '../types/domain'

export interface LoginRequest {
  username: string
  password: string
}

export interface CreateUserRequest {
  username: string
  email: string
  role: Role
  password: string
}

export interface UpdateUserRequest {
  username: string
  email: string
  role: Role
  /** Blank/omitted leaves the existing password unchanged (spec / roadmap Task 2). */
  password?: string
  enabled: boolean
}

export interface CreateDoctorRequest {
  firstName: string
  lastName: string
  specialty: string
  availableTimes: string[]
}

export type UpdateDoctorRequest = CreateDoctorRequest

export interface CreatePatientRequest {
  firstName: string
  lastName: string
  nhsNumber: string
  dateOfBirth: string
}

export type UpdatePatientRequest = CreatePatientRequest

export interface CreateClinicRequest {
  name: string
  address: string
}

export type UpdateClinicRequest = CreateClinicRequest

export interface CreateConsultationRequest {
  patientId: number
  clinicianId: number
  clinicId: number
  scheduledAt: string
  status: ConsultationStatus
}

export type UpdateConsultationRequest = CreateConsultationRequest

/** Filters the caller applies; mockApi also enforces ownership by role. */
export interface ConsultationQuery {
  /** When set, restrict to a patient's own consultations. */
  patientId?: number
  /** When set, restrict to a clinician's (AppUser) consultations. */
  clinicianId?: number
}

export interface UpdateAlertStatusRequest {
  status: AlertStatus
}

/** Simple error type thrown by mockApi so pages can show a message. */
export class ApiError extends Error {
  status: number
  fieldErrors?: Record<string, string>
  constructor(status: number, message: string, fieldErrors?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}
