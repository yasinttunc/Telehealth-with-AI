# Telehealth With AI: Student Frontend Specification

## Read This First

This is a **student final-project frontend**, not a commercial medical platform. Build a clear, attractive, working demo that proves the project workflow. Do not add enterprise systems merely because they sound professional.

The finished frontend should demonstrate:

```text
Login -> role dashboard -> CRUD management -> consultation workflow -> symptom/alert demo
```

The frontend is responsible for screens, forms, navigation, local UI state, and calling APIs. Spring Boot remains responsible for validation, authentication, RBAC, and data ownership.

## Instructions for the Implementer (Claude)

1. Build a real React application, not a marketing landing page.
2. Keep the first version compact and complete. Finish the screens in the MVP list before adding extras.
3. Do not create a backend, database, JWT implementation, microservices, FastAPI service, or LiveKit server.
4. Do not invent API endpoints. Use the API adapter and mock data for unavailable backend features.
5. Do not present mocked AI/video data as a live clinical system. In code, keep mock data in one dedicated module so it can later be replaced.
6. Do not use large hero banners, gradients, decorative illustration, oversized cards, excessive animation, or dashboard-card-inside-dashboard-card layouts.
7. Make the interface calm, compact, readable, and suitable for a university demonstration.

## 1. Technology and Scope

### Required stack

| Concern | Choice |
|---|---|
| Application | React + Vite + TypeScript |
| Navigation | React Router |
| API calls | Axios or native `fetch` through one API module |
| Styling | Tailwind CSS or one organised CSS system; choose one |
| Icons | lucide-react |
| Forms | React controlled forms; add React Hook Form only if already comfortable with it |

### Do not add in the MVP

- Next.js, SSR, SEO, analytics, feature-flag service.
- Redux, Zustand, TanStack Query, Zod, charts, or a full design system unless the core screens are complete.
- Refresh-token rotation, persistent token storage strategy, OAuth, password-recovery email flow.
- Real WebRTC/LiveKit integration, live transcription, screen sharing, or video recording.
- Advanced global search, notifications, audit-log UI, complex scheduling calendars, dark mode, or extensive animations.

These can be mentioned as future work in the report.

## 2. Backend Reality and Frontend Modes

The current backend has usable Patient, Doctor, and AppUser CRUD. JWT browser authentication, clinics, consultations, symptom records, and alerts are not complete API features yet.

Create one `src/api/` layer with two modes:

| Mode | Use now? | Responsibility |
|---|---:|---|
| `mockApi` | Yes | Provides demo login, clinics, consultations, symptoms, and alerts from local arrays |
| `springApi` | Partly | Calls real Patient, Doctor, and AppUser routes when authentication is ready |

The UI must import functions from the API layer, never import mock arrays directly into pages. This gives a clean replacement path later.

### Current real backend routes

| Resource | Available routes | Frontend use |
|---|---|---|
| Patients | `/api/patients`, `/api/patients/{id}`, `/api/patients/nhs/{nhsNumber}` | Admin/doctor CRUD when API auth is connected |
| Doctors | `/api/doctors`, `/api/doctors/{id}`, `/api/doctors/specialty/{specialty}` | Directory and admin CRUD |
| Users | `/api/users` and user lookup/update/delete routes | Admin management only |

### Planned/mock features

| Feature | MVP frontend treatment |
|---|---|
| Login/JWT | Demo login using local role accounts; isolate auth code for replacement |
| Clinics | Mock CRUD-style display/form data |
| Consultations | Mock list/detail/create/edit status workflow |
| Symptoms | Mock clinician-reviewed extraction result on completed consultation |
| Alerts | Mock staff-only list and status change |
| Video call | A static consultation-room placeholder only; no active camera/microphone controls |

## 3. Demo Authentication and Roles

Create a simple login page with username and password fields. During mock mode, use these predefined demo accounts:

| Account | Password | Role |
|---|---|---|
| `admin` | `admin` | ADMIN |
| `dr.sarah.patel` | `password` | DOCTOR |
| `patient.oliver.hughes` | `password` | PATIENT |

After a successful mock login, store only the demo user object in React Context/session storage and redirect based on role. Put a clear code comment that this is temporary until Spring JWT login is implemented. Do not implement real security in the browser; route guards are only navigation UX.

## 4. Information Architecture

Use one app shell: narrow sidebar, top bar with page title and user menu, main content area. On smaller screens, collapse sidebar into a drawer.

### ADMIN routes

```text
/admin                 Dashboard
/admin/users           User management
/admin/doctors         Doctor management
/admin/patients        Patient management
/admin/clinics         Clinic list
/admin/consultations   Consultation list
/admin/alerts          Alert list
```

### DOCTOR routes

```text
/doctor                Dashboard
/doctor/patients       Patient list
/doctor/consultations  My consultations
/doctor/alerts         Alert list
/doctors               Doctor directory
```

### PATIENT routes

```text
/patient               Dashboard
/patient/consultations My consultations
/patient/doctors       Doctor directory
```

Shared routes: `/login`, `/profile`, `/403`, and a simple `*` not-found page.

## 5. Required MVP Screens

### 5.1 Login

- Centered compact form; no hero artwork.
- Username/email field, password field, submit button, inline error.
- Successful login redirects by role.
- Invalid credentials show one generic message.

### 5.2 Admin Dashboard

Show four small count blocks: users, doctors, patients, consultations. Below them, show a short open-alert list and recent consultations. Use local mock values until APIs exist.

### 5.3 Doctor Dashboard

Show today/upcoming consultations, a patient search shortcut, and two open alerts. The most useful action is “Open consultation,” not decorative statistics.

### 5.4 Patient Dashboard

Show one upcoming consultation and a short consultation history. Do not show patient lists, alerts, or admin management actions.

### 5.5 CRUD List Pages

For users, doctors, patients, clinics, and consultations use the same simple pattern:

- page title + one primary `Add` button where role allows;
- search box for name/specialty/NHS number where useful;
- readable table on desktop and stacked rows on mobile;
- row actions as icon buttons with tooltips: view/edit/delete;
- empty state with one clear action;
- delete confirmation dialog.

Do not build a generic mega-table framework. A reusable small table component is enough.

### 5.6 Create/Edit Forms

Use a right-side drawer or modal, not a separate route for every simple form.

| Form | Fields |
|---|---|
| User | username, email, role, password on creation only |
| Doctor | first name, last name, specialty, available times |
| Patient | first name, last name, NHS number, date of birth |
| Clinic | name, address |
| Consultation | patient, clinician, clinic, scheduled time, status |

Show server/mock validation errors under the relevant field. Disable submit while saving. Use plain date/time inputs; do not build a calendar scheduler.

### 5.7 Consultation Detail

This is the strongest demonstration page.

Show:

- patient, doctor, clinic, scheduled date/time, and status;
- status action for admin/doctor only;
- transcript area for admin/doctor only;
- symptom result panel only when a transcript exists;
- read-only view for patient;
- a modest “Video consultation is planned” placeholder, not fake working video controls.

### 5.8 Alerts

Admin/doctor only. A simple table with symptom, clinic, score, status, date, and a status dropdown. Patient role cannot navigate here.

## 6. Visual Direction

### Tone

Quiet clinical workspace, not startup marketing and not a dense hospital enterprise system.

### Layout and components

- White/light neutral main background with a muted teal or blue-green accent.
- One warm warning colour for alert states; red only for errors/destructive actions.
- 8px maximum card radius.
- Use cards only for small repeated summary items, modal forms, and compact detail panels.
- Prefer full-width page sections and tables rather than floating cards everywhere.
- Use Lucide icons for edit, delete, search, filter, close, and navigation.
- Buttons are commands; icon-only actions must have tooltips.
- Use normal font sizes: page title around 24-28px, panel heading around 16-18px, body around 14-16px.

### Accessibility and responsive rules

- Every input has a visible label.
- Keyboard focus is visible.
- Never rely only on colour for status; include status text.
- Keep controls at least roughly 40px high.
- At mobile width, sidebar becomes a drawer and tables may scroll horizontally.
- No text overlap, clipped buttons, or fixed widths that break small screens.

## 7. Data Shapes for Mock Mode

Keep mock data small and believable: three doctors, six patients, three clinics, six consultations, three alerts.

```ts
type Role = 'ADMIN' | 'DOCTOR' | 'PATIENT';
type ConsultationStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'DISMISSED' | 'RESOLVED';
```

Use stable IDs so list/detail/edit screens stay connected. Ensure the patient demo account owns only one patient record and sees only that patient’s consultations in mock mode.

## 8. Suggested Folder Structure

```text
src/
  api/                 mockApi, springApi, api types
  auth/                AuthContext, route guards
  components/          AppShell, Table, Modal, FormField, StatusBadge
  data/                mock data only
  pages/
    admin/
    doctor/
    patient/
    LoginPage
    ProfilePage
  types/
  styles/
  App.tsx
  main.tsx
```

Avoid excessive abstraction. Create a reusable component only after the same UI pattern is used in at least two places.

## 9. Build Order

1. Create the Vite React TypeScript project and basic styling.
2. Build auth context, login page, role redirect, and protected layout.
3. Build sidebar/top bar and the three dashboards using mock data.
4. Build Doctor and Patient list/detail/form flows.
5. Build User management for admin.
6. Build Clinic and Consultation mock CRUD screens.
7. Build consultation detail, transcript, symptom panel, and alert list.
8. Connect only the already-working Patient/Doctor/User endpoints when backend authentication permits it.
9. Replace mock modules one feature at a time as backend endpoints become ready.

## 10. Definition of Done

The MVP is done when:

- a user can sign in as each demo role and see the correct dashboard/navigation;
- CRUD forms and lists work against the mock API without broken state;
- admin, doctor, and patient views are clearly different;
- patient mock data never displays another patient’s consultation;
- consultation detail shows the project’s clinical workflow clearly;
- alerts are staff-only;
- the app is responsive and usable on desktop and mobile;
- no backend/security/video capability is falsely represented as complete.

## Future Work for the Report

After MVP, the next logical additions are Spring JWT integration, real consultation CRUD, ownership enforcement, a FastAPI symptom extraction service, and backend-issued LiveKit room tokens. Mention these as planned extensions; do not build them before the working student-project flow is complete.
