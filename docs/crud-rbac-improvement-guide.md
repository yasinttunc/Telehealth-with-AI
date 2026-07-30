# CRUD, Authentication, and RBAC Improvement Guide

> **Use the integrated guide first:** `docs/crud-rbac-integrated-guide.md` keeps each task definition, code example, explanation, and verification step together. This longer document remains as reference material.

## Purpose of This Guide

This document is a teaching roadmap for improving the current Telehealth With AI backend. It is based on the current source code and database schema, not on a generic Spring Boot template.

It deliberately contains **no application code**. Use it to understand the work before writing code yourself. The companion documents `backend-dto-guide.md` and `current-backend-task-roadmap.md` can be used when you are ready to implement individual classes.

This is a student final project. The objective is a coherent, secure-enough, demonstrable application, not a production hospital platform. Complete the **Must build** tasks before considering the optional tasks.

---

## 1. What You Have Today

### 1.1 Working foundation

The project already has a meaningful base:

- PostgreSQL schema and seed data.
- `AppUser` accounts with three roles: `ADMIN`, `DOCTOR`, and `PATIENT`.
- Password hashing with BCrypt.
- Database-backed Spring Security login support.
- CRUD routes for patients, doctors, and users.
- Request DTO validation with `@Valid`.
- A custom error response for validation, not-found, duplicate, and bad-request cases.
- Method-level role checks using `@PreAuthorize`.

The following routes are currently your strongest completed CRUD area:

| Area | Current routes | Current role direction |
|---|---|---|
| Patients | create, list, read by ID/NHS number, update, delete | doctors/admins manage; patient role has no personal view yet |
| Doctors | create, list, read by ID/specialty, update, delete | admin manages; all roles can read |
| Users | create, list, read, update, delete | admin manages |

### 1.2 Important unfinished areas

The database and DTO packages describe a broader telehealth system, but the application does not yet have full backend layers for it.

| Feature present in schema/DTOs | What is still missing |
|---|---|
| Clinic | Entity exists, but no repository, service, or controller CRUD layer |
| Consultation | Entity exists, but no repository, service, or controller CRUD layer |
| Symptom record | Database table and response DTO idea exist, but the Java model is empty and CRUD is missing |
| Alerts | Database table and request/response DTO ideas exist, but no model, repository, service, or controller |
| Login API | Login-related DTOs exist, but the browser/API login flow is not implemented |
| Account-to-profile ownership | An account is not linked to its doctor or patient record |

### 1.3 The central architectural gap

There are currently three independent concepts:

1. **`AppUser`**: an account that can log in and has a role.
2. **`Doctor`**: a clinician profile with specialty and available times.
3. **`Patient`**: a clinical profile with NHS number and date of birth.

They are not linked. This means the backend can answer, “Is the user a doctor?” but cannot answer, “Which doctor profile belongs to this logged-in doctor?” The same problem exists for patients.

That distinction is the key to understanding the next phases:

- **Role-based access control (RBAC)** answers whether a broad type of user can perform an action.
- **Ownership authorization** answers whether this specific logged-in user is allowed to access this specific record.

For example, a patient role may be allowed to read consultations, but should only be allowed to read consultations that belong to that patient.

---

## 2. Recommended Finished-Project Scope

Aim for this end-to-end story in the demonstration:

1. An admin creates user accounts, patient profiles, doctor profiles, and clinics.
2. A doctor creates and manages a consultation for a patient.
3. The doctor starts/completes the consultation and saves a transcript.
4. The backend stores AI-extracted symptoms for that consultation.
5. A patient can log in and see only their own profile and consultations.
6. A doctor/admin can view health alerts and update an alert status.

This provides a clear clinical workflow:

`account -> role -> profile -> consultation -> transcript -> symptom record -> alert`

Do not attempt every possible real-world capability before this works. Features such as refresh-token rotation, real-time transcription, advanced outbreak analytics, audit tables, and sophisticated scheduling are good future-work discussion points, but should not prevent completion.

---

## 3. Rules Before You Start

### 3.1 Work in vertical slices

Do not create every entity, then every repository, then every controller. Finish one usable feature at a time. For example, finish Clinic fully before moving to Consultation:

1. decide the data shape;
2. create repository;
3. create service rules;
4. create request/response DTOs;
5. create controller routes;
6. protect routes;
7. test the happy path and a failure path.

This is easier to debug and gives you working milestones.

### 3.2 Keep entities private to the persistence layer

Controllers should receive request DTOs and return response DTOs. They should not return JPA entities directly. This avoids accidental password exposure, lazy-loading errors, and changes in database structure leaking into your API.

### 3.3 Put business rules in services

The controller should answer: “Which endpoint was called and what HTTP response should be returned?”

The service should answer: “Is this operation allowed, is the data valid in the real domain, and what must be saved?”

Examples of service-layer rules:

- a consultation cannot end before it starts;
- a doctor cannot edit another doctor's consultation;
- a patient cannot access somebody else's consultation;
- an alert cannot be moved to an unsupported status.

### 3.4 Finish each task with evidence

For every task, verify at least:

- one successful request;
- one validation failure;
- one not-found case where relevant;
- one forbidden request where relevant;
- one ownership failure for patient/doctor-specific data.

---

# Phase 0: Stabilize Existing CRUD

**Priority: Must build**

**Goal:** patient, doctor, and user management behave predictably before more features are built.

## Task 0.1: Define the existing CRUD contract

### What to do

Write down the accepted request fields and returned response fields for Patient, Doctor, and AppUser. Keep this as a small API table in your project documentation.

### Why it matters

The frontend needs a stable contract. Without one, a field name or response shape can change while you work on the backend and silently break screens.

### Where to inspect

- `src/main/java/com/project/ibm/telehealth_with_ai/controller/`
- `src/main/java/com/project/ibm/telehealth_with_ai/dto/request/`
- `src/main/java/com/project/ibm/telehealth_with_ai/dto/response/`

### How to complete it

For each route, record:

- HTTP method and path;
- roles permitted to call it;
- request DTO name;
- required fields and validation rules;
- response DTO name;
- expected success status;
- normal failure statuses.

### Done when

Another person could build a simple frontend form from your table without opening the service code.

## Task 0.2: Use consistent HTTP outcomes

### What to improve

Decide and use a consistent success outcome for every CRUD action.

| Operation | Recommended outcome | Meaning |
|---|---|---|
| Create | `201 Created` | A new resource was created |
| Read | `200 OK` | Resource/list was returned |
| Update | `200 OK` | Updated representation was returned |
| Delete | `204 No Content` | Deletion succeeded and returns no body |
| Invalid request | `400 Bad Request` | The client sent invalid data |
| Unauthenticated | `401 Unauthorized` | No valid login/token was sent |
| Forbidden | `403 Forbidden` | Logged-in user lacks permission |
| Missing record | `404 Not Found` | Requested resource does not exist |
| Duplicate value | `409 Conflict` | Unique data already exists |

### Why it matters

The frontend can react correctly. For example, a `409` can display “NHS number already exists,” while a `500` means an unexpected bug.

### Done when

The same category of operation returns the same kind of result across patients, doctors, users, clinics, and consultations.

## Task 0.3: Improve domain validation

### What to improve

`@NotBlank`, `@Size`, and `@Email` validate the shape of input, but not every healthcare/business rule. Add domain-level checks in services.

### Checks to introduce

| Resource | Rule to validate | Reason |
|---|---|---|
| Patient | NHS number contains the expected number of digits | Prevents unusable records |
| Patient | date of birth is not in the future | Basic real-world validity |
| Doctor | availability times are in the future | Prevents offering past appointments |
| Doctor | duplicate availability slots are rejected | Keeps schedule clean |
| AppUser | username/email are unique | Already mostly present; keep it consistent |
| AppUser | role is one of the three enum values | Already present; retain it |

### How to think about it

- DTO validation protects the API boundary.
- Service validation protects the business rule.
- Database constraints protect data even if another application writes to the database.

Use all three levels where appropriate.

## Task 0.4: Make user account updates safer

### Current issue

Updating a user requires providing a password. This means an admin changing only an email or role must also send a password, which can unintentionally replace the existing password.

### What to do

Split account management into separate actions:

1. **Admin account details update:** username, email, role.
2. **Password reset:** admin chooses a new password for an account.
3. **Change my password:** logged-in user changes their own password after proving they know the current one.

### Why it matters

Passwords are sensitive credentials, not normal profile fields. Separating actions makes the API safer and easier to explain in the report.

### Student-project simplification

Implement the first two actions first. “Forgot password by email” is optional and not required.

## Task 0.5: Decide deletion policy

### Current situation

The project uses hard delete: the row is removed.

### Decision to make

For a student project, use the following simple rule:

- Patient and doctor profiles may be hard-deleted only when no consultation references them.
- User accounts should preferably be disabled rather than deleted after consultations exist.
- Consultations should not normally be deleted after completion; use a status such as cancelled instead.

### Why it matters

Deleting a clinical record can destroy historical links. Even a small `enabled` field on accounts demonstrates good reasoning without requiring a full audit system.

---

# Phase 1: Fix the Data Model for Ownership

**Priority: Must build**

**Goal:** enable the backend to identify whose patient/doctor data belongs to the logged-in account.

## Task 1.1: Link an account to a patient profile

### What to do

Add one optional, unique link from `Patient` to `AppUser`.

Conceptually:

- an `AppUser` with role `PATIENT` has one patient profile;
- a patient profile belongs to at most one `AppUser`;
- admin-created clinical records can exist before the patient receives an account.

### Why optional is useful

You may want to create a patient record before registering their login. If the link is mandatory immediately, admin workflow becomes unnecessarily difficult.

### Database work

Update:

- `infra/postgres/init/01-schema.sql`
- `infra/postgres/init/02-seed-data.sql`

The patient table needs a nullable, unique foreign key to `app_user.user_id`.

### Java areas affected

- `model/Patient.java`
- patient request DTOs only if an admin can choose the account during creation/update;
- `PatientService` for link validation;
- `PatientResponse` if the frontend needs to show whether the record has a linked account.

### Service rules

- Only an existing user with role `PATIENT` can be linked.
- One user cannot be linked to two patient profiles.
- A patient-role user cannot link themselves to an arbitrary patient record.
- An admin performs initial linking, or you implement a controlled registration flow later.

### Done when

Given a logged-in patient account, the system can resolve exactly one patient profile without trusting a patient ID sent by the browser.

## Task 1.2: Link an account to a doctor profile

### What to do

Add the equivalent optional, unique link from `Doctor` to `AppUser`.

### Why it matters

A consultation is assigned to an `AppUser` clinician, but doctor availability belongs to a `Doctor` profile. Linking those records makes it possible to enforce that a doctor only manages their own schedule and assigned consultations.

### Service rules

- The linked account must have the `DOCTOR` role.
- One doctor account maps to one doctor profile.
- Do not allow an admin account to masquerade as a doctor profile; admins can manage through their role.

### Student-project alternative

If time is limited, use `consultation.clinician_id -> app_user.user_id` as the ownership link and postpone detailed doctor-profile linking. However, this makes availability ownership harder to implement later, so the direct link is recommended.

## Task 1.3: Correct the consultation-to-clinic relationship

### Current problem

`Consultation` stores `clinicId` as text, while the `clinic` table has a numeric primary key. That is not a real relational link.

### What to do

Use a numeric foreign-key relationship from Consultation to Clinic.

### Why it matters

The database then prevents consultations from referencing a non-existent clinic. It also lets the backend join/filter consultations by clinic reliably.

### Important design question

Define what a clinic represents:

- a physical practice/location;
- an NHS-style care organisation;
- a virtual service group.

Choose one meaning and use it consistently in your frontend labels, seed data, and report.

## Task 1.4: Add consultation status

### What to do

Add a status field with a small fixed set of values:

- `SCHEDULED`
- `IN_PROGRESS` (recommended but optional)
- `COMPLETED`
- `CANCELLED`

### Why it matters

Without status, a consultation is only a timestamp and transcript. You cannot distinguish an upcoming appointment, a completed meeting, and a cancellation.

### Transition rules

Keep the rules simple:

| From | Allowed next state |
|---|---|
| SCHEDULED | IN_PROGRESS, COMPLETED, CANCELLED |
| IN_PROGRESS | COMPLETED, CANCELLED |
| COMPLETED | no changes, except transcript correction if you choose |
| CANCELLED | no changes |

### Done when

The consultation list can be filtered into upcoming, active, completed, and cancelled work.

---

# Phase 2: Authentication Strategy

**Priority: Must build before a React/Next frontend is connected**

## Task 2.1: Understand the current security approach

The project currently has:

- Spring Security form login;
- HTTP Basic authentication;
- a `DatabaseUserDetailsService` that reads an account by username or email;
- BCrypt password verification;
- method-level role checks.

This is suitable for early browser/manual testing. It is not the final API authentication experience for a separate frontend application.

### Why it needs changing

React or Next.js expects to submit login credentials to a JSON API and receive a browser-usable authenticated state. The default Spring HTML login page does not provide that experience.

## Task 2.2: Choose one authentication model

### Recommended choice: simple JWT access token

Use this if the frontend is a separate React/Vite or Next.js client.

The flow is:

1. Browser sends username/email and password to a login endpoint.
2. Backend validates credentials using the existing database user-details service and password encoder.
3. Backend returns a signed access token containing user ID, username, and role.
4. Frontend sends that token on later protected API requests.
5. Spring Security validates the token and places the authenticated user into the security context.

### Student-project boundary

Use a single short-lived access token. Do not build refresh tokens, token blacklists, multi-device sessions, or email recovery until the core application works.

### Alternative: session/cookie authentication

This can also work, especially if frontend and backend are served from the same application. It needs more care with CORS, CSRF, and cookies when frontend and backend run on different ports.

### Do not do this

Do not keep form login, HTTP Basic, and JWT as three public user-facing ways to authenticate. Keep Basic Auth only temporarily for development, then remove or restrict it. A single approach makes testing and documentation clearer.

## Task 2.3: Define the authentication endpoints

### Minimum endpoints

| Endpoint purpose | Who calls it | What it must return/do |
|---|---|---|
| Login | unauthenticated visitor | verifies credentials and establishes API auth state |
| Current user | any logged-in user | returns identity, role, and linked profile availability |
| Logout | logged-in user | frontend clears its token/session; backend action optional in simple JWT version |

### What “current user” should communicate

The frontend needs at least:

- account ID;
- username;
- role;
- patient profile ID when role is patient;
- doctor profile ID when role is doctor;
- enabled status if you add it.

This prevents the frontend from guessing IDs or trusting data stored from an earlier session.

## Task 2.4: Configure CORS and security errors

### CORS task

Allow only your frontend development origin, such as the Vite local origin. Do not use a blanket allow-all configuration in the final submission.

### Error-response task

Make unauthenticated and forbidden API responses return JSON consistently. Your frontend should be able to distinguish:

- `401`: send the user to login;
- `403`: show “You are not allowed to do that.”

### Done when

An admin, doctor, and patient can log in, call a protected endpoint, and receive predictable `401`/`403` errors for invalid access.

---

# Phase 3: Build Real RBAC and Ownership Checks

**Priority: Must build**

## Task 3.1: Establish the permission matrix

Use this as your baseline policy.

| Resource/action | ADMIN | DOCTOR | PATIENT |
|---|---:|---:|---:|
| Manage accounts | Yes | No | No |
| Manage doctor profiles | Yes | Own profile update only, optional | No |
| Manage patient records | Yes | Yes | Own profile only |
| View all patients | Yes | Yes | No |
| Manage clinics | Yes | View only | No |
| Create a consultation | Yes | Yes | No, unless appointment requests are added |
| View a consultation | All | Assigned only | Own only |
| Update consultation schedule/status | All | Assigned only | No |
| Update transcript | All | Assigned only | No |
| View symptoms | All | Assigned only | Own only, optional |
| Change alert status | Yes | Yes | No |

“All” in the admin column means the admin can access every record, not only records linked to them.

## Task 3.2: Separate role checks from ownership checks

### Role check

A route-level rule answers: “May doctors use this type of endpoint?”

### Ownership check

A service-level rule answers: “May this doctor edit this exact consultation?”

### How to apply it

For every consultation read/update/delete operation:

1. Load the consultation.
2. Read the currently authenticated account from the security context.
3. If the user is admin, continue.
4. If the user is doctor, compare the current account to the consultation clinician account.
5. If the user is patient, resolve their linked patient profile and compare it to the consultation patient.
6. If none match, reject with `403`.

### Why this belongs in the service

The service is used by all controller routes. Keeping ownership logic there makes it difficult to accidentally create an unprotected alternative endpoint later.

## Task 3.3: Create “my data” routes

### What to create conceptually

Add endpoints that derive the record from the authenticated user rather than receiving an arbitrary person ID from the browser.

Examples:

- “my profile” for patients;
- “my consultations” for patients;
- “my assigned consultations” for doctors;
- “my availability” for doctors.

### Why it matters

This is clearer and safer than asking a patient browser to send `patientId=4`. A malicious browser can change an ID in a URL; it cannot change the authenticated identity established by the server.

### Done when

A patient can use the application without ever needing to know or submit another patient’s database ID.

## Task 3.4: Add account disablement

### What to do

Add an account status such as enabled/disabled.

### Rules

- Disabled accounts cannot authenticate.
- Admin can disable or re-enable an account.
- Do not allow deletion of the last active admin account.
- Existing historical consultations remain intact.

### Why this is worthwhile

It is a small feature with a strong explanation: healthcare records should retain history, while access can be withdrawn.

---

# Phase 4: Clinic CRUD

**Priority: Must build**

## Task 4.1: Clarify the Clinic entity

### Current model concern

The current Clinic entity has direct doctor and patient references. That makes a clinic look like it belongs to one doctor and one patient, which is usually not what a clinic represents.

### Recommended student-project meaning

A clinic is an organisation/location that can have many consultations. It should have fields such as name and address, and consultations should reference it.

### Decision

Remove or avoid using direct single doctor/patient ownership fields unless your exact assignment states that a clinic is a one-doctor/one-patient care pairing.

## Task 4.2: Build the complete Clinic vertical slice

### Files/packages you will need

- `model/Clinic.java`
- `repository/ClinicRepository.java`
- `service/ClinicService.java`
- `controller/ClinicController.java`
- clinic create/update request DTOs;
- clinic response DTO;
- relevant exceptions and tests.

### Behaviour to implement

- Admin creates a clinic.
- Admin lists, reads, updates, and deletes clinics.
- Doctor can list/read clinics.
- Patient access is optional; omit it if clinics do not need to appear in patient UI.

### Validation ideas

- name required and limited in length;
- address required;
- avoid duplicate clinic name/address combinations if useful;
- deletion is blocked if consultations reference the clinic, or only allow deletion before any consultation exists.

### Done when

An admin can create a clinic and a doctor can select that clinic while creating a consultation.

---

# Phase 5: Consultation CRUD

**Priority: Must build; this is the core feature**

## Task 5.1: Define a consultation clearly

A consultation is one planned or completed clinical interaction. It connects:

- one patient profile;
- one clinician account/doctor profile;
- one clinic;
- scheduled date/time;
- status;
- optional started/ended times;
- optional transcript.

## Task 5.2: Finish the Consultation model

### Current improvement needed

The entity must expose and persist every field needed by the rest of the application, including scheduled time. The current model does not yet provide a complete CRUD-ready shape.

### Field decisions

| Field | Purpose | Required at creation? |
|---|---|---:|
| patient | who receives care | Yes |
| clinician | assigned doctor/account | Yes |
| clinic | organisation/location | Yes |
| scheduled time | appointment date and time | Yes |
| status | lifecycle state | Yes; default scheduled |
| started at | actual call start | No |
| ended at | actual call end | No |
| transcript | notes/transcription | No |

## Task 5.3: Build the repository queries you really need

At minimum, support these conceptual queries:

- all consultations, optionally filtered by date/status/clinic;
- one consultation by ID;
- consultations for a patient;
- consultations for a clinician;
- consultations for the current logged-in user;
- conflicting consultations for a clinician at a selected time, if you implement overlap checking.

Avoid adding repository methods merely because they sound useful. Add them when a screen or service rule needs them.

## Task 5.4: Build creation rules

When a consultation is created, validate:

1. patient exists;
2. clinician exists and has the doctor role;
3. clinic exists;
4. scheduled time is not in the past;
5. status begins as scheduled;
6. doctor has permission to create the consultation if a doctor initiated it;
7. optionally, appointment does not overlap with another scheduled/in-progress consultation.

### Scheduling complexity boundary

For the core final project, it is acceptable to validate that the time is in the future and show doctor availability. Full recurring schedules, time zones, rescheduling workflows, and calendar integrations are optional.

## Task 5.5: Define consultation routes around user workflows

Your routes should support screens, not just database operations.

| User need | Endpoint concept |
|---|---|
| Admin views all consultations | paginated/filterable consultation list |
| Doctor views assigned work | “my consultations” list |
| Patient views appointments | “my consultations” list |
| User opens detail screen | consultation by ID with ownership check |
| Doctor/admin schedules a consultation | create consultation |
| Doctor/admin changes appointment | update schedule/status |
| Doctor starts call | mark in progress and save started time |
| Doctor completes call | mark completed and save ended time |
| Doctor saves transcript | transcript update action |

## Task 5.6: Enforce consultation ownership

### Required cases

- Admin can read/manage all.
- Assigned doctor can read/manage only their own assigned consultations.
- Patient can read only consultations tied to their linked patient profile.
- Patient cannot edit transcript, assign doctors, or change statuses.

### Test cases

Create two patient accounts and two doctor accounts in seed/test data. Verify:

- patient A cannot load patient B’s consultation;
- doctor A cannot edit doctor B’s consultation;
- admin can read both;
- doctor B can edit their own;
- patient A can read their own.

These tests are much more valuable to RBAC confidence than simply checking whether a doctor can call a doctor-only route.

---

# Phase 6: Transcript and Symptom Record Workflow

**Priority: Should build**

## Task 6.1: Decide the source of the transcript

For your final project, choose one of these scopes:

1. **Manual transcript:** doctor enters text after the appointment. Easiest and fully demonstrable.
2. **Mock transcription:** the frontend/backend supplies prepared transcript data. Good for demonstrating the AI pipeline.
3. **Real transcription:** a WebRTC/LiveKit or external speech-to-text source sends the transcript. Stretch work.

Start with manual or mock transcript. The symptom feature should not wait for real-time video/audio.

## Task 6.2: Build SymptomRecord as a real entity

### What the record represents

A symptom record is the AI/manual extraction result for one consultation. It should preserve:

- which consultation produced it;
- extracted symptom list/items;
- model name;
- prompt version;
- creation time;
- optionally a doctor review state.

### Why model/prompt metadata matters

It lets you explain that AI output is traceable. Even if the data is mocked, you can say which model/prompt approach produced the result.

## Task 6.3: Define symptom permissions

| Action | ADMIN | Assigned DOCTOR | Owning PATIENT |
|---|---:|---:|---:|
| Create/extract symptoms | Yes | Yes | No |
| View symptoms | Yes | Yes | Optional read-only |
| Correct/review symptoms | Yes | Yes | No |

Patient access is a presentation decision. If you show symptoms in the patient portal, label them clearly as clinician-reviewed information rather than raw AI diagnoses.

## Task 6.4: Keep AI logic separate from CRUD

The CRUD service saves records. A separate extraction service should interpret transcript text and produce candidate symptoms. This makes it easier to switch from mock data to a real AI provider later without rewriting consultation permissions and database operations.

### Done when

A doctor can complete a consultation, save a transcript, create or trigger a symptom record, then view the stored result on the consultation detail screen.

---

# Phase 7: Alerts

**Priority: Should build**

## Task 7.1: Start with alert management, not alert generation

The schema supports alerts, but automated health surveillance is a large subject. For the final project, first implement a working alert lifecycle using seeded alerts.

### Minimum alert experience

- list alerts;
- filter by clinic and status;
- view alert details;
- doctor/admin acknowledges, dismisses, or resolves an alert;
- patient cannot access alerts.

## Task 7.2: Define status behaviour

Use the schema’s existing statuses:

- `OPEN`: needs attention;
- `ACKNOWLEDGED`: a clinician has seen it;
- `DISMISSED`: reviewed and considered not relevant;
- `RESOLVED`: investigation/action completed.

Only allow supported transitions. For example, an alert should not jump from dismissed back to open unless you explicitly allow reopening.

## Task 7.3: Add simple generation only after CRUD works

An optional demonstration algorithm can count symptom records by clinic over a time period and create an alert when a simple threshold is exceeded. Explain it as a prototype signal, not a clinical diagnostic engine.

---

# Phase 8: List Quality, Search, and API Usability

**Priority: Should build**

## Task 8.1: Add pagination

The current list endpoints return every record. That is acceptable with seed data but does not scale and makes frontend tables less usable.

Prioritize pagination for:

1. consultations;
2. patients;
3. alerts;
4. users.

Doctors and clinics can remain simple lists at first if there are only a few.

## Task 8.2: Add purposeful filters

| Resource | Useful filters |
|---|---|
| Patients | name, NHS number |
| Doctors | specialty, name |
| Consultations | status, date range, clinic, patient, clinician |
| Alerts | status, clinic, date range |
| Users | role, enabled state, username/email search |

Do not add a separate endpoint for every filter combination. Use query parameters on list endpoints.

## Task 8.3: Avoid sensitive data in URLs

An email address in a path is easy to leak into browser history, server logs, and monitoring tools. Use an admin search operation instead of a direct path that embeds email.

This is a worthwhile small improvement to mention in your security discussion.

---

# Phase 9: Testing Checklist

**Priority: Must build continuously**

## 9.1 CRUD test checklist

For each resource, test:

- create valid data;
- reject invalid data;
- list data;
- read an existing ID;
- return `404` for a missing ID;
- update valid data;
- reject an update that violates uniqueness/validation;
- delete according to your deletion policy.

## 9.2 RBAC test checklist

For each protected feature, test from the perspective of:

- unauthenticated visitor;
- admin;
- doctor;
- patient.

Expected outcomes should explicitly cover `401`, `403`, and `200`/`201` as appropriate.

## 9.3 Ownership test checklist

Create data for at least two doctors and two patients. Test that cross-user access fails.

This is the key evidence that your RBAC is not merely role labels, but a real access-control design.

## 9.4 Manual demonstration script

Prepare a short repeatable demonstration:

1. login as admin and create/manage data;
2. login as doctor and schedule/complete a consultation;
3. add transcript and symptom result;
4. login as patient and show only own consultation;
5. login as another patient and prove the first patient’s consultation is hidden;
6. show an alert being acknowledged.

This becomes useful both for your recorded demo and final report.

---

# Phase 10: Suggested Build Order

Use this checklist in order.

## Milestone A: Existing API polish

- [ ] Document current Patient, Doctor, and User endpoints.
- [ ] Apply consistent response statuses.
- [ ] Complete domain validation rules.
- [ ] Separate account profile update from password change.
- [ ] Decide hard-delete versus disable rules.

## Milestone B: Ownership data

- [ ] Link patient profile to patient account.
- [ ] Link doctor profile to doctor account.
- [ ] Make consultation reference a real clinic ID.
- [ ] Add consultation status and seed data.
- [ ] Recreate/verify the development database.

## Milestone C: API authentication

- [ ] Choose JWT or session authentication; use one public approach.
- [ ] Implement login and current-user behaviour.
- [ ] Configure CORS for the frontend origin.
- [ ] Return JSON `401` and `403` API errors.
- [ ] Test login for each role.

## Milestone D: Clinical workflow

- [ ] Finish Clinic CRUD.
- [ ] Finish Consultation CRUD.
- [ ] Add doctor/patient “my consultations” views.
- [ ] Add ownership enforcement.
- [ ] Add consultation status and transcript updates.

## Milestone E: AI/alert demonstration

- [ ] Implement SymptomRecord persistence and viewing.
- [ ] Implement alert list/detail/status update.
- [ ] Seed realistic symptom/alert examples.
- [ ] Add optional mock or real symptom extraction.

## Milestone F: Quality and presentation

- [ ] Add pagination/filtering where needed.
- [ ] Add focused CRUD and RBAC tests.
- [ ] Prepare demonstration accounts and data.
- [ ] Update API documentation and report diagrams.

---

# What to Leave as Future Work

It is good to name these in your final report, but do not let them block submission:

- refresh-token rotation and token revocation;
- password-reset email flow;
- audit-event history;
- advanced appointment conflict detection;
- proper timezone support for geographically distributed care;
- file uploads and medical attachments;
- full real-time video and transcription integration;
- automated alert analytics running in background jobs;
- production deployment monitoring and CI/CD;
- comprehensive automated integration testing with disposable containers.

The strongest student project is not the one with the longest future-work list. It is the one where the implemented clinical workflow is complete, protected by clear roles and ownership checks, and easy to demonstrate.

---

# Task-by-Task Implementation Workbook

This section fixes a weakness in the first version of the guide: the roadmap explained the tasks, but the code examples were separated into the appendix. Use this workbook while implementing. Every major task has the same learning pattern:

1. **Where** you make the change.
2. **Code** you write.
3. **Why** each part exists.
4. **Proof** that the task is complete.

## Workbook Task 1: Make Existing CRUD Return Correct Statuses

**Where:** `controller/PatientController.java`, `DoctorController.java`, and `AppUserController.java`.

For create operations, return `201 Created` instead of Spring's default `200 OK`:

```java
@PostMapping
public ResponseEntity<PatientResponse> createPatient(
        @Valid @RequestBody CreatePatientRequest request
) {
    PatientResponse response = patientService.createPatient(request);
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
}
```

For delete operations, return `204 No Content`:

```java
@DeleteMapping("/{id}")
@ResponseStatus(HttpStatus.NO_CONTENT)
public void deletePatient(@PathVariable Long id) {
    patientService.deletePatient(id);
}
```

**Teaching:** `ResponseEntity` gives the controller control over both HTTP status and response body. `201` tells the frontend a resource was created. `204` tells it deletion succeeded and there is intentionally no JSON body to parse.

**Proof:** create a patient and check for `201`; delete it and check for `204`; requesting the deleted ID must return `404`.

## Workbook Task 2: Add Domain Validation, Not Just Field Validation

**Where:** `service/PatientService.java`.

Add a focused helper that validates an NHS number before saving:

```java
private void validateNhsNumber(String nhsNumber) {
    if (nhsNumber == null || !nhsNumber.matches("\\d{10}")) {
        throw new BadRequestException("NHS number must contain exactly 10 digits");
    }
}
```

Call it at the beginning of both create and update methods:

```java
validateNhsNumber(request.getNhsNumber());
```

**Teaching:** `@NotBlank` only rejects null/empty/whitespace input. It cannot express every business rule. This helper validates a domain rule: an NHS number must be ten digits. Throwing `BadRequestException` lets your existing global exception handler produce a controlled `400` response.

**Proof:** send `123`, `ABC1234567`, and a valid 10-digit value. The first two must produce `400`; the valid one should continue to normal duplicate checks/save logic.

## Workbook Task 3: Separate Account Details From Password Changes

**Where:** create two request DTOs under `dto/request/`.

```java
public class UpdateAppUserDetailsRequest {
    @NotBlank
    @Size(min = 3, max = 50)
    private String username;

    @NotBlank
    @Email
    private String email;

    @NotNull
    private String role;

    // getters and setters
}
```

```java
public class ResetPasswordRequest {
    @NotBlank
    @Size(min = 8, max = 100)
    private String newPassword;

    // getter and setter
}
```

The account-details service method must not touch the password:

```java
user.setUsername(request.getUsername());
user.setEmail(request.getEmail());
user.setRole(parseRole(request.getRole()));
```

The password-reset method changes only the password hash:

```java
user.setPassword(passwordEncoder.encode(request.getNewPassword()));
```

**Teaching:** a password is a credential, not a normal profile field. This separation stops a role/email edit from overwriting someone’s password. The raw password is always encoded once, immediately before persistence; never store it or return it in a response.

**Proof:** update an email, then log in using the old password. Reset the password, then confirm old login fails and new login succeeds.

## Workbook Task 4: Link a Patient Profile to a Login Account

**Where:** `infra/postgres/init/01-schema.sql` and `model/Patient.java`.

```sql
app_user_id BIGINT UNIQUE REFERENCES app_user(user_id)
```

```java
@OneToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "app_user_id", unique = true)
private AppUser appUser;

public AppUser getAppUser() {
    return appUser;
}

public void setAppUser(AppUser appUser) {
    this.appUser = appUser;
}
```

Before assigning the link in `PatientService`, validate the account role:

```java
if (user.getRole() != AppUser.Role.PATIENT) {
    throw new BadRequestException("Only a PATIENT account can be linked to a patient profile");
}
```

**Teaching:** the SQL foreign key proves the account exists. `UNIQUE` proves an account cannot be attached to two patients. The Java service role check proves an admin account cannot accidentally become a patient profile. These are three different protections working together.

**Proof:** link a PATIENT account successfully. Try linking a DOCTOR account or reusing the same patient account for a second profile; both must fail.

## Workbook Task 5: Link a Doctor Profile to a Login Account

**Where:** `model/Doctor.java` and the doctor table in `01-schema.sql`.

```java
@OneToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "app_user_id", unique = true)
private AppUser appUser;
```

The service role check is the doctor equivalent:

```java
if (user.getRole() != AppUser.Role.DOCTOR) {
    throw new BadRequestException("Only a DOCTOR account can be linked to a doctor profile");
}
```

**Teaching:** this is what lets a logged-in doctor later access their own availability and assigned consultations. A role alone is broad permission; this link gives the backend a specific profile identity.

**Proof:** after login as Dr Sarah’s account, the system can resolve Sarah’s doctor profile without receiving a doctor ID from the frontend.

## Workbook Task 6: Repair Clinic and Consultation Database Relationships

**Where:** `01-schema.sql`, `model/Clinic.java`, and `model/Consultation.java`.

Clinic should not contain a single doctor and patient. Keep it focused:

```java
@Entity
@Table(name = "clinic")
public class Clinic {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "clinic_id")
    private Long clinicId;

    @Column(name = "clinic_name", nullable = false)
    private String clinicName;

    @Column(name = "clinic_address", nullable = false)
    private String clinicAddress;

    // getters and setters
}
```

Consultation owns the real connection:

```java
@ManyToOne(fetch = FetchType.LAZY, optional = false)
@JoinColumn(name = "clinic_id", nullable = false)
private Clinic clinic;
```

```sql
clinic_id BIGINT NOT NULL REFERENCES clinic(clinic_id) ON DELETE RESTRICT
```

**Teaching:** a clinic may have many doctors, patients, and consultations. The consultation is the event that says which patient saw which clinician at which clinic. `RESTRICT` prevents a clinic with medical history from being deleted.

**Proof:** attempt to create a consultation with a non-existent clinic ID. The service should first return a useful `404`; the database foreign key remains the final safety net.

## Workbook Task 7: Add Consultation Status and Correct Time Handling

**Where:** new `model/ConsultationStatus.java`, `model/Consultation.java`, schema, DTOs.

```java
public enum ConsultationStatus {
    SCHEDULED,
    IN_PROGRESS,
    COMPLETED,
    CANCELLED
}
```

```java
@Column(name = "scheduled_at", nullable = false)
private Instant scheduledAt;

@Enumerated(EnumType.STRING)
@Column(name = "status", nullable = false, length = 30)
private ConsultationStatus status;
```

```sql
scheduled_at TIMESTAMPTZ NOT NULL,
status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED'
    CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'))
```

**Teaching:** `Instant` is one absolute moment, which is better for a remote telehealth appointment than a timezone-free `LocalDateTime`. `EnumType.STRING` stores readable text like `COMPLETED`, rather than a fragile ordinal number such as `2`.

**Proof:** seed one consultation for each status. The frontend should be able to filter upcoming, active, completed, and cancelled appointments.

## Workbook Task 8: Build the Clinic CRUD Layer

**Where:** add `repository/ClinicRepository.java`, `service/ClinicService.java`, and `controller/ClinicController.java`.

```java
public interface ClinicRepository extends JpaRepository<Clinic, Long> {
}
```

The essential not-found pattern in the service is:

```java
private Clinic findClinic(Long id) {
    return clinicRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Clinic not found"));
}
```

The admin-only create controller route is:

```java
@PostMapping
@PreAuthorize("hasRole('ADMIN')")
public ResponseEntity<ClinicResponse> create(
        @Valid @RequestBody CreateClinicRequest request
) {
    return ResponseEntity.status(HttpStatus.CREATED)
            .body(clinicService.createClinic(request));
}
```

**Teaching:** `JpaRepository` supplies basic persistence. The service provides meaningful errors and mapping. The controller applies the HTTP/RBAC boundary. Keeping those roles separate is the basic Spring layered architecture you should explain in your report.

**Proof:** admin receives `201` when creating a clinic; doctor can read it; patient receives `403` if you keep clinic data staff-only.

## Workbook Task 9: Create a Consultation Safely

**Where:** `service/ConsultationService.java`.

```java
public ConsultationResponse createConsultation(CreateConsultationRequest request) {
    Patient patient = patientRepository.findById(request.getPatientId())
            .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));

    AppUser clinician = appUserRepository.findById(request.getClinicianId())
            .orElseThrow(() -> new ResourceNotFoundException("Clinician not found"));

    if (clinician.getRole() != AppUser.Role.DOCTOR) {
        throw new BadRequestException("Clinician must have the DOCTOR role");
    }

    Clinic clinic = clinicRepository.findById(request.getClinicId())
            .orElseThrow(() -> new ResourceNotFoundException("Clinic not found"));

    Consultation consultation = new Consultation();
    consultation.setPatient(patient);
    consultation.setClinician(clinician);
    consultation.setClinic(clinic);
    consultation.setScheduledAt(request.getScheduledAt());
    consultation.setStatus(ConsultationStatus.SCHEDULED);

    return toResponse(consultationRepository.save(consultation));
}
```

**Teaching:** the request sends IDs, but the service loads real entities. That gives clear `404` errors and prevents invalid foreign keys. The service, not the browser, chooses the initial status. A user cannot create a fake completed appointment by sending `COMPLETED` in the request.

**Proof:** test missing patient, missing clinic, a clinician ID that belongs to a PATIENT account, and a valid doctor account.

## Workbook Task 10: Implement Ownership Checks

**Where:** `service/ConsultationService.java`.

```java
private void assertCanRead(Consultation consultation, AppUser currentUser) {
    if (currentUser.getRole() == AppUser.Role.ADMIN) {
        return;
    }

    if (currentUser.getRole() == AppUser.Role.DOCTOR
            && consultation.getClinician().getUserId().equals(currentUser.getUserId())) {
        return;
    }

    if (currentUser.getRole() == AppUser.Role.PATIENT
            && consultation.getPatient().getAppUser() != null
            && consultation.getPatient().getAppUser().getUserId()
                    .equals(currentUser.getUserId())) {
        return;
    }

    throw new AccessDeniedException("You are not allowed to access this consultation");
}
```

**Teaching:** `@PreAuthorize("hasRole('PATIENT')")` only says a patient can use an endpoint type. This guard answers whether this particular patient owns this particular consultation. Compare database IDs, not Java object references.

**Proof:** seed two patients and two doctors. Patient A must receive `403` for Patient B’s consultation; Doctor A must receive `403` when editing Doctor B’s consultation.

## Workbook Task 11: Add the “My Consultations” Workflow

**Where:** `controller/ConsultationController.java` and `ConsultationService.java`.

```java
@GetMapping("/mine")
@PreAuthorize("hasAnyRole('DOCTOR', 'PATIENT')")
public List<ConsultationResponse> getMine() {
    return consultationService.getMyConsultations();
}
```

The service determines the target profile from the authenticated account. It must not accept a user-selected `patientId` in this route.

```java
if (currentUser.getRole() == AppUser.Role.PATIENT) {
    return consultationRepository
            .findByPatientAppUserUserIdOrderByScheduledAtDesc(currentUser.getUserId())
            .stream().map(this::toResponse).toList();
}
```

**Teaching:** `/mine` is safer because the browser cannot change an ID to browse another person’s appointments. The server derives identity from authenticated login data.

## Workbook Task 12: Build JWT Login Before Frontend Integration

**Where:** new `controller/AuthController.java`, `service/AuthService.java`, `security/JwtService.java`, and `security/JwtAuthenticationFilter.java`.

The controller stays small:

```java
@PostMapping("/login")
public AuthResponse login(@Valid @RequestBody LoginRequest request) {
    return authService.login(request);
}

@GetMapping("/me")
public CurrentUserResponse me() {
    return authService.getCurrentUser();
}
```

The login service delegates password checking to Spring Security:

```java
Authentication authentication = authenticationManager.authenticate(
        new UsernamePasswordAuthenticationToken(
                request.getUsernameOrEmail(),
                request.getPassword()
        )
);
```

**Teaching:** `AuthenticationManager` uses your `DatabaseUserDetailsService` and BCrypt password encoder. Never query the password hash and compare strings manually. On success, generate a signed token containing only non-sensitive identity claims: user ID, username, role, issued time, and expiry.

**Proof:** valid credentials return an access token; invalid username and invalid password return the same generic `401`; calling `/api/auth/me` with a valid token returns role/profile identity.

## Workbook Task 13: Add Symptom Records and Alerts Only After Consultations Work

**Where:** `model/SymptomRecord.java`, `repository/SymptomRecordRepository.java`, `service/SymptomRecordService.java`; repeat the same structure for Alert.

The symptom record must belong to a consultation:

```java
@ManyToOne(fetch = FetchType.LAZY, optional = false)
@JoinColumn(name = "consultation_id", nullable = false)
private Consultation consultation;
```

The alert must belong to a clinic:

```java
@ManyToOne(fetch = FetchType.LAZY, optional = false)
@JoinColumn(name = "clinic_id", nullable = false)
private Clinic clinic;
```

**Teaching:** these relationships let you reuse the same consultation ownership guard for symptom records and the same clinic filter for alerts. Do not let AI data become an unconnected collection of rows.

**Proof:** an assigned doctor can view symptoms for their consultation; a different doctor cannot; an admin can acknowledge an open alert; a patient cannot access alerts.

## Workbook Task 14: Write a Focused Ownership Test

**Where:** `src/test/java/.../controller/ConsultationControllerIntegrationTest.java`.

```java
@Test
void patientCannotReadAnotherPatientsConsultation() throws Exception {
    mockMvc.perform(get("/api/consultations/{id}", consultationForPatientB)
                    .with(user("patient-a").roles("PATIENT")))
            .andExpect(status().isForbidden());
}
```

**Teaching:** this test checks the real security requirement, not merely whether an endpoint exists. A passing test proves that a role-valid user is still blocked when they do not own the record.

**Proof:** add equivalent tests for doctor-to-doctor access and admin access. Keep these tests when you change authentication from Basic Auth to JWT; the transport changes, but the authorization rule must remain true.

---

# Appendix A: Implementation Blueprints and Teaching Examples

## How to Use This Appendix

This appendix contains **proposed code examples** for the tasks above. The snippets are not applied to the application; they are a guided blueprint for you to implement in the correct order.

Do not paste every snippet at once. Complete one task, compile, test it, and understand the result before starting the next task. The packages below match the existing project structure:

```text
com.project.ibm.telehealth_with_ai
├── controller
├── dto
│   ├── request
│   └── response
├── exception
├── model
├── repository
├── security
└── service
```

## A.1: Data Model Changes for Ownership and Consultations

### A.1.1 Add profile-to-account links in PostgreSQL

**File:** `infra/postgres/init/01-schema.sql`

For a disposable development database, add the links directly to the table definitions. If you already have data, use `ALTER TABLE` statements in a separate migration file instead. The important rule is that one account can link to only one profile of that type.

```sql
ALTER TABLE patient
    ADD COLUMN app_user_id BIGINT UNIQUE
        REFERENCES app_user(user_id);

ALTER TABLE doctor
    ADD COLUMN app_user_id BIGINT UNIQUE
        REFERENCES app_user(user_id);

ALTER TABLE consultation
    ALTER COLUMN clinic_id TYPE BIGINT
        USING clinic_id::BIGINT;

ALTER TABLE consultation
    ADD CONSTRAINT fk_consultation_clinic
        FOREIGN KEY (clinic_id) REFERENCES clinic(clinic_id);

ALTER TABLE consultation
    ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED'
        CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'));
```

### What each line does

1. `app_user_id BIGINT` stores the ID of the login account associated with a clinical profile.
2. `UNIQUE` prevents two patient rows from claiming the same patient account. The same rule applies to doctors.
3. `REFERENCES app_user(user_id)` makes the database reject a link to an account that does not exist.
4. `ALTER COLUMN ... TYPE BIGINT` changes consultation clinic IDs from text to numeric IDs. This is necessary because `clinic.clinic_id` is numeric.
5. `USING clinic_id::BIGINT` tells PostgreSQL how to convert existing text values. It works only if every existing value is numeric or null.
6. The foreign key makes a consultation point to a real clinic.
7. `status` gives each consultation a lifecycle state and starts old/new records as `SCHEDULED`.
8. The `CHECK` constraint protects the database even if a future program bypasses Java validation.

### Important safety note

Do not run a type-conversion statement blindly on a database containing values such as `"Clinic A"`. First inspect the table. For your current seeded student database, the simpler approach is usually to update the schema/seed files and recreate the local Docker volume/database.

### A.1.2 Add the patient account relationship to the entity

**File:** `model/Patient.java`

```java
@OneToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "app_user_id", unique = true)
private AppUser appUser;

public AppUser getAppUser() {
    return appUser;
}

public void setAppUser(AppUser appUser) {
    this.appUser = appUser;
}
```

### Teaching explanation

- `@OneToOne` expresses the business rule: one patient profile maps to one login account.
- `fetch = FetchType.LAZY` means Hibernate does not automatically load account data every time it loads a patient. This avoids unnecessary queries and avoids accidentally serialising account details.
- `@JoinColumn` says the `patient` table owns the foreign-key column called `app_user_id`.
- `unique = true` mirrors the database uniqueness rule in the JPA model.
- The getter and setter allow the service layer to attach and read the linked account.

Do **not** put password fields into `PatientResponse`. A patient response should expose only clinical/profile data and, if useful, the linked account ID.

### A.1.3 Add the doctor account relationship

**File:** `model/Doctor.java`

```java
@OneToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "app_user_id", unique = true)
private AppUser appUser;

public AppUser getAppUser() {
    return appUser;
}

public void setAppUser(AppUser appUser) {
    this.appUser = appUser;
}
```

This is structurally the same as the patient link. The different business meaning is important: the linked account must have the `DOCTOR` role. Enforce that in `DoctorService`, not just in the controller.

### A.1.4 Create the consultation status enum

**New file:** `model/ConsultationStatus.java`

```java
package com.project.ibm.telehealth_with_ai.model;

public enum ConsultationStatus {
    SCHEDULED,
    IN_PROGRESS,
    COMPLETED,
    CANCELLED
}
```

### Why use an enum?

An enum provides a fixed list of valid Java values. It is much safer than allowing arbitrary strings such as `"done"`, `"finished"`, or a misspelling. When the entity uses `@Enumerated(EnumType.STRING)`, the database stores readable values such as `COMPLETED` rather than fragile numeric positions.

### A.1.5 Make Consultation a complete domain entity

**File:** `model/Consultation.java`

The relevant relationship and lifecycle fields should look like this:

```java
@ManyToOne(fetch = FetchType.LAZY, optional = false)
@JoinColumn(name = "patient_id", nullable = false)
private Patient patient;

@ManyToOne(fetch = FetchType.LAZY, optional = false)
@JoinColumn(name = "clinician_id", nullable = false)
private AppUser clinician;

@ManyToOne(fetch = FetchType.LAZY, optional = false)
@JoinColumn(name = "clinic_id", nullable = false)
private Clinic clinic;

@Column(name = "time", nullable = false)
private LocalDateTime scheduledAt;

@Enumerated(EnumType.STRING)
@Column(name = "status", nullable = false, length = 30)
private ConsultationStatus status;

@Column(name = "started_at")
private Instant startedAt;

@Column(name = "ended_at")
private Instant endedAt;

@Column(name = "transcript", columnDefinition = "TEXT")
private String transcript;
```

### Teaching explanation

- `@ManyToOne` is correct because many consultations can belong to one patient, clinician, or clinic.
- `optional = false` and `nullable = false` say a consultation cannot be orphaned from these three essential records.
- `Clinic clinic` replaces a `String clinicId`. The Java object relationship and SQL foreign key now agree.
- `scheduledAt` is clearer than a generic field name such as `dateTime` or `time`; it tells future readers this is the planned appointment time.
- `status` makes the current state explicit.
- `startedAt` and `endedAt` capture the actual timing of a call. They are optional because the consultation has not yet started when it is scheduled.
- `transcript` is optional because it may be added after or during the consultation.

Add normal getters and setters for every field. The service will need them when mapping request DTO data into an entity and when updating status/transcript.

## A.2: Request and Response DTOs for Consultation

### A.2.1 Create request

**New file:** `dto/request/CreateConsultationRequest.java`

```java
package com.project.ibm.telehealth_with_ai.dto.request;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public class CreateConsultationRequest {

    @NotNull(message = "Patient ID is required")
    private Long patientId;

    @NotNull(message = "Clinician ID is required")
    private Long clinicianId;

    @NotNull(message = "Clinic ID is required")
    private Long clinicId;

    @NotNull(message = "Scheduled time is required")
    @Future(message = "Scheduled time must be in the future")
    private LocalDateTime scheduledAt;

    public Long getPatientId() { return patientId; }
    public void setPatientId(Long patientId) { this.patientId = patientId; }
    public Long getClinicianId() { return clinicianId; }
    public void setClinicianId(Long clinicianId) { this.clinicianId = clinicianId; }
    public Long getClinicId() { return clinicId; }
    public void setClinicId(Long clinicId) { this.clinicId = clinicId; }
    public LocalDateTime getScheduledAt() { return scheduledAt; }
    public void setScheduledAt(LocalDateTime scheduledAt) { this.scheduledAt = scheduledAt; }
}
```

### Why IDs belong in this request

The client selects existing records, so it sends their IDs. The service must then load the real `Patient`, `AppUser`, and `Clinic` entities. Never create placeholder entities by only assigning an ID; loading them proves they exist and makes errors clear.

### What `@Future` does and does not do

`@Future` rejects a past date/time before the controller calls the service. It does **not** check whether the doctor is free, whether the clinic exists, or whether the requester is authorised. Those are service responsibilities.

### A.2.2 Consultation response

**New file:** `dto/response/ConsultationResponse.java`

```java
package com.project.ibm.telehealth_with_ai.dto.response;

import java.time.Instant;
import java.time.LocalDateTime;

public class ConsultationResponse {

    private Long consultationId;
    private Long patientId;
    private String patientName;
    private Long clinicianId;
    private String clinicianName;
    private Long clinicId;
    private String clinicName;
    private LocalDateTime scheduledAt;
    private String status;
    private Instant startedAt;
    private Instant endedAt;
    private String transcript;

    // Generate normal getters and setters for every field.
}
```

### Teaching explanation

The response provides both IDs and display names. IDs are needed for frontend navigation and later API actions; names are needed so the frontend does not have to make separate requests merely to render a table. It deliberately does not expose the clinician password, patient date of birth, or unrelated account data.

For patient-facing routes, consider a smaller `PatientConsultationResponse` that does not expose administration-only fields. One shared response is acceptable for this student project if it contains no sensitive/unneeded values.

## A.3: Repositories

### A.3.1 Clinic repository

**New file:** `repository/ClinicRepository.java`

```java
package com.project.ibm.telehealth_with_ai.repository;

import com.project.ibm.telehealth_with_ai.model.Clinic;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClinicRepository extends JpaRepository<Clinic, Long> {
}
```

### What this gives you automatically

By extending `JpaRepository`, you already receive save, find-by-ID, list-all, exists-by-ID, and delete-by-ID behaviour. Do not add custom methods until a service/use case needs them.

### A.3.2 Consultation repository

**New file:** `repository/ConsultationRepository.java`

```java
package com.project.ibm.telehealth_with_ai.repository;

import com.project.ibm.telehealth_with_ai.model.Consultation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ConsultationRepository extends JpaRepository<Consultation, Long> {

    List<Consultation> findByPatientPatientIdOrderByScheduledAtDesc(Long patientId);

    List<Consultation> findByClinicianUserIdOrderByScheduledAtDesc(Long clinicianId);
}
```

### How derived query names work

Spring Data reads the method name:

- `findByPatientPatientId` follows `Consultation.patient.patientId`.
- `OrderByScheduledAtDesc` orders newest scheduled appointment first.
- `findByClinicianUserId` follows `Consultation.clinician.userId`.

This is convenient for simple queries. Once filtering becomes complex, use `Pageable`, specifications, or explicit queries. For your project, simple derived methods are enough at first.

## A.4: Clinic CRUD Blueprint

### A.4.1 Keep Clinic focused

**File:** `model/Clinic.java`

The core student-project version can be:

```java
@Entity
@Table(name = "clinic")
public class Clinic {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "clinic_id")
    private Long clinicId;

    @Column(name = "clinic_name", nullable = false, length = 160)
    private String clinicName;

    @Column(name = "clinic_address", nullable = false, length = 255)
    private String clinicAddress;

    // Normal getters and setters.
}
```

Avoid storing one `Doctor` and one `Patient` directly in Clinic. The Consultation table is the natural place that brings patient, clinician, and clinic together.

### A.4.2 Clinic request and response shape

**Create/update request fields:** `clinicName`, `clinicAddress`.

**Response fields:** `clinicId`, `clinicName`, `clinicAddress`.

Use `@NotBlank` and `@Size` on name/address. A clinic name with whitespace only is not valid; a maximum length matches database constraints and produces a friendlier validation error.

### A.4.3 Clinic service responsibilities

The service should:

1. map request fields into an entity;
2. save a new or updated clinic;
3. throw `ResourceNotFoundException` if a requested clinic is missing;
4. map entity to response DTO;
5. prevent deletion when consultations still use the clinic, if you choose that policy.

The controller should not directly call the repository. Keeping the service layer means deletion policy and future validation have one correct home.

### A.4.4 Clinic controller permission plan

| Route category | Recommended permission |
|---|---|
| Create/update/delete clinic | ADMIN only |
| List/read clinic | ADMIN and DOCTOR |
| Patient reads clinic | optional |

## A.5: Consultation Service Blueprint

### A.5.1 Dependencies

**File:** `service/ConsultationService.java`

The service needs repositories for every related resource:

```java
private final ConsultationRepository consultationRepository;
private final PatientRepository patientRepository;
private final AppUserRepository appUserRepository;
private final ClinicRepository clinicRepository;
```

This is not unnecessary complexity. A consultation cannot be valid unless its patient, clinician, and clinic are loaded and checked.

### A.5.2 Creation flow

The core creation method follows this sequence:

```java
public ConsultationResponse createConsultation(CreateConsultationRequest request) {
    Patient patient = patientRepository.findById(request.getPatientId())
            .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));

    AppUser clinician = appUserRepository.findById(request.getClinicianId())
            .orElseThrow(() -> new ResourceNotFoundException("Clinician not found"));

    if (clinician.getRole() != AppUser.Role.DOCTOR) {
        throw new BadRequestException("Clinician must have the DOCTOR role");
    }

    Clinic clinic = clinicRepository.findById(request.getClinicId())
            .orElseThrow(() -> new ResourceNotFoundException("Clinic not found"));

    Consultation consultation = new Consultation();
    consultation.setPatient(patient);
    consultation.setClinician(clinician);
    consultation.setClinic(clinic);
    consultation.setScheduledAt(request.getScheduledAt());
    consultation.setStatus(ConsultationStatus.SCHEDULED);

    return toResponse(consultationRepository.save(consultation));
}
```

### Line-by-line teaching

1. Load the patient from the real database. A missing patient becomes `404`, not a confusing foreign-key failure.
2. Load the selected clinician account.
3. Check the clinician role. An existing patient/admin account is not automatically a valid doctor.
4. Load the clinic.
5. Create a new entity only after all referenced records are known to be valid.
6. Assign entity relationships, not raw foreign-key numbers.
7. Set the scheduled time from the validated DTO.
8. Set the initial state in the service. The browser must not choose `COMPLETED` during creation.
9. Save the entity and map it to a safe response DTO.

### A.5.3 Status update rules

Do not let a general update request freely overwrite every consultation field. A status update is a business action. Use a small request containing only the desired status.

**New file:** `dto/request/UpdateConsultationStatusRequest.java`

```java
package com.project.ibm.telehealth_with_ai.dto.request;

import com.project.ibm.telehealth_with_ai.model.ConsultationStatus;
import jakarta.validation.constraints.NotNull;

public class UpdateConsultationStatusRequest {

    @NotNull(message = "Status is required")
    private ConsultationStatus status;

    public ConsultationStatus getStatus() {
        return status;
    }

    public void setStatus(ConsultationStatus status) {
        this.status = status;
    }
}
```

The service checks that the change is legal:

```java
private boolean isAllowedTransition(
        ConsultationStatus current,
        ConsultationStatus next
) {
    return switch (current) {
        case SCHEDULED -> next == ConsultationStatus.IN_PROGRESS
                || next == ConsultationStatus.COMPLETED
                || next == ConsultationStatus.CANCELLED;
        case IN_PROGRESS -> next == ConsultationStatus.COMPLETED
                || next == ConsultationStatus.CANCELLED;
        case COMPLETED, CANCELLED -> false;
    };
}
```

### Teaching explanation

- A `switch` over an enum forces you to consider every possible current state.
- A completed/cancelled consultation is terminal in this simplified design.
- Keeping this logic in one method makes it easy to test and explain.
- If a transition is not allowed, throw `BadRequestException` because the resource exists, but the requested state change is invalid.

## A.6: Ownership Authorization Blueprint

### A.6.1 Read the currently logged-in account

With Spring Security, an authenticated username is available through the security context:

```java
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

private AppUser getCurrentUser() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

    return appUserRepository.findByUsernameIgnoreCase(authentication.getName())
            .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found"));
}
```

### Important adaptation note

Your current `findByUsernameIgnoreCase` method returns an `AppUser` or `null`, rather than an `Optional<AppUser>`. Therefore, either change the repository method to return `Optional<AppUser>` or use a null check. The important lesson is to resolve the server-trusted logged-in account, not accept an account ID from the client.

### A.6.2 Central ownership guard

**File:** `service/ConsultationService.java`

```java
private void assertCanAccess(Consultation consultation, AppUser currentUser) {
    if (currentUser.getRole() == AppUser.Role.ADMIN) {
        return;
    }

    if (currentUser.getRole() == AppUser.Role.DOCTOR
            && consultation.getClinician().getUserId().equals(currentUser.getUserId())) {
        return;
    }

    if (currentUser.getRole() == AppUser.Role.PATIENT
            && consultation.getPatient().getAppUser() != null
            && consultation.getPatient().getAppUser().getUserId().equals(currentUser.getUserId())) {
        return;
    }

    throw new AccessDeniedException("You are not allowed to access this consultation");
}
```

### How this works

1. Admin is allowed immediately because admin is the management role.
2. A doctor is allowed only when their account ID equals the consultation clinician account ID.
3. A patient is allowed only when the consultation patient’s linked account equals the currently logged-in account.
4. A missing patient account link fails safely; it does not accidentally grant access.
5. Any other situation throws an access-denied exception, which Spring should convert into `403 Forbidden`.

### Why compare IDs, not object references?

JPA entities may be loaded in different persistence contexts. Two Java objects can represent the same database row but not be the same object reference. Database IDs are the correct stable comparison.

### A.6.3 Use the guard in every sensitive operation

The pattern is:

```java
Consultation consultation = consultationRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Consultation not found"));

AppUser currentUser = getCurrentUser();
assertCanAccess(consultation, currentUser);

// Continue with read, update, transcript change, or status change.
```

For a doctor-only update, use a stricter guard that permits only admin or the assigned doctor. A patient may pass a read guard but must never pass a transcript/status update guard.

## A.7: Controller Design for Consultations

### A.7.1 Example route structure

**File:** `controller/ConsultationController.java`

```java
@RestController
@RequestMapping("/api/consultations")
public class ConsultationController {

    private final ConsultationService consultationService;

    public ConsultationController(ConsultationService consultationService) {
        this.consultationService = consultationService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR')")
    public ResponseEntity<ConsultationResponse> create(
            @Valid @RequestBody CreateConsultationRequest request
    ) {
        ConsultationResponse response = consultationService.createConsultation(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/mine")
    @PreAuthorize("hasAnyRole('DOCTOR', 'PATIENT')")
    public List<ConsultationResponse> getMine() {
        return consultationService.getMyConsultations();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR', 'PATIENT')")
    public ConsultationResponse getById(@PathVariable Long id) {
        return consultationService.getConsultationByIdForCurrentUser(id);
    }
}
```

### Teaching explanation

- `@RequestMapping` provides the shared URL prefix.
- `@PostMapping` represents resource creation.
- `@PreAuthorize` is the broad role gate. It does not replace service ownership verification.
- `@Valid` asks Spring to validate the request DTO before the method enters the service.
- `ResponseEntity.status(HttpStatus.CREATED)` deliberately returns `201 Created` for a successful create.
- `/mine` is a safer user-workflow route than `/patient/{id}` because the server derives identity from login.
- The get-by-ID route is available to all three roles, but the service decides whether this particular record belongs to the caller.

## A.8: JWT Authentication Blueprint

### A.8.1 Required dependency

To issue JWTs, add a maintained JWT library to `pom.xml`, such as JJWT. The exact version may change, so use the current library documentation when you implement it. Keep the JWT code limited to a small security package.

### A.8.2 JWT service responsibilities

**New file:** `security/JwtService.java`

This class should have three focused jobs:

1. create a token after valid login;
2. read username/user ID/role claims from a token;
3. verify token signature and expiry.

A typical token payload concept is:

```text
subject: username
userId: 42
role: DOCTOR
issued at: current time
expires at: current time plus a short duration
```

Do not store passwords, NHS numbers, transcripts, email addresses, or other sensitive clinical data inside a JWT. JWT contents can be decoded by a client even though the signature prevents modification.

### A.8.3 Login service flow

**New file:** `service/AuthService.java`

Conceptually, the login method does this:

```java
public AuthResponse login(LoginRequest request) {
    Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                    request.getUsernameOrEmail(),
                    request.getPassword()
            )
    );

    AppUser user = loadApplicationUser(authentication.getName());
    String token = jwtService.generateToken(user);

    return new AuthResponse(token, user.getUserId(), user.getUsername(), user.getRole().name());
}
```

### Teaching explanation

1. `authenticationManager.authenticate` compares the submitted password against the BCrypt hash through Spring Security.
2. Failure automatically becomes an authentication error; do not compare password strings yourself.
3. After success, load your application’s `AppUser` entity to get its ID and enum role.
4. Generate a signed token from safe identity claims.
5. Return only the information the frontend needs to begin an authenticated session.

### A.8.4 Authentication controller routes

**New file:** `controller/AuthController.java`

```java
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public CurrentUserResponse me() {
        return authService.getCurrentUser();
    }
}
```

`/login` is public. `/me` is protected and lets the frontend restore the signed-in user state when the page reloads.

### A.8.5 JWT filter concept

**New file:** `security/JwtAuthenticationFilter.java`

For every request, the filter should:

1. read the `Authorization` header;
2. ignore it if it does not start with `Bearer `;
3. extract the token after `Bearer `;
4. validate signature and expiry;
5. load the user details;
6. place an authenticated object with `ROLE_ADMIN`, `ROLE_DOCTOR`, or `ROLE_PATIENT` into Spring Security’s context;
7. continue the filter chain.

### A.8.6 Security configuration after JWT

The final security configuration should communicate these decisions:

- `/api/auth/login` is permitted without authentication;
- every other API route requires authentication unless deliberately public;
- sessions are stateless;
- form login and HTTP Basic are disabled for the frontend API;
- JWT filter runs before Spring’s username/password authentication filter;
- CORS permits the frontend development URL;
- unauthenticated/forbidden API errors are JSON.

Do not copy a JWT configuration without understanding it. The key learning point is the request lifecycle: token -> filter -> security context -> `@PreAuthorize` -> controller/service.

## A.9: Error Handling Additions

### A.9.1 Handle access-denied responses consistently

Your global exception handling should produce a predictable JSON response for `AccessDeniedException`.

```java
@ExceptionHandler(AccessDeniedException.class)
@ResponseStatus(HttpStatus.FORBIDDEN)
public ErrorResponse handleAccessDenied(
        AccessDeniedException exception,
        HttpServletRequest request
) {
    return new ErrorResponse(
            403,
            "You are not allowed to perform this action",
            request.getRequestURI()
    );
}
```

This is useful when a service ownership guard rejects access. The frontend receives a stable `403` response instead of a generic framework page.

### A.9.2 Handle duplicate database constraints thoughtfully

Service-level duplicate checks are user-friendly, but race conditions can still allow two requests to reach the database together. A database constraint is the final protection. Add a general `DataIntegrityViolationException` handler that returns a safe `409` or `400` message rather than exposing database internals.

Do not reveal raw PostgreSQL exception messages to users because they can expose table/column details.

## A.10: Implementation Order With Code Checkpoints

Follow this order exactly to avoid building on an unstable model.

1. **Schema and entities:** add profile links, clinic foreign key, and consultation status. Start the application and confirm schema/seed data works.
2. **Clinic slice:** repository, DTOs, service, controller, role checks, manual tests.
3. **Consultation basic slice:** entity fields, repository, request/response DTOs, create/list/read, then tests.
4. **Ownership:** add current-user resolution and the central access guard. Test with two doctors/two patients.
5. **Consultation actions:** status update and transcript update, with stricter doctor/admin permissions.
6. **Authentication upgrade:** implement JWT login, filter, `/me`, CORS, JSON security errors. Do this before frontend integration.
7. **Symptom records:** model/repository/service/controller, linked to a consultation and protected by the same ownership rules.
8. **Alerts:** start from seeded alerts and implement list/detail/status update before automatic detection.
9. **Quality:** pagination, filtering, account disablement, endpoint/API documentation, and your demonstration script.

At each checkpoint, run the full test suite and manually test the affected endpoints with different roles. The code is only finished when a role that should be blocked actually receives `403` and cannot access the data.
