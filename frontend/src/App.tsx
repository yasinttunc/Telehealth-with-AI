/*
 * App — route tree (spec §4). One AppShell layout, guarded by role.
 *
 * Shared pages (DoctorsPage, PatientsPage, ConsultationsPage,
 * ConsultationDetailPage, AlertsPage) are mounted under multiple role paths and
 * adapt their actions/data to the current role, rather than being duplicated.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { RequireRole } from './auth/RequireRole'
import { AppShell } from './components/AppShell'

import { LoginPage } from './pages/LoginPage'
import { ProfilePage } from './pages/ProfilePage'
import { ForbiddenPage } from './pages/ForbiddenPage'
import { NotFoundPage } from './pages/NotFoundPage'

import { DoctorsPage } from './pages/DoctorsPage'
import { PatientsPage } from './pages/PatientsPage'
import { ConsultationsPage } from './pages/ConsultationsPage'
import { ConsultationDetailPage } from './pages/ConsultationDetailPage'
import { AlertsPage } from './pages/AlertsPage'

import { AdminDashboard } from './pages/admin/AdminDashboard'
import { UsersPage } from './pages/admin/UsersPage'
import { ClinicsPage } from './pages/admin/ClinicsPage'
import { DoctorDashboard } from './pages/doctor/DoctorDashboard'
import { PatientDashboard } from './pages/patient/PatientDashboard'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/403" element={<ForbiddenPage />} />

          {/* Shared authenticated routes (any signed-in role). */}
          <Route element={<RequireRole allow={['ADMIN', 'DOCTOR', 'PATIENT']} />}>
            <Route element={<AppShell />}>
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          {/* ADMIN */}
          <Route element={<RequireRole allow={['ADMIN']} />}>
            <Route element={<AppShell />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<UsersPage />} />
              <Route path="/admin/doctors" element={<DoctorsPage />} />
              <Route path="/admin/patients" element={<PatientsPage />} />
              <Route path="/admin/clinics" element={<ClinicsPage />} />
              <Route path="/admin/consultations" element={<ConsultationsPage />} />
              <Route path="/admin/consultations/:id" element={<ConsultationDetailPage />} />
              <Route path="/admin/alerts" element={<AlertsPage />} />
            </Route>
          </Route>

          {/* DOCTOR */}
          <Route element={<RequireRole allow={['DOCTOR']} />}>
            <Route element={<AppShell />}>
              <Route path="/doctor" element={<DoctorDashboard />} />
              <Route path="/doctor/patients" element={<PatientsPage />} />
              <Route path="/doctor/consultations" element={<ConsultationsPage />} />
              <Route path="/doctor/consultations/:id" element={<ConsultationDetailPage />} />
              <Route path="/doctor/alerts" element={<AlertsPage />} />
              <Route path="/doctors" element={<DoctorsPage />} />
            </Route>
          </Route>

          {/* PATIENT */}
          <Route element={<RequireRole allow={['PATIENT']} />}>
            <Route element={<AppShell />}>
              <Route path="/patient" element={<PatientDashboard />} />
              <Route path="/patient/consultations" element={<ConsultationsPage />} />
              <Route path="/patient/consultations/:id" element={<ConsultationDetailPage />} />
              <Route path="/patient/doctors" element={<DoctorsPage />} />
            </Route>
          </Route>

          {/* Default + not found */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
