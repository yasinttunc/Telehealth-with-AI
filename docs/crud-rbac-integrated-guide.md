# CRUD and RBAC: Integrated Task Guide

Use this document as the implementation order. Every task keeps its definition, teaching, code blueprint, and verification together. Do not jump between a roadmap and an appendix.

## Current Progress: Completed and Verified

The following foundation work is complete in the current project:

- [x] PostgreSQL schema and seed data use `app_user_id`, `TIMESTAMPTZ`, clinics, consultation status values, symptom records, and alerts.
- [x] `Patient` and `Doctor` are linked one-to-one to `AppUser` through `app_user_id`.
- [x] Patient/Doctor create requests require an account ID; services validate account existence, the correct role, and duplicate profile links.
- [x] `Instant` is used for doctor availability and created timestamps.
- [x] Account updates keep passwords separate from the password-reset endpoint and expose the `enabled` state.
- [x] Clinic and Consultation entity mappings match the repaired database schema.
- [x] `./mvnw -q test` passes. Authenticated admin reads of `/api/doctors`, `/api/patients`, and `/api/users` return `200` and expose linked `appUserId` values.

The project is now ready for the first missing business feature: **Clinic CRUD**. Do not connect the React frontend to Spring yet; the frontend should remain mock-backed until Task 11.

## Next Steps: Start Here

Complete these tasks in order. Finish the verification checklist for one task before beginning the next.

1. **Task 7 - Clinic CRUD:** create the repository, service, and controller for clinic management. This gives consultations a real API-managed clinic to reference.
2. **Task 8 - Consultation CRUD:** create repository/service/controller, load real patient/clinician/clinic records, and always create with `SCHEDULED` status.
3. **Task 9 - Ownership RBAC:** add service-level checks so clinicians and patients cannot read or modify another person's consultation.
4. **Task 10 - My Data routes:** implement `/api/consultations/mine`, deriving identity from Spring Security rather than from a browser-supplied ID.
5. **Task 11 - JSON login/JWT:** replace temporary form/basic authentication only after consultation RBAC works.
6. **Task 12 - Symptom records and alerts:** add these last, using consultation and clinic ownership already established by the earlier tasks.

## Task 1: Keep Existing CRUD Predictable

**Goal:** Patient, Doctor, and AppUser CRUD return meaningful HTTP results.

**Where:** existing controllers, services, DTOs, and `GlobalExceptionHandler`.

**Implement:** return `201 Created` after create and `204 No Content` after delete.

```java
return ResponseEntity.status(HttpStatus.CREATED)
        .body(patientService.createPatient(request));
```

**Why:** the frontend can distinguish a created resource from a normal read. Your custom exceptions should continue to provide `400`, `404`, and `409` instead of a generic `500`.

**Verify:** valid create gives `201`; invalid DTO gives `400` plus `fieldErrors`; duplicate NHS/user gives `409`; missing ID gives `404`.

## Task 2: Separate Profile Updates From Password Changes

**Goal:** editing an email/role must not reset a user password.

**Where:** new request DTOs under `dto/request/`, `AppUserService`, and `AppUserController`.

```java
// Account-details update: do not touch the password.
user.setUsername(request.getUsername());
user.setEmail(request.getEmail());
user.setRole(parseRole(request.getRole()));

// Password reset: a separate service action.
user.setPassword(passwordEncoder.encode(request.getNewPassword()));
```

**Why:** a password is an authentication credential, not ordinary profile data. Separate operations make accidental password replacement impossible.

**Verify:** change email, log in with old password; reset password, confirm old login fails and new login works.

## Task 3: Apply the Database Phase Before Ownership RBAC

**Status:** complete.

**Goal:** a logged-in account can be connected to its patient/doctor profile.

**Where:** `infra/postgres/init/01-schema.sql`, `02-seed-data.sql`.

```sql
app_user_id BIGINT UNIQUE REFERENCES app_user(user_id)
```

**Why:** roles say *what kind* of user is logged in. These foreign keys say *which exact patient/doctor profile* belongs to them. `UNIQUE` stops one account being attached to two profiles.

**Verify:** link one PATIENT account to one patient and one DOCTOR account to one doctor. Reusing either account must fail at database level.

## Task 4: Update Patient and Doctor Mappings After the Database Phase

**Status:** complete.

**Goal:** make Java represent the new profile links and consistent database column names.

**Where:** `model/Patient.java` and `model/Doctor.java`.

```java
@OneToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "app_user_id", unique = true)
private AppUser appUser;
```

For the repaired doctor schema use:

```java
@Column(name = "first_name", nullable = false)
private String firstName;

@Column(name = "last_name", nullable = false)
private String lastName;
```

**Why:** `LAZY` prevents account data loading every time a profile is loaded. DTO responses remain essential: never return an `AppUser` entity or password hash through a patient/doctor endpoint.

**Verify:** read doctor/patient data through JPA after the schema update; ensure the JSON response contains profile fields, not account password data.

## Task 5: Correct Clinic and Consultation Relationships

**Status:** complete at entity/schema level. The API implementation begins in Task 7.

**Goal:** Clinic is a location/organisation; Consultation is the record joining patient, clinician, and clinic.

**Where:** schema, `model/Clinic.java`, `model/Consultation.java`.

```sql
CREATE TABLE consultation (
    consultation_id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT NOT NULL REFERENCES patient(patient_id),
    clinician_id BIGINT NOT NULL REFERENCES app_user(user_id),
    clinic_id BIGINT NOT NULL REFERENCES clinic(clinic_id),
    scheduled_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED'
);
```

```java
@ManyToOne(fetch = FetchType.LAZY, optional = false)
@JoinColumn(name = "clinic_id", nullable = false)
private Clinic clinic;
```

**Why:** do not store a text clinic code in a consultation. A foreign key lets PostgreSQL reject consultations that reference a non-existent clinic. Remove direct single doctor/patient fields from `Clinic`; one clinic can serve many of both.

**Verify:** invalid clinic ID is rejected; a clinic with consultations cannot be deleted when using `ON DELETE RESTRICT`.

## Task 6: Add the Consultation Lifecycle

**Status:** enum, entity, schema, and response fields are complete. Status-changing endpoints belong to Tasks 8 and 9.

**Goal:** distinguish scheduled, active, completed, and cancelled appointments.

**Where:** new `model/ConsultationStatus.java`, Consultation entity, schema, request/response DTOs.

```java
public enum ConsultationStatus {
    SCHEDULED,
    IN_PROGRESS,
    COMPLETED,
    CANCELLED
}
```

```java
@Enumerated(EnumType.STRING)
@Column(name = "status", nullable = false)
private ConsultationStatus status;
```

**Why:** an enum prevents misspellings and `EnumType.STRING` stores readable database values. The service, not the client, sets new consultations to `SCHEDULED`.

**Verify:** seed one consultation of each status and filter them in an API/frontend list.

## Task 7: Build Clinic CRUD

**Status:** next task. Start here.

**Goal:** Admin manages clinics; doctors can read them.

**Where:** add `ClinicRepository`, `ClinicService`, `ClinicController`, create/update request DTOs, and `ClinicResponse`.

```java
public interface ClinicRepository extends JpaRepository<Clinic, Long> {
}
```

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

**Why:** repository persists data, service applies business rules/mapping, controller owns HTTP and broad RBAC. This separation is a core Spring architecture concept.

**Verify:** ADMIN creates/updates/deletes; DOCTOR lists/reads; PATIENT receives `403` if clinic data is staff-only.

## Task 8: Build Consultation Creation Safely

**Goal:** create only valid appointments using existing patient, doctor account, and clinic records.

**Where:** `ConsultationService` and `CreateConsultationRequest`.

**First correction in this task:** remove `status` from `CreateConsultationRequest`. Status is already present in the entity and response DTO, but a browser must not be able to create a historical appointment as `COMPLETED` or `CANCELLED`. The service assigns `ConsultationStatus.SCHEDULED` itself.

```java
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
```

**Why:** the request contains IDs, but the service must load real records. It produces clear errors and validates the clinician role before creating a relationship. Do not trust a client-provided status on creation: every newly created appointment starts as `SCHEDULED`.

**Verify:** missing patient/clinic gives `404`; a PATIENT account supplied as clinician gives `400`; valid DOCTOR account creates a scheduled consultation.

## Task 9: Implement Ownership RBAC

**Goal:** patient/doctor roles can access only their own consultation records.

**Where:** `ConsultationService`.

```java
private void assertCanRead(Consultation consultation, AppUser currentUser) {
    if (currentUser.getRole() == AppUser.Role.ADMIN) return;

    if (currentUser.getRole() == AppUser.Role.DOCTOR
            && consultation.getClinician().getUserId().equals(currentUser.getUserId())) return;

    if (currentUser.getRole() == AppUser.Role.PATIENT
            && consultation.getPatient().getAppUser() != null
            && consultation.getPatient().getAppUser().getUserId()
                    .equals(currentUser.getUserId())) return;

    throw new AccessDeniedException("You are not allowed to access this consultation");
}
```

**Why:** `@PreAuthorize` checks broad role permission. This service guard checks record ownership. Both are necessary.

**Verify:** patient A cannot read patient B; doctor A cannot update doctor B’s consultation; admin can access both.

## Task 10: Create “My Data” Routes

**Goal:** never trust a patient/doctor ID supplied by the browser for personal data.

**Where:** `ConsultationController` and service.

```java
@GetMapping("/mine")
@PreAuthorize("hasAnyRole('DOCTOR', 'PATIENT')")
public List<ConsultationResponse> getMine() {
    return consultationService.getMyConsultations();
}
```

**Why:** the service derives the current account from Spring Security, then resolves its linked profile. A user cannot alter a URL ID to browse another person’s history.

**Verify:** call `/mine` as two different patient accounts and compare results.

## Task 11: Replace Form Login With a Frontend API Login

**Goal:** React/Next can authenticate through JSON rather than Spring’s generated HTML page.

**Where:** `AuthController`, `AuthService`, JWT service/filter, `SecurityConfig`.

```java
Authentication authentication = authenticationManager.authenticate(
        new UsernamePasswordAuthenticationToken(
                request.getUsernameOrEmail(),
                request.getPassword()
        )
);
```

**Why:** Spring Security delegates password comparison to BCrypt and `DatabaseUserDetailsService`. Never compare raw passwords yourself. A JWT contains only safe identity claims such as user ID, username, role, issue time, and expiry.

**Verify:** valid login returns token; invalid user/password both return a generic `401`; protected route without token returns JSON `401`.

## Task 12: Add Symptom Records and Alerts Last

**Goal:** preserve AI/mock results under a consultation and let staff manage clinic-level alerts.

**Where:** SymptomRecord and Alert models, repositories, services, controllers.

```java
@ManyToOne(fetch = FetchType.LAZY, optional = false)
@JoinColumn(name = "consultation_id", nullable = false)
private Consultation consultation;
```

```java
@ManyToOne(fetch = FetchType.LAZY, optional = false)
@JoinColumn(name = "clinic_id", nullable = false)
private Clinic clinic;
```

**Why:** these links let symptom records inherit consultation ownership and alerts use real clinics. Keep alert access to ADMIN/DOCTOR; a patient should not see population-level alert data.

**Verify:** assigned doctor reads their consultation symptoms; another doctor receives `403`; admin/doctor updates alert status; patient receives `403` for alerts.

## Final Test Checklist

- [ ] DTO validation returns `400` and field errors.
- [ ] Missing records return `404`.
- [ ] Duplicate NHS/user data returns `409`.
- [ ] API create returns `201`; deletion returns `204`.
- [ ] Every linked profile uses the correct user role.
- [ ] Patient/doctor ownership tests return `403` for cross-user access.
- [ ] Admin can manage all required data.
- [ ] Fresh Docker database contains valid seed data.

---

# Detailed Build Instructions

This section expands the tasks above into the exact order you should follow while coding. Read the task first, then follow its implementation lesson immediately below. Do not begin a later lesson until the completion checks in the current lesson pass.

## Lesson for Task 1: Existing CRUD Quality

### Learning objective

Understand the complete route-to-database path before creating new resources:

```text
HTTP request -> Controller -> @Valid -> Service -> Repository -> PostgreSQL
                                                -> Response DTO -> HTTP response
```

### Exact work order

1. Read the request DTO. Identify which validation annotations run before the controller enters the service.
2. Read the controller. Confirm it contains no database query or business rule.
3. Read the service. Confirm duplicates, missing records, and mapping logic are handled there.
4. Read the exception handler. Confirm each exception becomes the right HTTP status.
5. Test each CRUD endpoint before refactoring it.

### What each status means to the frontend

| Status | Frontend behaviour |
|---|---|
| 201 | close form, show success, add returned resource to UI |
| 204 | remove row/card from UI; do not parse JSON |
| 400 | show validation messages next to fields |
| 401 | redirect user to login |
| 403 | show a permission message; do not retry |
| 404 | show “record no longer exists” and refresh list |
| 409 | show uniqueness/conflict message |
| 500 | unexpected bug; log it and investigate |

### Common mistakes

- Returning JPA entities directly from controllers.
- Catching `Exception` in every service method and hiding the real error.
- Treating a missing record as `400`; it is normally `404`.
- Returning a password hash in a response DTO.
- Allowing a delete route to return `200` with a random message while other deletes return nothing.

### Completion evidence

Save screenshots or Postman results for one successful request and one error request for Patient, Doctor, and AppUser. This becomes useful evidence for your final report.

## Lesson for Task 2: Account Management

### Why this is a separate task

An application account has two categories of data:

| Category | Examples | Who should change it? |
|---|---|---|
| Account identity | username, email, role, enabled state | Admin |
| Credential | password | account owner or controlled admin reset |

Mixing the categories causes accidental password resets and makes frontend forms confusing.

### Files to create/change

```text
dto/request/UpdateAppUserDetailsRequest.java
dto/request/ResetPasswordRequest.java
service/AppUserService.java
controller/AppUserController.java
```

### Service rules to implement

1. Before changing username, check no other account has that username.
2. Before changing email, check no other account has that email.
3. Convert role text to the enum in one helper method.
4. Encode only a new password, never an existing BCrypt hash.
5. Prevent deletion/demotion of the last active admin if you add enabled-state support.

### Password rule explanation

BCrypt generates a different hash for the same raw password each time because it uses a random salt. Therefore you must never compare two BCrypt strings for equality. Spring Security checks a login by calling `passwordEncoder.matches(rawPassword, storedHash)`.

### Completion evidence

Test a user-details update without a password field. Then verify the previous password still authenticates. Test a password reset separately.

## Lesson for Tasks 3 and 4: Database Identity Model

### The problem being solved

Before these changes, a patient role says only “this user is a patient.” It does not identify which row in the patient table they own. The same applies to doctors.

After the change:

```text
AppUser (role PATIENT) -- one-to-one --> Patient
AppUser (role DOCTOR)  -- one-to-one --> Doctor
Consultation -- many-to-one --> Patient
Consultation -- many-to-one --> AppUser clinician
```

### Database-first implementation order

1. Update `01-schema.sql`.
2. Update `02-seed-data.sql` so every foreign key points to an existing row.
3. Recreate the disposable Docker database.
4. Inspect data with SQL queries.
5. Only then update Java entities and DTOs.
6. Compile before adding controllers/services.

### Why nullable database links and required API links can coexist

The database column remains nullable so imported/legacy clinical records can exist without a login. However, the current project API deliberately requires `appUserId` when it creates a new Patient or Doctor profile. This keeps the student-project workflow simple and makes ownership RBAC possible from the beginning. Do not remove the database nullability unless you also migrate every existing record.

### Critical service validation

The database foreign key proves an account exists. It cannot prove that account is a patient or doctor. The service must enforce the role:

```java
if (appUser.getRole() != AppUser.Role.PATIENT) {
    throw new BadRequestException("The selected account must have the PATIENT role");
}
```

Use the equivalent `DOCTOR` rule in doctor-profile linking.

### Data integrity test matrix

| Attempt | Expected result |
|---|---|
| Link missing account ID | 404 from service / FK protection in database |
| Link admin account to patient | 400 from service |
| Link same patient account twice | 409 or database unique constraint |
| Link same doctor account twice | 409 or database unique constraint |
| Create an unlinked patient profile through the current API | rejected because `appUserId` is required |

## Lesson for Tasks 5 and 6: Consultation Data Model

### Model vocabulary

Be precise in code and documentation:

- **Clinic:** organisation/location where care is organised.
- **Patient:** person receiving care.
- **Clinician:** logged-in doctor account assigned to a consultation.
- **Doctor profile:** clinical/scheduling profile linked to a clinician account.
- **Consultation:** a scheduled or completed care interaction.
- **Transcript:** text from or about that interaction.

### Why Clinic must not own a patient/doctor

If `Clinic` contains one `doctor_id` and one `patient_id`, it falsely means a clinic belongs to one doctor and one patient. The correct model is many consultations at a clinic, each with its own patient and clinician.

### Timestamp decision

Use `TIMESTAMPTZ` in PostgreSQL and `Instant` in Java for consultation scheduling and doctor availability.

```text
Database: 2026-08-01 09:00:00+00
Java:     Instant
Browser:  converts that instant to local display time
```

This prevents an appointment changing meaning when viewed from another timezone.

### Lifecycle transition rules

| Current status | Allowed next status | Reason |
|---|---|---|
| SCHEDULED | IN_PROGRESS, COMPLETED, CANCELLED | appointment may start, be completed directly, or cancel |
| IN_PROGRESS | COMPLETED, CANCELLED | call ends or is abandoned |
| COMPLETED | none | preserve completed clinical history |
| CANCELLED | none | avoid accidental reopening |

Implement these in one service helper rather than scattered controller conditions.

### Completion evidence

Seed all four states. Build a list query or temporary SQL query showing the correct count for each. Demonstrate a rejected transition such as `COMPLETED -> SCHEDULED`.

## Lesson for Task 7: Clinic CRUD

### Request/response design

Create requests contain only client-editable values:

```text
CreateClinicRequest: clinicName, clinicAddress
UpdateClinicRequest: clinicName, clinicAddress
ClinicResponse: clinicId, clinicName, clinicAddress
```

The client must never provide a generated clinic ID during creation.

### Service method checklist

For each service method ask these questions:

| Method | Required question |
|---|---|
| create | are name/address valid? |
| get by ID | does the clinic exist? |
| list | should the result be paginated? |
| update | does it exist before changing fields? |
| delete | do consultations reference it? |

### Deletion policy

With the Phase 2 foreign key restriction, PostgreSQL will prevent deletion of a clinic used by a consultation. Translate that database outcome into a user-friendly `409 Conflict` rather than exposing raw SQL.

### Completion evidence

Create a clinic as admin. Attempt modification as doctor. Create a consultation at the clinic, then verify deletion is rejected.

## Lesson for Task 8: Consultation CRUD

### Create request fields

```text
patientId        required
clinicianId      required
clinicId         required
scheduledAt      required and future
```

Do not accept `status`, `startedAt`, `endedAt`, or `transcript` in the basic create request. Those fields belong to later business actions.

### Mapping rule

Never do this:

```java
consultation.setPatient(new Patient(request.getPatientId()));
```

It creates an unmanaged placeholder and does not give a useful missing-patient error. Always load the record from its repository first.

### Suggested endpoint set

| Method/path | Purpose | Roles |
|---|---|---|
| POST `/api/consultations` | create appointment | ADMIN, DOCTOR |
| GET `/api/consultations/{id}` | detail with ownership check | ADMIN, DOCTOR, PATIENT |
| GET `/api/consultations/mine` | current user’s list | DOCTOR, PATIENT |
| PUT `/api/consultations/{id}/status` | lifecycle action | ADMIN, assigned DOCTOR |
| PUT `/api/consultations/{id}/transcript` | save transcript | ADMIN, assigned DOCTOR |

### Scheduling rule boundary

For the final project, start with “future time” validation. Add overlap checking only after core CRUD works. A simple later overlap rule checks whether the selected clinician has another `SCHEDULED` or `IN_PROGRESS` consultation in the desired interval.

## Lesson for Tasks 9 and 10: RBAC and Ownership

### Two gates, not one

```text
Gate 1: Controller @PreAuthorize -> Is this role allowed to use this endpoint type?
Gate 2: Service ownership guard -> Is this exact record owned/assigned to this user?
```

A patient passing Gate 1 must still fail Gate 2 for another patient’s consultation.

### How to obtain identity

Do not accept `currentUserId` in JSON. Read identity from Spring Security:

```java
Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
String username = authentication.getName();
```

Load `AppUser` from that trusted username. Then use its database ID in comparisons.

### Read versus write permissions

| Operation | Admin | Assigned doctor | Owning patient |
|---|---:|---:|---:|
| Read consultation | yes | yes | yes |
| Update status | yes | yes | no |
| Update transcript | yes | yes | no |
| Cancel consultation | yes | yes | no initially |
| Read symptom record | yes | yes | optional |

Write a separate `assertCanManage` helper for status/transcript operations. Do not reuse a read guard that permits patients.

### Completion evidence

Create two patients and two doctors. Test every cross-user access path. A correct project deliberately returns `403`; it does not hide the failure as `404` or permit it.

## Lesson for Task 11: JWT Authentication

### Request lifecycle

```text
POST /api/auth/login
  -> AuthenticationManager validates BCrypt password
  -> AuthService creates signed JWT
  -> browser stores token according to frontend strategy
  -> browser sends Authorization: Bearer <token>
  -> JWT filter validates token
  -> Spring Security context contains username + ROLE_...
  -> @PreAuthorize and ownership services run
```

### Token contents

Include only:

```text
userId, username, role, issuedAt, expiry
```

Never include passwords, password hashes, NHS numbers, transcripts, symptom JSON, or private emails as JWT claims.

### Student scope

Use one short-lived access token first. Refresh tokens, revocation, and email password recovery are optional future work. A working login plus correct authorisation is far more valuable than incomplete advanced token features.

### Completion evidence

Use three accounts: admin, doctor, patient. Verify role-specific routes with and without a valid bearer token. Ensure invalid username and invalid password produce the same generic error message.

## Lesson for Task 12: Symptoms and Alerts

### Symptom records

The AI result is not an independent medical record. It belongs to a consultation, which gives it a patient, clinician, clinic, and ownership context.

Store:

```text
consultation ID
symptom JSON
model name
prompt version
created time
optional clinician review state
```

### Alert rules

Alerts belong to clinics and are visible only to staff. Start with seeded alerts. The first implementation needs only list/detail/status changes; an automatic outbreak algorithm can be described as future work.

### Completion evidence

An assigned doctor can review symptoms from their completed consultation. Admin/doctor can acknowledge an alert. Patient receives `403` for alerts.

## Final Submission Checklist

### Backend

- [ ] Controllers use DTOs, not entities.
- [ ] Services own validation, mapping, and business rules.
- [ ] PostgreSQL constraints protect links and uniqueness.
- [ ] Custom errors produce consistent JSON.
- [ ] Authentication establishes a trusted current user.
- [ ] RBAC and record ownership are both tested.

### Database

- [ ] Fresh Docker build seeds the database automatically.
- [ ] Seed account/profile links are valid.
- [ ] Consultation IDs reference real patient, clinician, and clinic rows.
- [ ] No schema column is named differently from its entity mapping.

### Demonstration

- [ ] Admin creates/manages data.
- [ ] Doctor manages only assigned consultations.
- [ ] Patient sees only their own consultation list.
- [ ] Transcript creates or displays symptom data.
- [ ] Staff views and changes an alert status.
