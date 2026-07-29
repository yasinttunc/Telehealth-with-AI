# Telehealth With AI — Frontend Specification

Status: design/architecture spec (no full application code). Target implementer: an AI engineer or developer building the React SPA against the Spring Boot API.

Implementation rule: each API area in this document has a readiness label in §2. Do not build a real integration against a **Planned** or **Blocked** area. Use a clearly labelled local mock only where the relevant phase explicitly permits it.

Guiding principle: the frontend is a **thin, authenticated clinical client**. It renders data, drives workflows, and calls APIs. It never owns business rules or authorization — Spring Boot enforces RBAC server-side; frontend guards are UX only.

---

## 1. Tech Stack

| Concern | Choice | Why |
|---|---|---|
| Framework/build | **React + Vite + TypeScript** | Fast dev/build for an authenticated SPA; no SSR/SEO need, so Next.js is explicitly rejected. TS gives typed API contracts. |
| Routing | **React Router v6 (data router)** | Nested layouts, loaders/actions optional, clean role-guard route composition. |
| Server state | **TanStack Query** | Caching, dedupe, background refetch, and precise invalidation — ideal for a REST/CRUD clinical app. Replaces hand-rolled fetch state. |
| Forms + validation | **React Hook Form + Zod** | RHF is performant/uncontrolled; Zod gives one schema reused for validation and TS types. |
| Styling | **Tailwind CSS** | Utility-first, compact, easy to enforce a restrained clinical design system via tokens. |
| Components | **shadcn/ui on Radix primitives** | Accessible, unstyled-by-default primitives (dialog, dropdown, tabs) you own in-repo and theme with Tailwind. |
| Charts | **Recharts** | Simple declarative charts for alert trends and dashboard counts. |
| Realtime media | **LiveKit React SDK (`@livekit/components-react` + `livekit-client`)** | Prebuilt room/track components for the consultation video/audio screen. |
| Icons | **lucide-react** | Clean, consistent line icons that match a calm clinical tone. |
| HTTP | **Typed Axios wrapper** | Single client with interceptors for JWT attach + centralized error mapping (401/403/404/409). |
| Dates | **date-fns + date-fns-tz** | Lightweight formatting plus explicit clinic-timezone conversion for consultations and alert windows. |
| Toasts | **sonner** (or shadcn `useToast`) | Non-blocking feedback for mutations and conflicts. |

State split: **TanStack Query = server state**; a tiny **Zustand** (or React Context) store = auth/session + UI (current user, token-in-memory, sidebar). Do not put server data in global state.

---

## 2. Backend API Readiness and Required Contracts

**Ready** means that the resource controller and its DTOs exist. A browser integration remains blocked until the JWT/CORS foundation is complete; until then, develop the ready resource screens against a local mock adapter or same-origin development setup. Everything else is a backend deliverable, not a frontend workaround.

| Area | Current status | Frontend rule | Backend prerequisite |
|---|---|---|---|
| Users | **Ready** | Integrate with `/api/users`; ADMIN only. | Keep duplicate username/email errors in the shared error format. |
| Doctors | **Ready** | Integrate with `/api/doctors`; read for authenticated roles, mutate for ADMIN. | Keep method-level RBAC. |
| Patients | **Ready** | Integrate with `/api/patients`; DOCTOR/ADMIN only. | Keep NHS duplicate validation and ADMIN-only delete. |
| Login/JWT/refresh/current user/CORS | **Blocked** | Do not build bearer-token integration yet. A temporary form-login demo is separate from this SPA contract. | Implement `/api/auth/login`, `/api/auth/refresh`, and `/api/auth/me`; add JWT filter/security configuration and allow only the configured Vite origin in CORS. |
| Patient self-service | **Blocked** | Do not show patient consultation/history routes as real data. | Link a PATIENT `AppUser` to exactly one `Patient` profile and enforce ownership server-side. |
| Clinics | **Planned** | Mock only in UI development. | Implement CRUD and make consultation/alert clinic references a real `Long` foreign key. |
| Consultations | **Planned** | Mock only after the clinic and patient-user links are settled. | CRUD, scoped queries, ownership checks, status model, and timezone policy. |
| Symptom records and alerts | **Planned** | Mocked demo data is allowed and must be visibly labelled. | CRUD/query APIs plus authorization and audit rules. |
| AI extraction | **Planned** | Use a local mock adapter in MVP. | Spring Boot proxy to FastAPI with authorization, request validation, and timeout/error mapping. |
| LiveKit room | **Planned (V2)** | Do not expose room controls as active until the token endpoint exists. | Backend-issued, short-lived room tokens after consultation membership verification. |

### Non-negotiable backend contracts

- **Authentication:** `POST /api/auth/login` returns `AuthResponse` with `accessToken`, `tokenType`, `userId`, `username`, `email`, and `role`. `GET /api/auth/me` returns the current user without a password.
- **Browser transport:** during local development, use a Vite proxy to Spring Boot or a narrowly configured Spring CORS policy. Production allows only the deployed frontend origin, allowed methods/headers are explicit, and credentials are enabled only for the refresh-cookie flow.
- **Patient ownership:** add a unique foreign key such as `patient.app_user_id -> app_user.user_id`. A PATIENT role may retrieve only its linked patient profile and consultations. The frontend must never send a user ID to prove ownership.
- **Clinic consistency:** change `consultation.clinic_id` and `alert.clinic_id` to `BIGINT` foreign keys referencing `clinic.clinic_id`; represent them as `Long` in Java and `number` in TypeScript.
- **Scheduling:** store a scheduled consultation as `Instant` or `OffsetDateTime`, not an unzoned `LocalDateTime`. The API returns ISO-8601 timestamps; the browser formats them in the viewer's locale while retaining the clinic timezone as display context.
- **Consultation state:** add a server-owned enum such as `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, and `CANCELLED`. Do not derive state only from nullable timestamps in the UI.
- **Errors:** the current `ErrorResponse` exposes `timestamp`, `status`, `message`, and `path`; validation errors are currently a comma-separated `message`. Before the form-heavy frontend is integrated, extend it with an optional `fieldErrors: { field: message }` map. The frontend must support both the current message-only response and the future map during migration.
- **Audit/privacy:** NHS reveal events, consultation access, status changes, and AI extraction requests are server-side audit events. React masking is presentation only, never a security control.

---

## 3. Information Architecture

Route map. `RequireAuth` wraps all protected routes; `RequireRole` gates role-specific ones. `/` redirects to the role's dashboard.

```
PUBLIC
  /login                         Login
  /register                      Register (only if self-registration enabled; else hidden)
  /403                           Forbidden (RBAC denied)
  /404                           Not found (catch-all)

PROTECTED (RequireAuth)
  /                              → redirect to role dashboard

  ADMIN (RequireRole ADMIN)
    /admin                       Admin dashboard
    /admin/users                 User management (list)
    /admin/users/:id             User detail/edit
    /admin/doctors               Doctor list (manage)
    /admin/doctors/:id           Doctor detail/edit
    /admin/clinics               Clinics list
    /admin/clinics/:id           Clinic detail
    /admin/alerts                Alerts dashboard
    /admin/alerts/:id            Alert detail

  DOCTOR (RequireRole DOCTOR)
    /doctor                      Doctor dashboard
    /patients                    Patients list          (DOCTOR, ADMIN)
    /patients/new                Create patient
    /patients/:id                Patient detail
    /patients/:id/edit           Edit patient
    /consultations               Consultations list
    /consultations/new           Create consultation
    /consultations/:id           Consultation detail
    /consultations/:id/room      Live consultation room (LiveKit)
    /doctor/alerts               Alerts dashboard        (DOCTOR, ADMIN)
    /doctor/alerts/:id           Alert detail

  PATIENT (RequireRole PATIENT)
    /patient                     Patient dashboard
    /patient/doctors             Browse doctors
    /patient/clinics             Browse clinics
    /patient/consultations       Own consultation history
    /patient/consultations/:id   Own consultation detail (read-only)

  SHARED (any authenticated role)
    /profile                     Profile / settings
    /doctors                     Doctor directory (read; roles differ in actions)
    /doctors/:id                 Doctor detail (read)
```

Notes:
- Patients/Consultations/Alerts are shared concepts but namespaced per role for clarity of nav and guards. A shared page component can back both (e.g. `AlertsPage` mounted at `/admin/alerts` and `/doctor/alerts`).
- Any RBAC-denied navigation (client guard) routes to `/403`; a server `403` response also routes there.
- The first release renders only routes backed by **Ready** resource APIs. All planned routes are feature-flagged and omitted from navigation until their backend readiness criteria are met.

---

## 4. Role-Based Navigation

Layout = fixed left **sidebar** (collapsible on narrow screens) + slim **topbar** (global search, alert bell, user menu). Dashboard-first, compact, no marketing chrome.

**ADMIN sidebar**
```
Dashboard
Users
Doctors
Clinics
Patients
Consultations
Alerts            ● (open count badge)
—
Profile
```

**DOCTOR sidebar**
```
Dashboard
Patients
Consultations
  + New consultation
Doctors (directory)
Alerts            ● (open count badge)
—
Profile
```

**PATIENT sidebar**
```
Dashboard
My consultations
Find a doctor
Clinics
—
Profile
```

Topbar (all roles): global search is introduced only after its backed endpoint and access policy exist. The alert bell is ADMIN/DOCTOR only. The current-user chip shows the role badge and opens Profile/Logout.

---

## 5. Dashboards

### ADMIN dashboard `/admin`
Counts row + open alerts + recent consultations + management shortcuts.

```
┌──────────────────────────────────────────────────────────────┐
│ Users: 42   Doctors: 12   Patients: 318   Clinics: 6          │  KPI tiles
├───────────────────────────────┬──────────────────────────────┤
│ Open Alerts (5)               │ Recent Consultations          │
│ • Flu spike — Clinic A  OPEN  │ #1042 Doe, J.  Dr Smith  10:20│
│ • Cough — Clinic C     OPEN   │ #1041 Roe, A.  Dr Lee    09:50│
│ [View all alerts →]           │ [View all →]                  │
├───────────────────────────────┴──────────────────────────────┤
│ Manage: [Users] [Doctors] [Clinics] [Patients]                │  shortcut buttons
└──────────────────────────────────────────────────────────────┘
```
Data: user, doctor, and patient resource controllers already exist, but browser integration waits for the JWT/CORS foundation in §2. Clinic, alert, and consultation data is planned; until those APIs exist, render those sections as clearly labelled mock data or omit them from the first release.

### DOCTOR dashboard `/doctor`
```
┌──────────────────────────────────────────────────────────────┐
│ Today's Consultations (3)                    [+ New]          │
│ 10:20  Doe, John     Clinic A   ▸ Open / Start room           │
│ 11:00  Roe, Alice    Clinic A   ▸ Open                        │
├───────────────────────────────┬──────────────────────────────┤
│ Patient search                │ Open Alerts (2)               │
│ [ search NHS / name ______ ]  │ • Flu spike — Clinic A  OPEN  │
│ recent: Doe, Roe, …           │ [View all →]                  │
├───────────────────────────────┴──────────────────────────────┤
│ Recent symptom extractions                                    │
│ #1042 → cough, fever (gpt-x, v3)  2m ago                       │
└──────────────────────────────────────────────────────────────┘
```
Data: **planned** `GET /api/consultations/mine` (filter today), `GET /api/alerts?status=OPEN`, patient search, and recent symptom records. The server derives the clinician from the JWT; the browser never sends `{me}` as an authority claim.

### PATIENT dashboard `/patient`
```
┌──────────────────────────────────────────────────────────────┐
│ Upcoming consultations                                        │
│ Fri 10:20  Dr Smith  Clinic A   ▸ Details                     │
├───────────────────────────────┬──────────────────────────────┤
│ Find a doctor                 │ Clinics                       │
│ [ search specialty ______ ]   │ Clinic A — 12 High St         │
│ Cardiology, GP, Derm…         │ Clinic C — 4 Park Rd          │
├───────────────────────────────┴──────────────────────────────┤
│ Consultation history                                          │
│ 12 Jun  Dr Lee   completed   ▸ View                           │
└──────────────────────────────────────────────────────────────┘
```
Data: **planned** `GET /api/consultations/mine`, `GET /api/doctors`, and `GET /api/clinics`. The server derives the patient identity from the authenticated linked account. Patient sees **no alerts**.

---

## 6. Screen-By-Screen Specification

Format per screen: Purpose / Roles / Endpoints / Components / Layout / Primary actions / Empty / Loading / Error / RBAC visibility. Skeletons are the default loading state; inline error banners + retry the default error state.

### Login
- **Purpose**: authenticate, receive JWT, redirect to role dashboard.
- **Roles**: public.
- **Endpoints**: **Planned** `POST /api/auth/login`. Build the screen and form schema in the first frontend phase, but connect it only after the JWT backend contract in §2 exists.
- **Components**: centered `Card`, `Form` (username/email + password), submit `Button`, error alert.
- **Layout**: single centered card on plain background; product name, no hero.
- **Primary**: Sign in. **Secondary**: link to Register (if enabled).
- **Empty**: n/a. **Loading**: button spinner, inputs disabled. **Error**: 401 → "Invalid credentials" inline; network → retry banner.
- **RBAC**: none; already-authed users visiting `/login` redirect to dashboard.

### Register (only if enabled)
- **Purpose**: self-service account creation (likely PATIENT only; ADMIN/DOCTOR created by admin).
- **Roles**: public (feature-flagged).
- **Endpoints**: **Planned** `POST /api/auth/register`. Keep registration disabled until the backend limits self-registration to PATIENT accounts and creates the linked patient profile safely.
- **Components**: Form (username, email, password, confirm), Zod validation.
- **Error**: 409 → "Username/email already exists" toast + field error. 400 → field errors.
- **RBAC**: hide entirely when self-registration is off.

### Admin dashboard — see §5.
### Doctor dashboard — see §5.
### Patient dashboard — see §5.

### Patients list `/patients`
- **Purpose**: find/manage patients.
- **Roles**: DOCTOR, ADMIN.
- **Endpoints**: `GET /api/patients`; search by NHS → `GET /api/patients/nhs/{nhsNumber}`.
- **Components**: `DataTable` (sort/filter/paginate), search input, `+ New patient`, row actions.
- **Columns**: Name, **NHS (masked)**, DOB/age, created. Row → detail.
- **Primary**: Create patient, open detail. **Empty**: "No patients yet — Create the first." **Loading**: table skeleton. **Error**: banner + retry.
- **RBAC**: create/edit DOCTOR+ADMIN; **delete ADMIN-only** (hide button for DOCTOR).

### Patient detail `/patients/:id`
- **Purpose**: view one patient + their consultations.
- **Roles**: DOCTOR, ADMIN.
- **Endpoints**: `GET /api/patients/{id}` is ready. Consultation history is **planned** and must be returned through a server-authorized consultation endpoint; it must not be exposed to any arbitrary caller who knows a patient ID.
- **Components**: header (name, masked NHS, DOB), tabs [Overview | Consultations], `Edit`/`Delete` buttons, consultations mini-table with `+ New consultation`. Do not add an NHS reveal control until the audited backend capability exists.
- **Empty**: "No consultations for this patient." **Error**: 404 → not-found panel with back link.
- **RBAC**: delete ADMIN-only. NHS values are masked in the UI; a real reveal action is available only after the backend supplies an audited access endpoint and applies authorization.

### Doctor list `/doctors` (directory) and `/admin/doctors` (manage)
- **Purpose**: browse (all roles) / manage (admin).
- **Roles**: read = all; mutate = ADMIN.
- **Endpoints**: `GET /api/doctors`, `GET /api/doctors/specialty/{specialty}`.
- **Components**: DataTable or card-grid, specialty filter, `+ New doctor` (admin).
- **RBAC**: create/edit/delete visible to ADMIN only.

### Doctor detail `/doctors/:id`
- **Endpoints**: `GET /api/doctors/{id}`.
- **Components**: profile card (name, specialty, availability), admin `Edit`/`Delete`.
- **Empty/Error**: 404 not-found panel. **RBAC**: mutations ADMIN-only.

### Clinics list/detail `/admin/clinics`, `/patient/clinics`
- **Roles**: read = all; mutate = ADMIN.
- **Endpoints**: `CRUD /api/clinics` (mockable until backend exists).
- **Components**: list (name, address), detail (associated doctor/patient), admin form.
- **RBAC**: create/update/delete ADMIN-only; patients read-only.

### Consultations list `/consultations`
- **Purpose**: list/scope consultations.
- **Roles**: DOCTOR (own records only), ADMIN (all).
- **Endpoints**: **Planned** `GET /api/consultations/mine` for doctors and patients, plus `GET /api/consultations` for ADMIN. Never use a caller-supplied user ID to decide whose consultations are returned.
- **Components**: DataTable (time, patient, clinician, clinic, status), status filter, date filter, `+ New`.
- **RBAC**: doctors see their own; patients use `/patient/consultations` (read-only history).

### Consultation detail `/consultations/:id` — **core screen**
- **Purpose**: the workspace for one consultation: metadata, transcript, AI symptoms, room entry.
- **Roles**: DOCTOR/ADMIN full; PATIENT read-only own.
- **Endpoints**: `GET /api/consultations/{id}`, `GET /api/symptom-records/consultation/{id}`, `PATCH /api/consultations/{id}/transcript`, `POST /api/symptom-records`.
- **Layout**:
```
┌ Consultation #1042 ─────────────── [Start room] [Mark complete] ┐
│ Patient: Doe, John (NHS ••• 4821)  Clinician: Dr Smith          │
│ Clinic: A   Time: Fri 10:20   Status: IN_PROGRESS               │
├───────────────────────────────┬─────────────────────────────────┤
│ Transcript                    │ AI Symptom Review                │
│ [ editable textarea ........ ]│ [Run AI extraction]              │
│                               │ cough    severity: moderate  ✎   │
│ [Save transcript]             │ fever    severity: high      ✎   │
│                               │ [Save symptom record]            │
└───────────────────────────────┴─────────────────────────────────┘
```
- **Primary**: Start room, Save transcript, Run AI extraction, Save symptom record, Mark complete.
- **Empty**: no transcript → placeholder prompt; no symptom records → "Run AI extraction to populate."
- **Loading**: section-level skeletons; extraction shows inline progress. **Error**: 404 not-found; extraction failure → retry. A mocked response is allowed only in the mock adapter, visibly labelled, and must never be represented as a real clinical result.
- **RBAC**: PATIENT sees read-only transcript summary + own symptoms, no edit/extract/room-start controls.

### Live consultation room `/consultations/:id/room` — **LiveKit, depth**
- **Purpose**: WebRTC video/audio between doctor and patient; optional live transcript.
- **Roles**: DOCTOR + the consultation's PATIENT (backend verifies join).
- **Endpoints**: `POST /api/livekit/rooms/{consultationId}/token` (backend verifies JWT + join rights, returns room token; **secrets never reach browser**). Then connect via LiveKit SDK URL.
- **Components**: `LiveKitRoom` provider, `VideoConference` or custom `GridLayout` + `ControlBar` (mic/cam/screen/leave), `ParticipantTile`, connection-state banner, side panel for live transcript (V2).
- **Layout**:
```
┌ Room — #1042 ──────────────────────────── [Leave] ┐
│ ┌───────────────┐  ┌───────────────┐              │
│ │ Doctor (self) │  │ Patient       │  live        │
│ └───────────────┘  └───────────────┘  transcript  │
│ [🎤][📷][🖥 share]              connected ● │ panel │
└────────────────────────────────────────────────────┘
```
- **Flow**: on mount → request token → `connect()` → render tracks. On leave → `disconnect()`, return to consultation detail.
- **Empty/Loading**: "Connecting to room…" with spinner; permissions prompt for mic/cam. **Error**: token 403 → "You cannot join this consultation" → `/403`; media permission denied → guidance card.
- **RBAC**: only participants issued a token by backend; frontend never mints tokens.

### Transcript editor
- Part of consultation detail (not a separate route in MVP). Autosave-on-blur optional; explicit **Save transcript** button issues `PATCH /api/consultations/{id}/transcript` and invalidates `["consultation", id]`.

### AI symptom review panel — **depth**
- **Purpose**: turn transcript → structured symptoms via FastAPI AI, let doctor review/edit before saving.
- **Roles**: DOCTOR/ADMIN.
- **Flow**: [Run AI extraction] → call AI service (or backend proxy) with transcript → returns `{ symptoms: [{name, severity, confidence}], model_name, prompt_version }` → render editable list → doctor edits/removes → **Save symptom record** → `POST /api/symptom-records` → invalidate `["symptom-records", consultationId]` + `["consultation", id]`.
- **MVP fallback**: no live audio; manual transcript textarea; extraction returns a clearly labelled **mocked** response from a local adapter until the FastAPI integration is wired. Never send clinical transcripts to an unprotected demo endpoint.
- **States**: extraction loading (inline), empty (no symptoms found → allow manual add), error (retry + keep transcript).

### Symptom records `/consultations/:id` (tab) / detail
- **Endpoints**: `GET /api/symptom-records/consultation/{id}`, `GET /api/symptom-records/{id}`.
- **Components**: read view showing symptoms, `model_name`, `prompt_version`, `created_at`. Immutable audit-style display; new extraction creates a new record rather than overwriting.

### Alerts dashboard `/admin/alerts`, `/doctor/alerts` — **depth**
- **Purpose**: monitor symptom spikes / outbreak warnings.
- **Roles**: ADMIN, DOCTOR. **PATIENT: forbidden.**
- **Endpoints**: `GET /api/alerts`, `GET /api/alerts/clinic/{id}`, `PATCH /api/alerts/{id}/status`.
- **Components**: filter bar (status, clinic, symptom), DataTable, status `Badge`, trend chart (V2, Recharts), bulk status actions (later).
- **Layout**:
```
┌ Alerts ───────────────────────────────────────────────┐
│ Status:[Open▾] Clinic:[All▾] Symptom:[__] [Search]     │
├────────────────────────────────────────────────────────┤
│ Symptom   Clinic  Observed/Baseline  Score  Status     │
│ Flu       A       48 / 12.0          4.0    OPEN   ▸    │
│ Cough     C       20 / 15.0          1.3    ACK    ▸    │
└────────────────────────────────────────────────────────┘
```
- **Empty**: "No alerts match filters." **Loading**: table skeleton. **Error**: banner + retry.
- **RBAC**: entire section hidden from PATIENT nav and guarded → `/403`.

### Alert detail `/…/alerts/:id`
- **Endpoints**: `GET /api/alerts/{id}`, `PATCH /api/alerts/{id}/status`.
- **Components**: header (symptom, clinic, window), observed vs baseline comparison (numbers + small bar/line chart), score vs threshold, status control (OPEN→ACKNOWLEDGED→DISMISSED/RESOLVED).
- **Layout**:
```
┌ Alert #77 — Flu spike, Clinic A ──────────────┐
│ Window: 01 Jul 00:00 → 07 Jul 00:00           │
│ Observed: 48   Baseline: 12.0   Score: 4.0    │
│ Threshold: 2.0   → EXCEEDED                    │
│ Status: [ OPEN ▾ ]   [Update status]          │
│ ▁▂▅█ observed vs ▁▁▂▂ baseline (chart)        │
└───────────────────────────────────────────────┘
```
- **Action**: change status → optimistic update → invalidate `["alerts"]` + `["alert", id]`; 409 → conflict toast.

### User management `/admin/users`
- **Roles**: ADMIN only.
- **Endpoints**: `GET/POST/PUT/DELETE /api/users`, lookups by username/email.
- **Components**: DataTable (username, email, role badge, created), create/edit modal (role select), delete confirm.
- **Error**: 409 duplicate username/email → toast + field error. **RBAC**: entire route ADMIN-only.

### Profile / settings `/profile`
- **Roles**: all authenticated.
- **Endpoints**: **Planned** `GET /api/auth/me` and `PUT /api/users/{id}` with server-side self-update restrictions. Do not infer the current user from a route parameter or allow role changes from the profile form.
- **Components**: read profile card, change-password form (if supported), theme toggle (later).
- **RBAC**: user edits only own allowed fields; role is read-only here.

---

## 7. Consultation Workflow (step by step)

Doctor happy path:
1. **Select/create patient** — search patients (`GET /api/patients`, NHS lookup) or `POST /api/patients`.
2. **Create consultation** — `POST /api/consultations` (patient, clinician=self, clinic, time).
3. **Open consultation detail** — `/consultations/:id`.
4. **Start live room** — click Start room → route to `/consultations/:id/room`.
5. **Request LiveKit token** — `POST /api/livekit/rooms/{consultationId}/token` (backend verifies join rights).
6. **Join room** — LiveKit SDK `connect()` with returned token; render tracks.
7. **Transcript** — appears live (V2 via FastAPI/Deepgram) **or** typed into the transcript textarea (MVP).
8. **Review transcript** — edit, then Save (`PATCH /api/consultations/{id}/transcript`).
9. **Trigger AI extraction** — Run AI extraction → FastAPI (or backend proxy) returns structured symptoms.
10. **Review symptoms** — doctor edits/removes/adds in the review panel.
11. **Save symptom record** — `POST /api/symptom-records` (consultationId, symptoms, model_name, prompt_version).
12. **Mark complete** — set consultation status/`ended_at` (via consultation update/PATCH).

**MVP fallback (no media/AI yet)**:
- No live audio; hide/disable Start room or show "Room available in V2".
- Manual transcript textarea is the input.
- AI extraction returns a **mocked** symptom payload from the local mock adapter (clearly labelled) so steps 9–12 are demoable without claiming a clinical AI result.

---

## 8. Alert Review Workflow

1. Admin/Doctor opens **Alerts** dashboard.
2. **Filter** by status / clinic / symptom (client filters over `GET /api/alerts`, or server params like `?status=OPEN&clinicId=…`).
3. Open **alert detail**.
4. Review **observed vs baseline** count, **score vs threshold**.
5. **Change status**: OPEN → ACKNOWLEDGED → DISMISSED / RESOLVED via `PATCH /api/alerts/{id}/status`.
6. On success, **list refreshes** (invalidate `["alerts"]`, `["alert", id]`); optimistic badge update with rollback on error.

---

## 9. Auth, JWT, and Role Handling

**Prerequisite:** this section is the target JWT design. The current Spring Boot application uses form login and HTTP Basic, so no React bearer-token integration is permitted until the endpoints and JWT filter in §2 are implemented.

**MVP**
- Store access token **in memory** (Zustand/Context). Attach via Axios request interceptor: `Authorization: Bearer <token>`.
- Do not persist access tokens in `localStorage` or `sessionStorage`, including in the clinical demo. A reload may require sign-in until the refresh-cookie flow exists.
- On hard refresh with in-memory token, user re-logs in unless a refresh flow exists.
- Use `role` from the login response and verify it with `/api/auth/me` on application bootstrap. Never trust client-side role data for real authorization.

**Better (V1)**
- Short-lived access token (in memory) + **refresh token in httpOnly, Secure, SameSite cookie**; Spring Boot owns `POST /api/auth/refresh`.
- Response interceptor: on `401`, attempt one silent refresh → retry original request → else logout.

**UI behavior by status (centralized in Axios response interceptor)**
- `401` → clear auth, redirect `/login`.
- `403` → route to `/403` permission screen (or inline "no access").
- `400` → surface field validation errors (from `{message}` / field map) into the form.
- `404` → not-found panel / `/404`.
- `409` → duplicate/conflict **toast** (e.g. username/email, alert status race).

Route guards:
- `RequireAuth` — redirect to `/login` if no session.
- `RequireRole(roles[])` — redirect to `/403` if role not allowed. **Guards are UX only.**

---

## 10. Data Fetching Strategy (TanStack Query)

**Query keys**
```
["patients"]                          list
["patient", id]                       detail
["patients","nhs", nhsNumber]         lookup
["doctors"] / ["doctor", id]
["doctors","specialty", specialty]
["clinics"] / ["clinic", id]
["consultations"]                     (+ scoped variants below)
["consultations","mine"]
["consultation", id]
["symptom-records","consultation", consultationId]
["symptom-record", id]
["alerts"] / ["alert", id]
["alerts","clinic", clinicId]
["users"] / ["user", id]
```

**Invalidation on mutation**
- create/update/delete **patient** → invalidate `["patients"]` (+ `["patient", id]` on update).
- create/update/delete **doctor** → `["doctors"]` (+ `["doctor", id]`).
- create/update/delete **clinic** → `["clinics"]` (+ `["clinic", id]`).
- create/update/delete **user** → `["users"]` (+ `["user", id]`).
- create **consultation** → `["consultations"]` + scoped clinician/patient lists.
- **PATCH transcript** → `["consultation", id]`.
- **save symptom record** → `["symptom-records","consultation", consultationId]` + `["consultation", id]`.
- **PATCH alert status** → `["alerts"]` + `["alert", id]` (optimistic, rollback on error).

Defaults: `staleTime` ~30s for lists, `retry` off for 4xx, background refetch on window focus for alerts/consultations dashboards. On logout, call `queryClient.clear()` before navigating away so cached clinical data is not displayed to the next user.

---

## 11. Design System

Direction: calm, trustworthy, compact, data-first, accessible. No gradients, no hero, no oversized cards on operational screens.

**Color palette** (light-first; dark mode later)
```
Surface/base:   #FFFFFF bg, #F8FAFC subtle, #FFFFFF cards, #E2E8F0 borders
Text:           #0F172A primary, #475569 secondary, #94A3B8 muted
Primary/brand:  #0E7490 (teal-cyan 700) — trustworthy clinical, actions/links
Focus ring:     #0891B2 (2px, visible)
Semantic:
  success       #15803D
  warning       #B45309
  danger        #B91C1C
  info          #1D4ED8
Alert status:
  OPEN          red/danger  (#B91C1C on #FEE2E2)
  ACKNOWLEDGED  amber       (#B45309 on #FEF3C7)
  DISMISSED     slate/muted (#475569 on #F1F5F9)
  RESOLVED      green       (#15803D on #DCFCE7)
Symptom severity:
  mild #16A34A · moderate #D97706 · high/severe #DC2626
```
All status/severity colors pair with **text/icon**, never color alone.

**Typography**: system UI stack / Inter. Scale — 12 (meta), 14 (body/table default), 16 (base), 18/20 (section), 24 (page title). Weights 400/500/600. Tabular numerals for counts/scores.

**Spacing**: 4px base scale (4/8/12/16/24/32). Dense operational layouts use 8–12px paddings.

**Table density**: compact rows (~40px), 14px text, sticky header, zebra optional, right-aligned numerics, hover highlight, pagination + column sort.

**Badges**: pill, 12px, semantic bg/text pairs (roles, alert status, consultation status, severity).

**Buttons**: primary (brand solid), secondary (outline), ghost (toolbar), destructive (danger). Sizes sm/md. Loading = spinner + disabled.

**Form states**: label above input; helper text; error text in danger with icon; disabled muted; required marker; inline Zod messages.

**Modals**: Radix Dialog, centered, focus-trapped, ESC/overlay close (except destructive confirms which require explicit action).

**Toasts**: bottom-right, auto-dismiss ~4s, semantic variants; conflicts (409) and network errors persist until dismissed.

**Responsive**: sidebar collapses to icon rail < 1024px, drawer < 768px. Tables → horizontal scroll or stacked card rows on mobile. LiveKit room switches to stacked participant tiles on small screens.

---

## 12. Accessibility and Privacy

- WCAG-minded **contrast** ≥ 4.5:1 for text; verify status pairs.
- **Keyboard**: all actions reachable; tables and menus arrow-navigable; modals focus-trapped.
- **Visible focus** rings (never `outline:none` without replacement).
- **Labels + error messages** on every field; `aria-describedby` for errors; `aria-live` for toasts and extraction progress.
- **No color-only** status — always icon/text with the color.
- **NHS number masking** in tables/lists (e.g. `••• 4821`). A reveal control may be added only when an audited, authorized backend API exists; masking alone is not access control.
- **Don't log** patient identifiers, transcripts, tokens, or LiveKit secrets to console/telemetry.
- **Minimize client state**: don't cache clinical data longer than needed; clear sensitive query cache on logout.
- **Never expose** JWTs or LiveKit secrets in logs, URLs, or error messages.

---

## 13. Build Phasing

**Frontend foundation (can start now)**
- Vite/TypeScript project, Tailwind and component primitives, app shell, route tree, error/loading/empty states, typed API contracts for users/doctors/patients, Patient CRUD, Doctor directory/admin CRUD, User management, and a mock adapter for every backend domain until browser authentication is complete.

**MVP integration (blocked on JWT backend)**
- Login, authenticated bootstrap through `/api/auth/me`, role redirect, protected routes, role guards, centralized error handling, and a basic dashboard containing only data from ready endpoints.

**V1 (blocked on data-model/API work)**
- Clinic CRUD after clinic foreign keys are consistent; consultation CRUD after patient-user linking, scoped ownership, timezone, and status contracts are complete; transcript editor, symptom records, alerts, polished tables/forms, and toasts.

**V2**
- LiveKit consultation room, backend-issued LiveKit token endpoint, live transcript, FastAPI AI extraction wired (replace mock), symptom review workflow, alert trend charts (Recharts).

**Later**
- Refresh-token flow (httpOnly cookie), dark mode, notifications, exports (CSV/PDF), Redis only if realtime/scaling genuinely needs it.

---

## 14. Deliverables

### Route table
| Path | Screen | Roles | Guard |
|---|---|---|---|
| `/login` | Login | public | — |
| `/register` | Register | public (flag) | — |
| `/` | redirect | auth | RequireAuth |
| `/admin` | Admin dashboard | ADMIN | RequireRole |
| `/admin/users`, `/admin/users/:id` | User mgmt | ADMIN | RequireRole |
| `/admin/doctors`, `/admin/doctors/:id` | Doctor manage | ADMIN | RequireRole |
| `/admin/clinics`, `/admin/clinics/:id` | Clinics | ADMIN | RequireRole |
| `/admin/alerts`, `/admin/alerts/:id` | Alerts | ADMIN | RequireRole |
| `/doctor` | Doctor dashboard | DOCTOR | RequireRole |
| `/patients`, `/new`, `/:id`, `/:id/edit` | Patients | DOCTOR, ADMIN | RequireRole |
| `/consultations`, `/new`, `/:id` | Consultations | DOCTOR, ADMIN | RequireRole |
| `/consultations/:id/room` | Live room | DOCTOR, participant PATIENT | RequireRole + backend |
| `/doctor/alerts`, `/:id` | Alerts | DOCTOR, ADMIN | RequireRole |
| `/patient` | Patient dashboard | PATIENT | RequireRole |
| `/patient/doctors`, `/patient/clinics` | Browse | PATIENT | RequireRole |
| `/patient/consultations`, `/:id` | Own history | PATIENT | RequireRole |
| `/doctors`, `/:id` | Directory | any auth | RequireAuth |
| `/profile` | Profile | any auth | RequireAuth |
| `/403`, `/404`, `*` | Fallbacks | any | — |

### Component inventory
- **Layout**: `AppShell`, `Sidebar`, `Topbar`, `RoleBadge`, `UserMenu`, `AlertBell`.
- **Guards**: `RequireAuth`, `RequireRole`, `ForbiddenPage`, `NotFoundPage`.
- **Data**: `DataTable` (sort/filter/paginate), `KpiTile`, `StatusBadge`, `SeverityBadge`, `EmptyState`, `ErrorState`, `Skeleton`.
- **Forms**: `TextField`, `SelectField`, `DateField`, `FormError`, `ConfirmDialog`, entity forms (`PatientForm`, `DoctorForm`, `UserForm`, `ClinicForm`, `ConsultationForm`).
- **Domain**: `PatientTable`, `PatientDetailHeader`, `ConsultationWorkspace`, `TranscriptEditor`, `SymptomReviewPanel`, `SymptomRecordView`, `AlertsTable`, `AlertDetail`, `ObservedVsBaselineChart`.
- **Media**: `ConsultationRoom` (LiveKit provider + controls), `LiveTranscriptPanel` (V2).
- **Feedback**: `Toaster`, `useToast`.

### API client structure
```
src/api/
  client.ts            // axios instance + JWT/request + error/response interceptors
  auth.ts              // login, register, (refresh), me
  patients.ts          // list/get/getByNhs/create/update/remove
  doctors.ts
  clinics.ts
  consultations.ts     // + mine, patchTranscript, complete
  symptomRecords.ts    // create, byConsultation, get
  alerts.ts            // list, byClinic, get, patchStatus
  users.ts
  livekit.ts           // getRoomToken(consultationId)
  ai.ts                // extractSymptoms(transcript) → FastAPI (mock in MVP)
src/hooks/queries/     // usePatients, usePatient, useAlerts, ... (TanStack wrappers)
src/hooks/mutations/   // useCreatePatient, usePatchAlertStatus, ...
```
Each module exports typed functions returning Zod-parsed responses; hooks own query keys + invalidation.

### Folder structure
```
src/
  api/                 // clients above
  app/
    router.tsx         // route tree + guards
    providers.tsx      // QueryClient, Auth, Toaster
  auth/                // useAuth, token store, guards
  components/
    ui/                // shadcn primitives
    common/            // DataTable, EmptyState, StatusBadge, ...
  features/
    dashboard/ patients/ doctors/ clinics/
    consultations/ symptoms/ alerts/ users/ profile/
    room/              // LiveKit consultation room
  hooks/               // queries + mutations
  lib/                 // axios, zod schemas, formatters, constants
  types/               // shared TS types / DTOs
  styles/              // tailwind, tokens
  main.tsx
```

### Backend delivery checklist before frontend integration

- [ ] Implement JWT login, refresh, and `GET /api/auth/me`; publish exact request/response examples.
- [ ] Configure a Vite development proxy or narrowly scoped Spring CORS policy; document allowed origins, methods, headers, and credential behavior.
- [ ] Extend validation responses with an optional `fieldErrors` map while retaining the current `ErrorResponse` fields.
- [ ] Add a one-to-one `AppUser` to `Patient` relationship and service-level ownership checks for all patient consultation routes.
- [ ] Replace string clinic references with `Long` foreign keys in consultations and alerts; migrate seed data.
- [ ] Add a consultation status enum, timezone-safe scheduled timestamp, CRUD endpoints, and `/api/consultations/mine`.
- [ ] Implement clinic, symptom-record, and alert controllers/services with DTOs, validation, RBAC, pagination, and consistent errors.
- [ ] Decide and implement PATIENT-only self-registration, including profile creation, or omit `/register` entirely.
- [ ] Route FastAPI extraction through Spring Boot. The browser sends only to Spring Boot; Spring Boot authorizes, redacts/logs appropriately, and calls FastAPI.
- [ ] Implement `POST /api/livekit/rooms/{consultationId}/token`. It returns a short-lived `{ token, url }` only after the backend confirms the caller is the assigned doctor or linked patient.
- [ ] Keep alerts forbidden to PATIENT and enforce it in Spring Security/service authorization.
- [ ] Move list endpoints to server-side pagination before realistic clinical data volumes; return a documented page envelope.
- [ ] Define the NHS display/reveal policy and implement server-side audit logging before any reveal UI is enabled.
