/*
 * ConsultationDetailPage (spec §5.7) — the strongest demonstration page.
 *
 *  - Shows patient, doctor, clinic, scheduled time, status.
 *  - Status action + transcript editing: admin/doctor only.
 *  - Symptom result panel appears only when a transcript exists.
 *  - Patient sees a read-only view.
 *  - A modest "Video consultation is planned" placeholder — NOT a working call.
 *
 * The symptom panel shows clearly-labelled MOCK AI output; it is not a live
 * clinical extraction.
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Video, Sparkles } from 'lucide-react'
import { api, ApiError } from '../api'
import { useAuth } from '../auth/useAuth'
import { StatusBadge } from '../components/StatusBadge'
import { Panel, PrimaryButton, SecondaryButton, LoadingRow, ErrorRow } from '../components/ui'
import { SuccessMessage } from '../components/SuccessMessage'
import { selectClass } from '../components/formStyles'
import { formatDateTime } from '../lib/format'
import { clinicName, clinicianName, patientName } from '../lib/lookups'
import { consultationsBase } from '../lib/paths'
import type {
  Clinic,
  Consultation,
  ConsultationStatus,
  Doctor,
  Patient,
  SymptomRecord,
} from '../types/domain'

const NEXT_STATUSES: Record<ConsultationStatus, ConsultationStatus[]> = {
  SCHEDULED: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
}

export function ConsultationDetailPage() {
  const { id } = useParams()
  const consultationId = Number(id)
  const { user } = useAuth()
  const navigate = useNavigate()
  const isStaff = user?.role === 'ADMIN' || user?.role === 'DOCTOR'
  const base = user ? consultationsBase(user.role) : '/login'

  const [consultation, setConsultation] = useState<Consultation | null>(null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [symptoms, setSymptoms] = useState<SymptomRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [transcriptDraft, setTranscriptDraft] = useState('')
  const [savingTranscript, setSavingTranscript] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)
  const [extractingSymptoms, setExtractingSymptoms] = useState(false)

  async function load() {
    if (!user) return
    setLoading(true)
    try {
      const [c, pts, docs, clns] = await Promise.all([
        api.consultations.get(consultationId),
        isStaff ? api.patients.list() : Promise.resolve([]),
        api.doctors.list(),
        api.clinics.list(),
      ])
      setConsultation(c)
      setPatients(pts)
      setDoctors(docs)
      setClinics(clns)
      setTranscriptDraft(c.transcript ?? '')
      setSymptoms(isStaff && c.transcript ? await api.symptoms.getByConsultation(consultationId) : null)
      setError(null)
    } catch {
      setError('Could not load this consultation.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultationId])

  async function saveTranscript() {
    setSavingTranscript(true)
    setError(null)
    try {
      const updated = await api.consultations.updateTranscript(consultationId, transcriptDraft)
      setConsultation(updated)
      setSymptoms(updated.transcript ? await api.symptoms.getByConsultation(consultationId) : null)
      setSuccess('Transcript saved.')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not save transcript.')
    } finally {
      setSavingTranscript(false)
    }
  }

  async function changeStatus(status: ConsultationStatus) {
    if (!consultation) return
    setSavingStatus(true)
    setError(null)
    try {
      const updated = await api.consultations.updateStatus(consultationId, { status })
      setConsultation(updated)
      setSuccess(`Consultation status updated to ${status.toLowerCase()}.`)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not update status.')
    } finally {
      setSavingStatus(false)
    }
  }

  async function extractSymptoms() {
    setExtractingSymptoms(true)
    setError(null)
    try {
      setSymptoms(await api.symptoms.extract(consultationId))
      setSuccess('Mock symptom extraction created.')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not extract symptoms from this transcript.')
    } finally {
      setExtractingSymptoms(false)
    }
  }

  if (loading) return <LoadingRow />
  if (error && !consultation) {
    return (
      <div>
        <SecondaryButton type="button" onClick={() => navigate(base)}>
          <ArrowLeft size={16} aria-hidden />
          Back to consultations
        </SecondaryButton>
        <div className="mt-3"><ErrorRow message={error} /></div>
      </div>
    )
  }
  if (!consultation || !user) return <ErrorRow message="Consultation not found." />

  const nextStatuses = NEXT_STATUSES[consultation.status]
  const canEditTranscript = isStaff && ['IN_PROGRESS', 'COMPLETED'].includes(consultation.status)

  return (
    <div className="mx-auto max-w-3xl">
      <button
        type="button"
        onClick={() => navigate(base)}
        className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-accent-700"
      >
        <ArrowLeft size={16} aria-hidden />
        Back to consultations
      </button>

      {success && <SuccessMessage message={success} />}
      {error && <div className="mb-3"><ErrorRow message={error} /></div>}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold text-slate-800 sm:text-2xl">
          Consultation #{consultation.consultationId}
        </h2>
        <StatusBadge status={consultation.status} />
      </div>

      <div className="grid gap-4">
        <Panel title="Details">
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <Detail label="Patient" value={consultation.patientName ?? patientName(patients, consultation.patientId)} />
            <Detail label="Doctor" value={consultation.clinicianUsername ? `Dr ${consultation.clinicianUsername}` : clinicianName(doctors, consultation.clinicianId)} />
            <Detail label="Clinic" value={consultation.clinicName ?? clinicName(clinics, consultation.clinicId)} />
            <Detail label="Scheduled" value={formatDateTime(consultation.scheduledAt)} />
          </dl>

          {isStaff && nextStatuses.length > 0 && (
            <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
              <label htmlFor="status" className="text-sm font-medium text-slate-700">
                Update status
              </label>
              <select
                id="status"
                className={`${selectClass} max-w-[12rem]`}
                value={consultation.status}
                disabled={savingStatus}
                onChange={(e) => changeStatus(e.target.value as ConsultationStatus)}
              >
                <option value={consultation.status}>{consultation.status}</option>
                {nextStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}
        </Panel>

        {/* Transcript: staff can edit; patients do not see the transcript editor. */}
        {canEditTranscript ? (
          <Panel title="Transcript">
            <textarea
              className="min-h-32 w-full rounded-md border border-slate-300 p-3 text-sm outline-none focus:border-accent-500"
              placeholder="Enter or paste the consultation transcript…"
              value={transcriptDraft}
              onChange={(e) => setTranscriptDraft(e.target.value)}
            />
            <div className="mt-2 flex justify-end">
              <PrimaryButton
                type="button"
                onClick={saveTranscript}
                disabled={savingTranscript || transcriptDraft === (consultation.transcript ?? '')}
              >
                {savingTranscript ? 'Saving…' : 'Save transcript'}
              </PrimaryButton>
            </div>
          </Panel>
        ) : consultation.transcript ? (
          <Panel title="Consultation summary">
            <p className="whitespace-pre-wrap text-sm text-slate-700">{consultation.transcript}</p>
          </Panel>
        ) : null}

        {/* Symptom panel only when a transcript exists (spec §5.7). */}
        {consultation.transcript && (
          <Panel>
            <div className="mb-3 flex items-center gap-2">
              <Sparkles size={18} className="text-accent-600" aria-hidden />
              <h3 className="text-base font-semibold text-slate-800">AI symptom review</h3>
              <span className="rounded-md bg-warn-100 px-2 py-0.5 text-xs font-medium text-warn-700">
                Mock result
              </span>
            </div>
            {symptoms ? (
              <>
                <ul className="divide-y divide-slate-100">
                  {symptoms.symptoms.map((s, index) => (
                    <li key={`${s.name}-${index}`} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-slate-700">{s.name}</span>
                      <span className="flex items-center gap-3 text-slate-500">
                        <span>{s.assertion.toLowerCase()}</span>
                        <span className="tabular-nums">{Math.round(s.confidence * 100)}%</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-slate-400">
                  {symptoms.modelName} · {symptoms.promptVersion} — reviewed extraction, not a live
                  diagnosis.
                </p>
              </>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-500">No symptom record for this transcript yet.</p>
                {isStaff && (
                  <PrimaryButton type="button" onClick={extractSymptoms} disabled={extractingSymptoms}>
                    {extractingSymptoms ? 'Extracting…' : 'Run mock extraction'}
                  </PrimaryButton>
                )}
              </div>
            )}
          </Panel>
        )}

        {/* Video placeholder — not a working call (spec §5.7). */}
        <Panel>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-slate-100 text-slate-400">
              <Video size={20} aria-hidden />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-700">Video consultation is planned</p>
              <p className="text-xs text-slate-500">
                Secure video calling will be added in a later phase. No live camera or microphone
                is active.
              </p>
            </div>
            <SecondaryButton type="button" disabled title="Video calling is not available yet">
              Join call
            </SecondaryButton>
          </div>
        </Panel>
      </div>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-slate-800">{value}</dd>
    </div>
  )
}
