# Current Backend Task Roadmap

Status: reviewed against the current codebase and the frontend contract in `docs/frontend-spec.md`.

This is the working backend order for the Telehealth With AI project. It separates completed foundations from unfinished work and puts data integrity, authorization, and browser authentication ahead of feature screens.

## Student Project Scope: What You Actually Need to Build

This is a final-year/student project, not a hospital production deployment. The target is a coherent, demonstrable application with correct CRUD, basic authentication/RBAC, a sensible database model, and a clear AI/video direction. Do **not** let enterprise features stop you from finishing the core project.

Use these labels throughout this document:

| Label | Meaning |
|---|---|
| **Must build** | Needed for a credible final project and working frontend demo. |
| **Should build** | Adds quality and supports a stronger demonstration, but can follow the core. |
| **Stretch** | Production-style improvement; implement only if the core is finished and time remains. |

### The student fast-track plan

Complete these in order. This is the route to a finished application.

1. **Must build: stabilize existing CRUD.** Replace generic exceptions, verify Patient/Doctor/AppUser DTO CRUD, and keep basic RBAC annotations.
2. **Must build: fix the database model.** Use numeric clinic IDs, link a patient account to its patient profile, add a simple consultation status, and update seed data. Link doctor accounts too if doctors must use their own schedules.
3. **Must build: simple JWT login.** Create `/api/auth/login`, return an access token, add a JWT filter, configure `/api/auth/me`, and allow the React dev origin through CORS.
4. **Must build: clinics and consultations.** Implement Clinic CRUD and Consultation CRUD with a simple `/api/consultations/mine` endpoint. Enforce that patients only see their own records and doctors only see theirs.
5. **Should build: symptom records and alerts.** Store a reviewed symptom record, create basic alert listing/status endpoints, and use mock AI data or a simple FastAPI call.
6. **Stretch: LiveKit room-token endpoint.** Add it only after consultations and ownership checks work.
7. **Must build continuously: focused tests and documentation.** Test the main happy path, validation, 401/403, and ownership. Keep a short API guide for the frontend.

### What to deliberately postpone

These are good professional ideas, but they are **not required** for the core submission:

- Refresh-token rotation and a `refresh_token` database table.
- Flyway migration history, if your development database can be recreated from Docker seed scripts.
- Full audit-event tables, optimistic locking, advanced alert analytics jobs, and sophisticated appointment conflict algorithms.
- Testcontainers, CI pipelines, production monitoring, token revocation lists, multi-device session management, and production deployment hardening.
- Real-time transcription and full LiveKit integration before basic CRUD/authentication works.

You may mention these as future work in the final report. That demonstrates architectural awareness without turning them into unfinished features.

---

## Student Implementation Phases

### Phase A: Finish the existing foundation

**Must build.**

**Goal:** existing Patient, Doctor, and AppUser routes work predictably and errors make sense to the frontend.

Do this:

- Replace `RuntimeException` with `ResourceNotFoundException` and `DuplicateResourceException` in the three existing services.
- Keep the current `ErrorResponse`; adding a `fieldErrors` map is useful but optional if time is short. A clean validation `message` is sufficient for a student demo.
- Fix user update duplicate checks, blank-password behavior, and invalid-role handling.
- Test existing RBAC manually and with a few controller tests.

**Stop when:** you can create/read/update/delete patients and doctors according to their roles, with 400/404/409 rather than random 500 errors.

### Phase B: Fix only the data model needed for the demo

**Must build.**

**Goal:** consultations can point to a real clinic, and a patient login has an actual patient profile.

Do this:

- Change `consultation.clinic_id` from `String` to `Long` and link it to `clinic.clinic_id`.
- Add `patient.app_user_id` so a PATIENT login can resolve to one patient record.
- Add `status` to consultation with `SCHEDULED`, `COMPLETED`, and `CANCELLED`. `IN_PROGRESS` is optional.
- Keep the existing `time` column as `LocalDateTime` if that is easier for your assignment. Document that timezone handling is future work; do not block the project over it.
- Update `01-schema.sql` and `02-seed-data.sql`, then recreate the local seeded database if its data is disposable.

**Optional:** add `doctor.app_user_id` if the logged-in doctor must only see their own consultations. It is recommended, but you can instead use `consultation.clinician_id -> app_user.user_id` as the ownership link in the first version.

**Stop when:** the seed database starts cleanly and a consultation has valid patient, clinician, clinic, date/time, and status data.

### Phase C: Simple JWT Authentication and RBAC

**Must build for a React frontend.**

**Goal:** login returns a JWT and the frontend can call protected API endpoints.

Do this:

- Add `AuthController`, `AuthService`, `JwtService`, and `JwtAuthenticationFilter`.
- Implement `POST /api/auth/login` and `GET /api/auth/me`.
- Put `userId`, `username`, and `role` in the access token.
- Use a JWT secret from an environment variable.
- Replace form login/HTTP Basic with stateless JWT security.
- Configure CORS for `http://localhost:5173` while using Vite.

**Keep it simple:** use a short-lived access token and ask users to log in again after a browser refresh. Add refresh tokens only as stretch work.

**Stop when:** ADMIN, DOCTOR, and PATIENT can log in; React can call `/api/doctors`; an unauthenticated request gets JSON 401; and a forbidden request gets JSON 403.

### Phase D: Core clinical CRUD

**Must build.**

**Goal:** admins/doctors manage clinics and consultations; patients read only their own consultations.

Do this:

- Build Clinic repository, service, and controller.
- Build Consultation repository, service, and controller.
- Implement `GET /api/consultations/mine` using the current JWT user, not a user ID from the URL.
- Allow ADMIN to manage all consultations.
- Allow DOCTOR to create/read/update only consultations assigned to their account.
- Allow PATIENT to read only consultations linked to their patient profile.
- Add transcript update and a simple status update endpoint.

**Keep it simple:** skip complex recurring schedules and overlap detection unless your marking criteria explicitly requires scheduling logic.

**Stop when:** you can demonstrate an admin creating a clinic, a doctor creating a consultation, a patient viewing only their own consultation, and a doctor saving a transcript.

### Phase E: AI and alert demo features

**Should build.**

**Goal:** show how the project becomes “Telehealth With AI” without overbuilding ML infrastructure.

Do this:

- Store symptom records linked to consultations.
- Start with a hard-coded/mock extraction result or a simple FastAPI endpoint returning sample symptoms.
- Let a doctor review the symptoms before saving them.
- Implement alert list/detail/status update endpoints with seeded alert data.
- Keep alerts restricted to ADMIN and DOCTOR.

**Keep it simple:** JSONB may initially be mapped as a JSON string in the entity while the DTO exposes a structured list. A more advanced converter is stretch work.

**Stop when:** a transcript can produce a clearly labelled AI/mock symptom result, the doctor can save it, and an admin/doctor can view and acknowledge an alert.

### Phase F: Video and polish

**Stretch.**

**Goal:** add a believable video-consultation route only after the core workflow is stable.

Do this only if Phase D is complete:

- Add the backend LiveKit token endpoint.
- Verify the current user belongs to the consultation before issuing a token.
- Keep LiveKit secrets in backend environment variables.
- If time is limited, show a disabled “Video consultation coming next” state and describe LiveKit in the report instead of rushing an insecure integration.

---

## Current State

### Completed foundations

- `PatientController` uses `/api/patients` and has ADMIN/DOCTOR read-write access with ADMIN-only delete.
- `DoctorController` uses `/api/doctors`; reads allow ADMIN/DOCTOR/PATIENT and mutations are ADMIN-only.
- `AppUserController` exposes `/api/users` for ADMIN management.
- Patient, doctor, and user DTOs/services/controllers compile.
- `DatabaseUserDetailsService`, BCrypt password encoding, method security, and PostgreSQL seed data exist.
- `GlobalExceptionHandler` and custom exception classes exist.

### Important unfinished or inconsistent areas

- Security still uses form login and HTTP Basic. There is no JWT login, refresh, `/api/auth/me`, or CORS configuration for a React SPA.
- Services still use plain `RuntimeException` for expected errors; the exception handler therefore cannot consistently return 404/409 responses.
- Validation errors are returned as one message string, not a field-error map for forms.
- PATIENT and DOCTOR `AppUser` accounts have no relationship to their patient/doctor profiles, so secure “my consultations” and consistent clinician directory data cannot be implemented.
- `clinic.clinic_id` is a `BIGINT`, but consultation and alert DTOs/models store clinic IDs as `String`. There is no foreign key.
- Consultations have no explicit status and their planned time is an unzoned `LocalDateTime`.
- Clinic, consultation, symptom-record, alert, JWT, AI-proxy, and LiveKit endpoints do not exist.

## Target Architecture Decisions

These decisions are the source of truth for the remaining backend work. Change one only deliberately, then update the DTOs, database schema, OpenAPI contract, frontend specification, and tests together.

| Concern | Decision | Reason |
|---|---|---|
| Core API | Spring Boot owns all browser-facing healthcare APIs. | One authorization, audit, validation, and error boundary. |
| AI service | FastAPI is an internal service called by Spring Boot, never directly by the browser. | The browser must not bypass healthcare authorization or see AI credentials. |
| Video | Spring Boot issues short-lived LiveKit tokens after membership checks. | LiveKit API secrets stay server-side. |
| Authentication | **Core:** short-lived JWT access token. **Stretch:** refresh token in an HttpOnly cookie and persisted server-side. | Core is enough for the student demo; refresh improves session experience later. |
| Identity | `AppUser` is the login identity; `Patient` and `Doctor` are role-specific profiles linked one-to-one. | Enables secure “mine” queries and a truthful doctor directory. |
| Authorization | Security filter + controller guard + service ownership check. | A frontend guard or a URL alone must never authorize access. |
| Time | `Instant`/`TIMESTAMPTZ` for events and appointments. | A remote clinical system must not lose timezone context. |
| Deletion | Prefer `CANCELLED`/archival for clinical records; reject destructive deletes once referenced. | Preserves clinical and audit history. |
| API errors | One JSON error shape with optional `fieldErrors`. | Frontend forms and error states stay predictable. |

### Target request flow

```text
React SPA
  -> Authorization: Bearer access-token
Spring Security JWT filter
  -> authenticated AppUser + role in SecurityContext
Controller
  -> @Valid request DTO + coarse role guard
Service
  -> current-user lookup + ownership/business checks + transaction
Repository / PostgreSQL
  -> response DTO
GlobalExceptionHandler
  -> consistent JSON success/error response
```

## Rules for Every Task

1. Work on one task at a time; do not begin a dependent task early.
2. Use request/response DTOs. Controllers never return JPA entities.
3. Put business rules and ownership checks in services; controller annotations are an additional guard, not the only security layer.
4. Use `ResourceNotFoundException`, `DuplicateResourceException`, and `BadRequestException` for expected business failures. Do not use generic `RuntimeException` for them.
5. Add or update focused tests before declaring a task complete.
6. Compile and test at the end of every task:

```bash
./mvnw -q -DskipTests compile
./mvnw -q test
```

### Common definition of done

A task is not complete merely because its endpoint returns 200 once. Mark it complete only when all of these are true:

- Fresh seed data works from an empty PostgreSQL volume. Use formal migrations only if you choose the stretch migration path.
- Request DTO validation rejects malformed input before service execution.
- The service uses a transaction and maps entities to response DTOs.
- Core role paths are tested automatically or manually documented; every allowed/denied path should be covered automatically if time permits.
- Expected failure cases return the documented 400/401/403/404/409 status.
- `docs/frontend-spec.md` and a short API example collection match the real request/response shape. Full OpenAPI is a quality improvement.
- No password, raw token, NHS number, transcript, or service secret is logged.

### Shared API conventions

| Situation | HTTP status | Response rule |
|---|---:|---|
| Successful create | 201 | Return the response DTO and a `Location` header where practical. |
| Successful read/update | 200 | Return the response DTO or paginated envelope. |
| Successful delete/cancel | 204 or 200 | Use 204 only when there is no response body; prefer a state update for clinical records. |
| Invalid DTO/business input | 400 | `ErrorResponse`, with `fieldErrors` for DTO validation. |
| Missing/expired authentication | 401 | JSON error only, never an HTML login redirect. |
| Authenticated but forbidden | 403 | JSON error; service ownership checks still apply. |
| Missing resource | 404 | JSON error; use privacy-preserving 404 consistently where exposing existence is sensitive. |
| Duplicate/conflict/stale version | 409 | JSON error describing the safe resolution. |
| Internal/upstream failure | 500/502/503 | Generic safe message, server-side logging only. |

- Collections that can grow use `page`, `size`, and an optional stable sort/filter contract from their first public release.
- Use plural collection routes: `/api/patients`, `/api/consultations`, `/api/symptom-records`.
- IDs are opaque implementation details to the client; clients may send them to select a resource but services must authorize every use.
- Date/time values are ISO-8601 UTC values in JSON. `LocalDate` is allowed only for date-of-birth style values with no time or timezone.
- Do not return `null` ambiguously in a response DTO: omit optional fields only if the API contract says so, otherwise return a documented null/empty collection value consistently.

---

## Advanced Reference: Detailed Phase Plan

The following material is a deeper reference for when you need it. Follow the **Student Implementation Phases** above as the actual project plan. Items described as refresh-token rotation, Flyway, audit logging, concurrency control, advanced scheduling, or production hardening are optional unless your supervisor/marking rubric requires them.

Work through these phases in order. A phase is a checkpoint, not merely a folder of code. Do not start the next phase until the current phase's exit gate passes.

| Phase | Outcome | Depends on | Existing tasks |
|---|---|---|---|
| 0 | Baseline and conventions are verified. | Nothing | Preparation |
| 1 | Errors, validation, and user administration are predictable. | 0 | Tasks 1-2 |
| 2 | Database relationships represent real users, clinics, and consultations. | 1 | Task 3 |
| 3 | React can authenticate securely through JWT, refresh, and CORS. | 1-2 | Tasks 4-5 |
| 4 | Clinic and consultation workflows are secure and usable. | 2-3 | Tasks 6-7 |
| 5 | Reviewed AI symptom records and alerts work behind Spring Boot. | 4 | Tasks 8-9 |
| 6 | LiveKit access is securely issued for consultation participants. | 4 | Task 10 |
| 7 | Tests, API documentation, migrations, and release checks are complete. | Every phase | Task 11 |

### Phase 0: Establish a Safe Baseline

**Purpose:** understand the project before changing behavior and make it easy to detect regressions.

#### Step 0.1: Run the application and database as they are

1. Confirm Docker PostgreSQL is running and the application points to the intended database.
2. Run compile and tests before editing anything.
3. Test the existing `admin/admin` account only as a development seed account; do not treat it as production configuration.
4. Write down current endpoint behavior in an API client collection or OpenAPI draft.

```bash
docker compose up -d postgres
./mvnw -q -DskipTests compile
./mvnw -q test
```

#### Step 0.2: Create a working branch and protect secrets

- Create a feature branch per phase, for example `codex/backend-phase-1-errors`.
- Keep local values in `.env`; keep only `.env.example` in Git.
- Move database credentials, JWT secret, FastAPI URL, LiveKit key/secret, and allowed CORS origins to environment-backed settings before they become real.
- Never place access tokens, refresh tokens, patient data, or production-like credentials in SQL seed files.

#### Step 0.3: Learn the request path in this project

For every new feature, trace this path before coding:

```text
HTTP request
  -> Controller: route, @Valid, coarse @PreAuthorize
  -> Service: transaction, current user, ownership, business rule
  -> Repository: database query
  -> Entity: persistence only
  -> Response DTO: safe browser contract
  -> GlobalExceptionHandler: predictable error JSON
```

**Phase 0 exit gate:** application compiles, tests pass, database connection is known, and no real secret is committed.

---

### Phase 1: Make Existing APIs Predictable

**Purpose:** before new CRUD is added, make current Patient, Doctor, and AppUser APIs return safe, consistent results. This prevents every later controller from inventing its own errors.

#### Step 1.1: Complete the exception vocabulary

**Where:** `src/main/java/com/project/ibm/telehealth_with_ai/exception/`

Create/keep these classes:

```java
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}

public class DuplicateResourceException extends RuntimeException {
    public DuplicateResourceException(String message) {
        super(message);
    }
}

public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}
```

**What each means:**

- `ResourceNotFoundException`: requested record does not exist or should be hidden as non-existent.
- `DuplicateResourceException`: a uniqueness rule such as NHS number, username, or email is already used.
- `BadRequestException`: the request is malformed for a business reason, such as an illegal status transition.
- `ConflictException`: the request is valid, but current stored state prevents it, such as deleting a clinic used by consultations or an outdated alert version.

#### Step 1.2: Upgrade `ErrorResponse`

**Where:** `exception/ErrorResponse.java`

The response needs an optional field-error map so React Hook Form can attach server errors to individual inputs.

```java
public class ErrorResponse {
    private final Instant timestamp = Instant.now();
    private final int status;
    private final String message;
    private final String path;
    private final Map<String, String> fieldErrors;

    public ErrorResponse(int status, String message, String path) {
        this(status, message, path, Map.of());
    }

    public ErrorResponse(int status, String message, String path,
                         Map<String, String> fieldErrors) {
        this.status = status;
        this.message = message;
        this.path = path;
        this.fieldErrors = Map.copyOf(fieldErrors);
    }
}
```

`Map.copyOf` prevents code from changing the error details after the response has been built. Keep getters so Jackson can serialize the object.

#### Step 1.3: Map validation errors centrally

**Where:** `exception/GlobalExceptionHandler.java`

```java
@ExceptionHandler(MethodArgumentNotValidException.class)
@ResponseStatus(HttpStatus.BAD_REQUEST)
public ErrorResponse handleValidation(
        MethodArgumentNotValidException exception,
        HttpServletRequest request) {

    Map<String, String> fieldErrors = exception.getBindingResult()
            .getFieldErrors()
            .stream()
            .collect(Collectors.toMap(
                    FieldError::getField,
                    DefaultMessageSourceResolvable::getDefaultMessage,
                    (first, ignored) -> first,
                    LinkedHashMap::new
            ));

    return new ErrorResponse(400, "Validation failed",
            request.getRequestURI(), fieldErrors);
}
```

This code runs **after** Spring has deserialized the JSON into a request DTO and evaluated annotations such as `@NotBlank`, `@Email`, `@Past`, and `@Valid`. The controller method body is not called when validation fails.

#### Step 1.4: Replace generic service errors

**Where:** `service/AppUserService.java`, `PatientService.java`, `DoctorService.java`

Before:

```java
throw new RuntimeException("Patient not found");
```

After:

```java
Patient patient = patientRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));
```

For duplicate creation:

```java
if (patientRepository.existsByNhsNumber(request.getNhsNumber())) {
    throw new DuplicateResourceException("NHS number already exists");
}
```

#### Step 1.5: Finish safe AppUser updates

**Where:** `service/AppUserService.java`, `dto/request/UpdateAppUserRequest.java`

Use the current user only for administrator management here; do not reuse this endpoint for self-service profile updates.

```java
if (StringUtils.hasText(request.getPassword())) {
    user.setPassword(passwordEncoder.encode(request.getPassword()));
}
```

The `StringUtils.hasText` check is important: without it, an empty update field overwrites the real BCrypt password with a new hash for an empty string.

#### Phase 1 verification

1. Send invalid patient JSON and confirm 400 plus `fieldErrors`.
2. Request a missing patient and confirm 404 JSON.
3. Create/update a duplicate user and confirm 409 JSON.
4. Update a user without a password and verify login still works with the old password.
5. Add `MockMvc` tests for every outcome.

**Phase 1 exit gate:** current CRUD does not leak 500s for normal mistakes, and AppUser management does not accidentally change credentials or roles.

---

### Phase 2: Repair the Database and Identity Model

**Purpose:** make tables mirror the real-world relationships before exposing consultation data or patient self-service.

#### Step 2.1: Choose migration tooling

**Stretch/recommended path:** add Flyway so schema history is versioned alongside Java code.

**Where:**

```text
pom.xml
src/main/resources/db/migration/V1__baseline.sql
src/main/resources/db/migration/V2__identity_and_consultation_model.sql
src/main/resources/db/migration/V3__seed_development_data.sql
```

For the student project, it is acceptable to update the Docker initialization scripts and recreate the disposable local development database. If you do this, write the rebuild steps in the README. Flyway becomes worthwhile only when you need to preserve evolving data across versions.

#### Step 2.2: Add account profile links

**Where:** migration SQL, `model/Patient.java`, `model/Doctor.java`

Example SQL:

```sql
ALTER TABLE patient ADD COLUMN app_user_id BIGINT UNIQUE;
ALTER TABLE patient
    ADD CONSTRAINT fk_patient_app_user
    FOREIGN KEY (app_user_id) REFERENCES app_user(user_id);

ALTER TABLE doctor ADD COLUMN app_user_id BIGINT UNIQUE;
ALTER TABLE doctor
    ADD CONSTRAINT fk_doctor_app_user
    FOREIGN KEY (app_user_id) REFERENCES app_user(user_id);
```

Example JPA mapping inside `Patient`:

```java
@OneToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "app_user_id", unique = true)
private AppUser appUser;
```

`fetch = LAZY` stops a patient query from automatically loading the user object every time. Do not serialize this entity directly; response DTOs prevent accidental password exposure and lazy-loading issues.

#### Step 2.3: Correct clinic and consultation columns

**Where:** migration SQL plus `Consultation`, `Alert`, and their DTOs.

Use a real relationship internally:

```java
@ManyToOne(fetch = FetchType.LAZY, optional = false)
@JoinColumn(name = "clinic_id", nullable = false)
private Clinic clinic;

@Enumerated(EnumType.STRING)
@Column(nullable = false)
private ConsultationStatus status;

@Column(name = "scheduled_at", nullable = false)
private Instant scheduledAt;
```

Expose `Long clinicId`, `ConsultationStatus status`, and `Instant scheduledAt` in DTOs. The entity relationship is for JPA; the scalar ID is the API contract.

#### Step 2.4: Backfill and verify data

- Seed two linked patients, two linked doctors, and one admin explicitly.
- Seed future and historical consultations with different statuses.
- Verify foreign keys by deliberately attempting an invalid clinic/user link in development SQL.
- Keep `created_at` for audit history; do not overwrite it while backfilling.

#### Phase 2 exit gate

- Fresh migration creates the final schema without manual SQL.
- Every seed patient/doctor requiring login is linked to exactly one matching account.
- Consultation has `clinic_id BIGINT`, `scheduled_at TIMESTAMPTZ`, and status enum/check constraint.
- Java compilation and integration tests pass against PostgreSQL, not only an in-memory database.

---

### Phase 3: Build JWT Authentication, RBAC, and CORS

**Purpose:** give React a secure, stateless API boundary while preserving server-side RBAC.

#### Step 3.1: Add the classes deliberately

**Where:**

```text
controller/AuthController.java
service/AuthService.java
security/JwtService.java
security/JwtAuthenticationFilter.java
security/RestAuthenticationEntryPoint.java
security/RestAccessDeniedHandler.java
security/CurrentUserService.java
model/RefreshToken.java
repository/RefreshTokenRepository.java
service/RefreshTokenService.java
dto/request/LoginRequest.java
dto/request/RefreshTokenRequest.java        # omit if cookie-only refresh has no body
dto/response/AuthResponse.java
dto/response/AppUserResponse.java
```

#### Step 3.2: Define the login path

```text
POST /api/auth/login
  -> validate usernameOrEmail + password
  -> find AppUser
  -> passwordEncoder.matches(raw, storedHash)
  -> create access JWT
  -> create + persist hashed refresh token
  -> set refresh cookie
  -> return AuthResponse without a password
```

The same generic "Invalid credentials" response must be returned whether the username is unknown or the password is wrong. That makes user enumeration harder.

#### Step 3.3: Configure the filter chain

The final shape is conceptually:

```java
http
    .csrf(csrf -> csrf.disable())
    .sessionManagement(session ->
        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
    .exceptionHandling(errors -> errors
        .authenticationEntryPoint(restAuthenticationEntryPoint)
        .accessDeniedHandler(restAccessDeniedHandler))
    .authorizeHttpRequests(auth -> auth
        .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/refresh")
            .permitAll()
        .requestMatchers("/api/auth/register").permitAll() // only if enabled
        .requestMatchers("/api/users/**").hasRole("ADMIN")
        .anyRequest().authenticated())
    .addFilterBefore(jwtAuthenticationFilter,
        UsernamePasswordAuthenticationFilter.class);
```

This is a pattern, not copy-paste-complete code: constructor dependencies and imports must match your Spring Security version. The important ideas are stateless sessions, JSON error handlers, narrow public paths, and a JWT filter before standard username/password processing.

#### Step 3.4: Use current identity correctly

**Where:** `security/CurrentUserService.java`

```java
public AppUser requireCurrentUser() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication == null || !authentication.isAuthenticated()) {
        throw new BadRequestException("Authenticated user is required");
    }
    AppUser user = appUserRepository.findByUsernameIgnoreCase(authentication.getName());
    if (user == null) {
        throw new ResourceNotFoundException("Current user not found");
    }
    return user;
}
```

Every `/mine` service method calls this helper, then follows its profile relationship. It never trusts an ID supplied by the browser to determine ownership.

#### Step 3.5: Restrict CORS without breaking refresh

- Local frontend origin: `http://localhost:5173` only.
- Allowed headers: `Authorization`, `Content-Type`.
- Allowed methods: only the methods you expose.
- `allowCredentials(true)` is required when using a cookie; therefore wild-card origins are forbidden.
- In development, a Vite proxy can avoid CORS complexity, but production CORS must still be configured correctly.

#### Phase 3 exit gate

- React login gets a short-lived access token and no password/refresh token in JSON.
- Browser reload uses refresh cookie or returns to login safely.
- Every protected API returns JSON 401/403, never the default Spring HTML login page.
- Role tests cover ADMIN, DOCTOR, PATIENT, unauthenticated, expired token, and malformed token.

---

### Phase 4: Build the Operational Clinical Workflow

**Purpose:** create clinic and consultation features only after identities and database constraints can enforce real access rules.

#### Step 4.1: Implement Clinic CRUD

**Where:**

```text
repository/ClinicRepository.java
service/ClinicService.java
controller/ClinicController.java
dto/request/CreateClinicRequest.java
dto/request/UpdateClinicRequest.java
dto/response/ClinicResponse.java
```

Service pattern:

```java
@Transactional
public ClinicResponse updateClinic(Long id, UpdateClinicRequest request) {
    Clinic clinic = clinicRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Clinic not found"));

    clinic.setClinicName(request.getClinicName().trim());
    clinic.setClinicAddress(request.getClinicAddress().trim());
    return toResponse(clinic);
}
```

JPA dirty checking saves the changed managed entity when the transaction commits; an explicit `save` is acceptable too if that makes the learning flow clearer. The key is that the controller receives/returns DTOs and the service owns the lookup/rule.

#### Step 4.2: Build consultation repository queries first

**Where:** `repository/ConsultationRepository.java`

You need deliberate queries, not `findAll()` plus client-side filtering:

```java
Page<Consultation> findByClinician_UserId(Long userId, Pageable pageable);
Page<Consultation> findByPatient_AppUser_UserId(Long userId, Pageable pageable);
boolean existsByClinician_UserIdAndStatusInAndScheduledAtLessThanAndEndedAtGreaterThan(...);
```

The exact overlap query depends on your scheduling model. Write a test for it before relying on it in create/reschedule logic.

#### Step 4.3: Separate admin scheduling from doctor scheduling

- `CreateConsultationRequest`: patient ID, clinic ID, scheduled time for a doctor creating their own appointment.
- `AdminCreateConsultationRequest`: same fields plus clinician ID for an administrator scheduling on behalf of a doctor.
- Never let a DOCTOR supply a different `clinicianId` and accept it without a current-user equality check.

#### Step 4.4: Enforce ownership in the service

```java
private Consultation requireAccessibleConsultation(Long consultationId, AppUser currentUser) {
    Consultation consultation = consultationRepository.findById(consultationId)
            .orElseThrow(() -> new ResourceNotFoundException("Consultation not found"));

    if (currentUser.getRole() == Role.ADMIN) {
        return consultation;
    }
    if (currentUser.getRole() == Role.DOCTOR
            && consultation.getClinician().getUserId().equals(currentUser.getUserId())) {
        return consultation;
    }
    if (currentUser.getRole() == Role.PATIENT
            && consultation.getPatient().getAppUser() != null
            && consultation.getPatient().getAppUser().getUserId().equals(currentUser.getUserId())) {
        return consultation;
    }
    throw new ResourceNotFoundException("Consultation not found");
}
```

Returning a privacy-preserving 404 here means a user cannot distinguish "does not exist" from "exists but belongs to someone else." Use this policy consistently and document it.

#### Phase 4 exit gate

- Clinic reads/mutations have their intended roles.
- Consultations are paginated, timezone-safe, and non-overlapping according to documented rules.
- `/api/consultations/mine` derives identity from JWT and cannot leak another user's records.
- Transcript/status changes enforce assignment and legal state transitions.

---

### Phase 5: Add Reviewed AI Records and Alerts

**Purpose:** introduce AI carefully as decision support, not uncontrolled clinical automation.

#### Step 5.1: Persist symptom records as immutable snapshots

**Where:** `model/SymptomRecord.java`, `service/SymptomRecordService.java`, `controller/SymptomRecordController.java`

Each record contains the source consultation, structured symptoms, model name, prompt version, created timestamp, and reviewer identity. Do not update an old extraction when a newer model runs; create a new snapshot.

Example response concept:

```json
{
  "symptomRecordId": 8,
  "consultationId": 19,
  "symptoms": [
    { "name": "cough", "severity": "MODERATE", "confidence": 0.86 }
  ],
  "modelName": "clinical-extractor",
  "promptVersion": "v1",
  "createdAt": "2026-08-10T10:00:00Z"
}
```

#### Step 5.2: Create an internal FastAPI client

**Where:** `service/ai/FastApiExtractionClient.java` or an equivalent integration package.

- Read the base URL and timeout from configuration.
- Send only the transcript and required metadata after consultation ownership is verified.
- Validate the upstream JSON before returning candidates to the browser.
- Give the user a safe retryable 503 if FastAPI is unavailable.
- Do not log transcript content in request/response debug logs.

#### Step 5.3: Build alerts as analytics output

Alerts should be generated by a scheduled job or analytics service after a documented counting window and threshold rule. The initial alert API's job is review: filter, read, acknowledge/dismiss/resolve, and audit each change.

**Phase 5 exit gate:** symptom extraction is clinician-reviewed, FastAPI remains internal, and alerts never appear to PATIENT users.

---

### Phase 6: Add LiveKit Video Safely

**Purpose:** let consultation participants join a video room without exposing media infrastructure secrets.

#### Step 6.1: Token endpoint behavior

1. Read current user from JWT.
2. Load consultation through the same ownership method as Phase 4.
3. Reject CANCELLED/expired consultations according to your attendance window rule.
4. Build a room name such as `consultation-19`.
5. Create a short-lived LiveKit token with an identity based on the authenticated user ID.
6. Return room URL, room name, expiry, and token.
7. Record a minimal audit event that a token was issued; do not record token value.

#### Step 6.2: Configuration boundary

**Where:** environment-backed configuration only.

```text
LIVEKIT_URL=wss://...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
```

The React project receives `LIVEKIT_URL` only if needed; it never receives key or secret. The Spring Boot project reads the key/secret at runtime.

**Phase 6 exit gate:** an assigned patient/doctor can join only their consultation room and a guessed consultation ID cannot yield a token.

---

### Phase 7: Turn the Backend into a Maintainable Product

**Purpose:** prevent the project from becoming difficult to demo, extend, or defend academically after the happy path works.

#### Step 7.1: Write OpenAPI alongside endpoints

For every controller operation document:

- route and HTTP method;
- request JSON plus validation rules;
- success JSON and status;
- allowed roles;
- 400, 401, 403, 404, 409 examples;
- pagination/filter parameters where relevant.

#### Step 7.2: Add audit design deliberately

Use an `audit_event` table for sensitive actions, with actor user ID, action name, target type/ID, timestamp, and safe metadata. Do not copy a transcript or full NHS number into audit metadata.

Audit at minimum: login/refresh/logout failures if policy requires it, patient record access, NHS reveal, consultation access, transcript update, AI extraction request/save, alert status update, and LiveKit token issuance.

#### Step 7.3: Prepare a demo/release checklist

- Fresh database setup works from documented steps.
- Test seed credentials are listed in development-only documentation.
- `./mvnw -q test` passes.
- React points to the expected API base URL and allowed CORS origin.
- Mock AI/video states remain labelled until their backend integrations are live.
- No secrets are in Git history or screenshots.

**Phase 7 exit gate:** another developer can clone, configure, migrate, run tests, understand the API, and use the frontend without guessing hidden rules.

---

## Task 1: Stabilize Error and Validation Contracts

**Status:** partially complete. The exception package exists, but services do not consistently use it and form validation has no field map.

### Goal

Make every expected API failure predictable for the React client.

### Work

- Replace service-level `RuntimeException("... not found")` with `ResourceNotFoundException`.
- Replace duplicate username, email, and NHS failures with `DuplicateResourceException`.
- Use `BadRequestException` for invalid state transitions or invalid role values.
- Add `ConflictException` for valid requests that conflict with current persisted state, such as a referenced clinic deletion or stale alert version, and map it to 409.
- Extend `ErrorResponse` with an optional `Map<String, String> fieldErrors`.
- Update `GlobalExceptionHandler` so `MethodArgumentNotValidException` returns HTTP 400 with both a summary `message` and per-field messages.
- Add a final fallback handler for unexpected exceptions that returns a generic 500 message without exposing stack traces or database details. Log the original exception server-side.

### Files

```text
src/main/java/com/project/ibm/telehealth_with_ai/exception/ErrorResponse.java
src/main/java/com/project/ibm/telehealth_with_ai/exception/GlobalExceptionHandler.java
src/main/java/com/project/ibm/telehealth_with_ai/exception/ConflictException.java
src/main/java/com/project/ibm/telehealth_with_ai/service/AppUserService.java
src/main/java/com/project/ibm/telehealth_with_ai/service/PatientService.java
src/main/java/com/project/ibm/telehealth_with_ai/service/DoctorService.java
```

### Expected validation response

```json
{
  "timestamp": "2026-07-29T12:00:00Z",
  "status": 400,
  "message": "Validation failed",
  "path": "/api/patients",
  "fieldErrors": {
    "nhsNumber": "NHS number must contain 10 digits"
  }
}
```

### Implementation checklist

- [ ] Add a constructor/factory to `ErrorResponse` that accepts optional field errors without duplicating timestamp/path logic.
- [ ] Collect `FieldError` values into a deterministic map; where a field has multiple failed constraints, keep the first message or join them consistently.
- [ ] Handle JSON body parse failures (`HttpMessageNotReadableException`) as 400, with a safe message such as "Request body is invalid".
- [ ] Handle database constraint violations as a safe 409/400 fallback while service checks are being completed; never expose raw PostgreSQL text.
- [ ] Make the generic 500 handler log an internal correlation ID and return that ID only if a proper logging/correlation strategy is introduced.

### Tests to write

- Invalid `CreatePatientRequest` returns `400` and `fieldErrors.nhsNumber`.
- Unknown patient ID returns `404` with the requested path.
- Duplicate user email returns `409`.
- Invalid JSON body returns `400`, not an HTML error page.

### Done when

- Missing resources return 404.
- Duplicate resources return 409.
- Invalid DTO fields return 400 with `fieldErrors`.
- No expected business error uses a plain `RuntimeException`.
- Tests cover each error response category.

---

## Task 2: Finish AppUser Integrity and Admin Safety

**Status:** partly complete. Repository duplicate-check methods exist, but the service still throws generic exceptions and needs authorization rules for sensitive changes.

### Goal

Make user administration safe before it becomes the basis for authentication and patient ownership.

### Work

- Keep `existsByUsernameIgnoreCaseAndUserIdNot` and `existsByEmailAndUserIdNot` checks in `updateUser`.
- Replace their generic exceptions with `DuplicateResourceException`.
- Validate role text before `Role.valueOf`; return `BadRequestException` rather than an uncaught `IllegalArgumentException`.
- Do not re-hash a password unless the update request actually supplies a non-blank new password.
- Prevent an administrator from deleting their own account and from accidentally removing the final ADMIN account. This check belongs in `AppUserService`.
- Ensure `/api/users` remains ADMIN-only in both `SecurityConfig` and controller annotations/tests.

### Update rules to decide explicitly

- Username and email are case-insensitive uniqueness values. Normalize comparison consistently, while preserving the user's preferred display case only if that is a deliberate requirement.
- Password updates require a minimum-length validation in `UpdateAppUserRequest`; never accept a pre-hashed password from the client.
- Role changes must respect profile links from Task 3. For example, do not change a linked PATIENT account to ADMIN until the profile link is removed in a controlled workflow.
- Do not expose a general user update endpoint as a self-service profile endpoint. `/api/users/{id}` stays ADMIN management; `/api/auth/me` and a future dedicated profile endpoint handle self-service fields.

### Tests to write

- A duplicate username that differs only by case returns 409.
- Updating without a password retains the old BCrypt hash.
- An invalid role string returns 400 rather than 500.
- The sole remaining ADMIN cannot be deleted or demoted.

### Done when

- Updating a user to another user's username/email returns 409.
- Updating a user while keeping their own username/email succeeds.
- A blank password leaves the existing BCrypt hash unchanged.
- Invalid roles return 400.
- Self-deletion and removal of the last ADMIN are rejected clearly.

---

## Task 3: Repair the Core Data Model Before New CRUD

**Status:** blocked prerequisite for clinics, consultations, alerts, and patient self-service.

### Goal

Make the database represent the relationships the application actually needs.

### Database and model changes

1. Add one-to-one patient and doctor account relationships.

```text
patient.app_user_id BIGINT UNIQUE REFERENCES app_user(user_id)
doctor.app_user_id  BIGINT UNIQUE REFERENCES app_user(user_id)
```

- Model it as `Patient.appUser` with `@OneToOne` and a unique `@JoinColumn`.
- Model it as `Doctor.appUser` with the same one-to-one pattern.
- Only an `AppUser` with role `PATIENT` may be linked to a patient profile.
- Only an `AppUser` with role `DOCTOR` may be linked to a doctor profile.
- ADMIN accounts cannot be linked to a patient or doctor profile.
- Choose one explicit provisioning workflow: either an ADMIN first creates a DOCTOR `AppUser` then creates a doctor profile using `appUserId`, or one ADMIN-only service creates both atomically. Do not create unrelated user and doctor rows and try to match them by name/email later.

2. Make clinic references real foreign keys.

```text
consultation.clinic_id BIGINT REFERENCES clinic(clinic_id)
alert.clinic_id BIGINT REFERENCES clinic(clinic_id)
```

- Replace `String clinicId` with `Long clinicId` in entities and DTOs, or preferably use `@ManyToOne Clinic clinic` internally and expose only `Long clinicId` in DTOs.
- Update seed data to use numeric clinic IDs.

3. Add explicit consultation lifecycle fields.

```text
scheduled_at TIMESTAMPTZ NOT NULL
status VARCHAR(30) NOT NULL
```

- Use `Instant` or `OffsetDateTime` in Java, not `LocalDateTime`, for a scheduled remote appointment.
- Define `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, and `CANCELLED` as a Java enum and database constraint.
- Keep `started_at` and `ended_at` as audit timestamps; do not infer all state from nullability.

### Migration approach

Do not modify an already-used schema manually. Introduce versioned migrations (recommended: Flyway) or create numbered SQL migration files and apply them in order to the development database. Update `01-schema.sql` and `02-seed-data.sql` so a fresh Docker database has the final schema.

### Safe migration sequence

1. Back up the development database or recreate it only after confirming seed data is disposable.
2. Add new nullable profile-link columns and new consultation columns first; do not immediately drop the legacy string clinic column.
3. Create/link seed `AppUser` records for every seed doctor and patient profile.
4. Populate numeric `clinic_id` values from existing seed values, then add the foreign-key constraints.
5. Backfill `scheduled_at` from the legacy `time` field and backfill `status` as `SCHEDULED` unless existing timestamps justify another state.
6. Update Java models, DTOs, services, and tests to use the new columns.
7. Only after all code and data use the new fields, remove or rename legacy columns in a later migration.

This two-step migration avoids a release where database data exists but the running Java model cannot read it.

### Schema rules

- Add indexes for `patient.app_user_id`, `doctor.app_user_id`, `consultation.patient_id`, `consultation.clinician_id`, `consultation.clinic_id`, `consultation.scheduled_at`, and alert status/clinic filtering.
- Use database `NOT NULL`, `UNIQUE`, `FOREIGN KEY`, and `CHECK` constraints as a final integrity layer; Java validation is not a substitute for them.
- Add an optimistic-lock `@Version` column to `Alert` before status-update concurrency is introduced.
- Decide whether doctor availability belongs in a separate schedule table or the existing `available_times` collection; do not make it a source of truth for booked consultations without conflict checks.

### Files affected

```text
infra/postgres/init/01-schema.sql
infra/postgres/init/02-seed-data.sql
src/main/java/com/project/ibm/telehealth_with_ai/model/Patient.java
src/main/java/com/project/ibm/telehealth_with_ai/model/Doctor.java
src/main/java/com/project/ibm/telehealth_with_ai/model/Clinic.java
src/main/java/com/project/ibm/telehealth_with_ai/model/Consultation.java
src/main/java/com/project/ibm/telehealth_with_ai/dto/request/CreateDoctorRequest.java
src/main/java/com/project/ibm/telehealth_with_ai/dto/request/UpdateDoctorRequest.java
src/main/java/com/project/ibm/telehealth_with_ai/dto/response/DoctorResponse.java
src/main/java/com/project/ibm/telehealth_with_ai/dto/request/CreateConsultationRequest.java
src/main/java/com/project/ibm/telehealth_with_ai/dto/response/ConsultationResponse.java
src/main/java/com/project/ibm/telehealth_with_ai/dto/response/AlertResponse.java
```

### Done when

- No consultation or alert stores a clinic ID as text.
- A PATIENT account can be linked to exactly one patient profile.
- A DOCTOR account can be linked to exactly one doctor profile.
- A fresh database builds and seeds successfully.
- Consultation timestamps include timezone information and status is explicit.
- Existing seed records migrate without broken foreign keys.
- Re-running migrations is safe and a fresh Docker database reaches the same schema as an upgraded database.

---

## Task 4: Build Stateless JWT Authentication and Browser Access

**Status:** not started. This is required before the React application connects to the backend.

### Goal

Replace form login/HTTP Basic with a stateless API authentication flow.

### Endpoints

```text
POST /api/auth/login
POST /api/auth/refresh     # stretch
POST /api/auth/logout      # stretch
GET  /api/auth/me
POST /api/auth/register     # only if PATIENT self-registration is approved
```

### Required behaviour

- `login` authenticates username or email plus password and returns `AuthResponse` with the short-lived access token, identity, and role.
- **Core:** return a short-lived access JWT from login. The user signs in again after a browser reload/expiry.
- **Stretch:** store refresh tokens in an `HttpOnly`, `Secure`, `SameSite` cookie. Do not return them in JSON or put them in browser storage.
- **Stretch:** persist refresh-token metadata in a `refresh_token` table: user ID, hashed token or token identifier, expiry, creation time, revocation time, and replacement-token reference.
- **Stretch:** `refresh` rotates/validates the cookie token and returns a new access token; `logout` invalidates it and clears the cookie.
- `me` returns safe current-user fields; it never returns a password or derives identity from a request parameter.
- Registration, if enabled, creates only role `PATIENT` and creates or links the corresponding patient profile atomically. Otherwise, omit the endpoint and let ADMIN create accounts.

### Token policy (core plus stretch)

- Access-token claims: stable user ID (`sub`), username, role, issued-at, expiry, issuer, and a token ID if revocation/auditing needs it. Do not put email, NHS number, diagnosis, or profile data in JWT claims.
- Suggested access-token lifetime: 30–60 minutes for a student demo. A 10–15 minute access token plus a 7–14 day refresh token is a stretch/production-style improvement.
- Sign JWTs with a long random secret loaded from an environment variable. Never commit it to `application.properties`, seed SQL, or the frontend.
- Hash opaque refresh tokens before storing them. A database leak must not immediately become a session leak.
- Rotate refresh tokens on every successful refresh; reject revoked, expired, or already-replaced tokens.

### Endpoint contracts

```text
POST /api/auth/login
request:  { "usernameOrEmail": "admin", "password": "..." }
response: { "accessToken": "...", "tokenType": "Bearer", "userId": 1,
            "username": "admin", "email": "admin@example.test", "role": "ADMIN" }

GET /api/auth/me
response: { "userId": 1, "username": "admin", "email": "admin@example.test", "role": "ADMIN" }
```

**Stretch:** `/api/auth/refresh` returns the same access-token response shape. It receives no refresh token in JSON; the browser supplies the cookie automatically only to the configured origin.

### Security changes

- Add `JwtService`, `JwtAuthenticationFilter`, and an authentication entry point that returns JSON 401 rather than a login page.
- Configure Spring Security as stateless and remove `formLogin()` and `httpBasic()` for the API.
- Permit only `/api/auth/login`, `/api/auth/refresh`, and approved public registration paths. Protect everything else.
- Configure CORS for the exact Vite development origin only (for example `http://localhost:5173`) and the deployed frontend origin later. Explicitly allow `Authorization`, `Content-Type`, and required methods. Enable credentials only for refresh-cookie requests.
- Keep `@EnableMethodSecurity` and endpoint/service authorization.

### Implementation checklist

- [ ] Add request DTOs with `@NotBlank` constraints; do not reuse `RegisterRequest` for login.
- [ ] **Core:** add `AuthService`, `AuthController`, `JwtService`, `JwtAuthenticationFilter`, and JSON authentication entry point/denied handler.
- [ ] **Stretch:** add refresh-token entity/repository/service and logout endpoint.
- [ ] Update `SecurityConfig` and `application.properties` (or typed `@ConfigurationProperties`) for stateless security, CORS, cookie settings, JWT issuer/expiry, and environment-backed secrets.
- [ ] Create a dedicated patient-registration request that contains both account and required patient-profile fields; do not let public registration select `role`.
- [ ] Use `AuthenticationManager` and `PasswordEncoder.matches`; never compare BCrypt hashes manually.
- [ ] Extract the current user through `SecurityContext` in a small reusable helper/service rather than accepting identity from request parameters.
- [ ] **Stretch:** configure refresh cookie `Path=/api/auth`, `HttpOnly`, `Secure` in HTTPS environments, and an explicit `SameSite` policy.
- [ ] Add a Vite proxy for local development or configure narrowly scoped CORS, never `allowedOrigins("*")` together with credentials.

### Tests to write

- Correct password returns an access token and no password field.
- Incorrect password returns JSON 401 with the same generic message as an unknown username, preventing account enumeration.
- Expired/malformed token returns JSON 401.
- **Stretch:** refresh rotation invalidates the old refresh token.
- An allowed origin succeeds in CORS preflight; an unapproved origin does not receive permissive CORS headers.

### Done when

- A valid `Authorization: Bearer <token>` reaches protected endpoints.
- Missing or invalid tokens produce JSON 401.
- A valid token with the wrong role produces JSON 403.
- React can call the API from its allowed origin without broad `*` CORS rules.
- **Core:** expiry/reload returns the user to login safely. **Stretch:** refresh works after page reload without exposing a refresh token to JavaScript.

---

## Task 5: Verify and Test Existing Patient, Doctor, and User RBAC

**Status:** annotations exist; verification is still required.

### Goal

Lock in the access rules that are already implemented before expanding the surface area.

| Resource | Read | Create/update | Delete |
|---|---|---|---|
| Users | ADMIN | ADMIN | ADMIN, subject to Task 2 safety rules |
| Doctors | ADMIN, DOCTOR, PATIENT | ADMIN | ADMIN |
| Patients | ADMIN, DOCTOR | ADMIN, DOCTOR | ADMIN |

### Tests

- ADMIN receives successful responses for allowed routes.
- DOCTOR receives 403 for `/api/users/**` and doctor mutation routes.
- PATIENT receives 403 for patient list/detail/search and all admin routes.
- PATIENT can read doctor directory endpoints.
- Unauthenticated requests receive 401 once Task 4 is complete.

### Done when

- `@PreAuthorize` rules and `SecurityConfig` rules agree.
- Integration tests cover each role/resource boundary.
- No role is allowed solely because the frontend hides a button.

---

## Task 6: Create Clinic CRUD

**Status:** not started; begin only after Task 3.

### Endpoints

```text
POST   /api/clinics
GET    /api/clinics
GET    /api/clinics/{id}
PUT    /api/clinics/{id}
DELETE /api/clinics/{id}
```

### Structure

```text
model/Clinic.java                 # already exists; align mappings after Task 3
repository/ClinicRepository.java
service/ClinicService.java
controller/ClinicController.java
dto/request/CreateClinicRequest.java      # already exists
dto/request/UpdateClinicRequest.java      # already exists
dto/response/ClinicResponse.java          # already exists
```

### Rules

- ADMIN: create, update, delete.
- ADMIN, DOCTOR, PATIENT: read.
- Deleting a clinic referenced by a consultation or alert must be rejected with 409, or use a clearly documented archival strategy. Do not silently orphan medical data.

### Implementation checklist

- [ ] Add repository methods only when needed; `JpaRepository<Clinic, Long>` covers basic CRUD.
- [ ] In `ClinicService`, load the entity for update/delete with `orElseThrow(ResourceNotFoundException)`.
- [ ] Use `@Valid` on create/update request bodies and return `ClinicResponse` for every successful endpoint.
- [ ] Decide whether doctor/patient fields currently present in the clinic schema represent ownership, affiliation, or legacy data. Do not expose ambiguous relationships until their meaning is defined.
- [ ] Reject deletion with `DuplicateResourceException`/`BadRequestException` only if their semantics match; preferably add a dedicated `ConflictException` if a referenced clinic cannot be removed.

### Tests to write

- PATIENT can list/read a clinic but receives 403 for POST/PUT/DELETE.
- Unknown clinic returns 404.
- Deleting a referenced clinic returns 409 and leaves consultations/alerts intact.

### Done when

- CRUD uses DTOs and custom exceptions.
- Referenced clinics cannot be destroyed accidentally.
- Tests cover read permissions and ADMIN-only mutations.

---

## Task 7: Create Consultation CRUD and Ownership Rules

**Status:** not started; begin only after Tasks 3, 4, and 6.

### Endpoints

```text
POST   /api/consultations
GET    /api/consultations                 # ADMIN only, paginated
GET    /api/consultations/{id}
GET    /api/consultations/mine            # current DOCTOR or linked PATIENT only
PATCH  /api/consultations/{id}/transcript
PATCH  /api/consultations/{id}/status
DELETE /api/consultations/{id}             # ADMIN, or prefer CANCELLED status
```

### Core service rules

- An ADMIN may create for any valid patient/clinician/clinic.
- A DOCTOR may create only consultations where the clinician is the current authenticated doctor account and linked doctor profile. Never trust a request `clinicianId` without checking it.
- A PATIENT cannot create arbitrary consultations unless a separate booking workflow is intentionally designed.
- A DOCTOR may read/edit only consultations assigned to them.
- A PATIENT may read only consultations belonging to their linked patient profile and cannot edit transcript or status.
- The service checks ownership before it returns a detail record, not only in controller annotations.
- Status transitions are explicit: `SCHEDULED -> IN_PROGRESS -> COMPLETED`; cancellation rules are documented and validated.

### DTO changes

- `CreateConsultationRequest` uses numeric `clinicId` and timezone-safe `scheduledAt`.
- Do not accept `clinicianId` from a DOCTOR request; set it from authentication. ADMIN may use a separate admin scheduling request if needed.
- `ConsultationResponse` exposes safe IDs, names required by UI, status, timestamps, and transcript only to authorized roles.

### Recommended request and response shapes

```json
POST /api/consultations
{
  "patientId": 42,
  "clinicId": 3,
  "scheduledAt": "2026-08-10T09:30:00Z"
}
```

For a DOCTOR request, the backend sets `clinicianId` from the authenticated user. An ADMIN-only scheduling endpoint may additionally accept a valid `clinicianId`.

```json
PATCH /api/consultations/19/status
{ "status": "IN_PROGRESS" }
```

```json
GET /api/consultations/mine?page=0&size=20&status=SCHEDULED
{
  "content": ["ConsultationResponse objects"],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1
}
```

### Scheduling and concurrency rules

- Reject a scheduled time in the past unless importing historical data through a separate admin process.
- Before creating or rescheduling, check doctor availability and overlapping active consultations using a database query in the same transaction.
- Define whether a clinic has its own operating hours before enforcing them. Do not invent a rule in the frontend.
- Only a DOCTOR/ADMIN can move `SCHEDULED` to `IN_PROGRESS`; set `startedAt` once. Only an authorized clinician/admin can complete it; set `endedAt` once.
- Prefer `CANCELLED` over DELETE for any consultation that has a transcript, symptom record, alert relation, or audit event.

### Tests to write

- A doctor cannot create a consultation assigned to another doctor.
- A patient cannot read or update a guessed consultation ID.
- Overlapping appointments are rejected with 409.
- Invalid status transitions return 400/409 according to the documented rule.
- Pagination response shape remains stable for an empty and multi-page result.

### Done when

- `/mine` cannot be used to access another user's records.
- Attempts to access another patient's or doctor's consultation return 403 or a privacy-preserving 404, consistently chosen and documented.
- List results are paginated before large data volumes.
- Tests cover ownership, status transitions, and every role.

---

## Task 8: Create Symptom Record Storage and AI Boundary

**Status:** not started; begin after Task 7.

### Goal

Store reviewed, immutable symptom-extraction results against consultations. The main Spring Boot API remains the only browser-facing health-data API.

### Endpoints

```text
POST /api/symptom-records
GET  /api/symptom-records/{id}
GET  /api/symptom-records/consultation/{consultationId}
POST /api/consultations/{id}/extract-symptoms     # later: Spring Boot -> FastAPI proxy
```

### Design

- Map PostgreSQL `JSONB` to a typed Java collection using a supported JSON mapping/converter; do not treat medical JSON as ad-hoc string concatenation.
- `SymptomItem` should include validated `name`, optional `severity`, and optional `confidence`.
- A symptom record retains `modelName`, `promptVersion`, source consultation, and creation timestamp.
- New extraction results create a new immutable record. They do not overwrite the previous result.
- Only assigned DOCTOR/ADMIN may create/view full records; PATIENT visibility is a separate privacy decision and must be explicitly limited.
- The extraction endpoint validates access to the consultation, applies a timeout, handles FastAPI failures as a safe 502/503 response, and never leaks AI-service credentials to the browser.

### Extraction workflow

```text
Authorized doctor requests extraction
  -> Spring Boot verifies consultation ownership and non-empty transcript
  -> Spring Boot sends the minimum required transcript payload to FastAPI
  -> FastAPI returns structured candidate symptoms
  -> Spring Boot returns candidates for clinician review
  -> Clinician explicitly saves an immutable SymptomRecord
```

Do not automatically treat an AI output as a diagnosis or silently create a clinical record without clinician review.

### Implementation checklist

- [ ] Add a JSONB converter/type mapping and validate the structured payload before persistence.
- [ ] Define an enum/validation set for severity values instead of free text.
- [ ] Put FastAPI base URL and timeouts in environment-backed configuration.
- [ ] Use an HTTP client with connect/read timeouts and map upstream failures to a safe API error.
- [ ] Record model name, prompt version, source timestamp, and reviewer identity in each saved record.
- [ ] Keep a manual-create/review path so the application remains demonstrable when FastAPI is down.

### Tests to write

- Empty transcript is rejected before calling FastAPI.
- A doctor assigned to another consultation cannot extract or read its symptoms.
- Invalid JSONB payload is rejected with 400.
- FastAPI timeout produces a safe 503 response without exposing URL/secrets.

### Done when

- A valid, reviewed symptom record is linked to one consultation.
- Unauthorized users cannot read extraction data.
- The FastAPI integration can be switched off while manual/mock demo data remains clearly identified.

---

## Task 9: Create Alert Backend and Analytics Contract

**Status:** not started; begin after clinic and symptom data are stable.

### Endpoints

```text
GET   /api/alerts                    # ADMIN/DOCTOR, paginated and filterable
GET   /api/alerts/{id}               # ADMIN/DOCTOR
GET   /api/alerts/clinic/{clinicId}  # ADMIN/DOCTOR
PATCH /api/alerts/{id}/status        # ADMIN/DOCTOR
```

### Rules

- Alert clinic references are numeric foreign keys from Task 3.
- Allowed statuses are `OPEN`, `ACKNOWLEDGED`, `DISMISSED`, and `RESOLVED`.
- Validate status transitions and return 409 if concurrent updates require a version check.
- PATIENT is always forbidden.
- Record actor, old status, new status, and timestamp in an audit trail when an alert changes.

### Analytics boundary

The alert CRUD API does not itself need to calculate outbreak scores in its first version. Keep score generation behind a separate analytics job/service with a documented input window and threshold policy. It creates/updates alert records; the REST controller only lists and changes their review status.

### Implementation checklist

- [ ] Create `AlertStatus` enum and `Alert` entity with `@Version` for optimistic locking.
- [ ] Add repository queries/specifications for optional status, clinic, symptom, time-window, page, and size filters.
- [ ] Validate patch requests against allowed transitions, for example `OPEN -> ACKNOWLEDGED -> RESOLVED` or `OPEN -> DISMISSED`.
- [ ] Add an `audit_event` table or a narrowly scoped alert-status history table before enabling status changes.
- [ ] Return 409 for an outdated `@Version` update so the UI can refresh instead of overwriting another clinician's decision.

### Tests to write

- A PATIENT gets 403 for every alert route.
- Filters combine correctly and pagination is stable.
- Two concurrent status updates result in one success and one 409.
- A status update writes an audit event.

### Done when

- Alert queries support status, clinic, symptom, page, and size filters.
- The response contains observed count, baseline, score, threshold, time window, and status.
- Tests prove PATIENT cannot access alerts.

---

## Task 10: Add LiveKit Token Issuance

**Status:** V2; begin only after consultation membership checks are tested.

### Endpoint

```text
POST /api/livekit/rooms/{consultationId}/token
```

### Rules

- The backend verifies that the caller is the assigned DOCTOR or linked PATIENT for the consultation.
- The server, never the browser, holds LiveKit API key and secret.
- Return only a short-lived room token, URL, room name, and expiry time.
- Use a deterministic, non-sensitive room name based on the consultation ID; do not include NHS numbers or names.
- Audit token issuance and deny expired/cancelled consultations according to the status policy.

### Response contract

```json
{
  "token": "short-lived-livekit-token",
  "url": "wss://livekit.example.test",
  "roomName": "consultation-19",
  "expiresAt": "2026-08-10T09:45:00Z"
}
```

The response never contains a LiveKit API key, API secret, patient name, NHS number, or transcript.

### Tests to write

- Assigned doctor and linked patient receive a token for their own consultation.
- ADMIN access is an explicit policy decision; do not grant it by accident.
- Guessed or cancelled consultation IDs return the documented 403/404 response.
- Token expiry is short and its room/identity grants match only the requested consultation.

### Done when

- A non-participant cannot obtain a token even if they guess a consultation ID.
- LiveKit secrets are absent from the frontend build, logs, and API error messages.

---

## Task 11: Testing, Migrations, and API Documentation

**Status:** continuous; do not leave this to the end.

### Testing layers

- Unit tests: services, duplicate logic, state transitions, mapping, and ownership.
- Repository tests: custom queries, pagination, and database constraints.
- Controller/security tests: 401, 403, 404, 409, validation 400, and successful role flows.
- Integration tests: PostgreSQL-backed migration/seed verification, JWT filter, refresh-cookie behaviour, and CORS.

### Suggested test layout

```text
src/test/java/.../service/
  AppUserServiceTest
  PatientServiceTest
  DoctorServiceTest
  ConsultationServiceTest
  SymptomRecordServiceTest
  AlertServiceTest

src/test/java/.../controller/
  AuthControllerTest
  PatientControllerSecurityTest
  DoctorControllerSecurityTest
  ConsultationControllerSecurityTest
  AlertControllerSecurityTest

src/test/java/.../integration/
  PostgreSqlMigrationIntegrationTest
  JwtAndRefreshIntegrationTest
  CorsIntegrationTest
```

**Stretch:** use Testcontainers PostgreSQL so tests validate PostgreSQL features such as JSONB, constraints, timestamps, and migrations rather than relying only on an in-memory database with different behaviour. For the core project, focused service tests plus a manual PostgreSQL smoke test are acceptable.

### Verification commands

```bash
./mvnw -q -DskipTests compile
./mvnw -q test
docker compose up -d postgres
psql -h localhost -p 55432 -U telehealth -d telehealth
```

In addition to automated tests, keep a small documented API smoke-test collection with login, refresh, one allowed request, one forbidden request, one validation failure, and one ownership failure.

### Documentation

- **Should build:** publish OpenAPI/Swagger documentation for every public endpoint, request, response, role, error, and pagination shape. At minimum, keep a concise Markdown/Postman API guide for the frontend.
- Keep `docs/frontend-spec.md` synchronized with actual endpoint contracts; do not mark an API ready until tests exist.
- Document local environment variables without committing secrets: database, JWT signing key, FastAPI URL, LiveKit credentials, and allowed CORS origins.

### Done when

- CI-equivalent `./mvnw -q test` passes with a fresh database.
- Migrations are repeatable on an empty database.
- The frontend implementer can integrate from OpenAPI examples without guessing fields or permissions.

## Milestone Checkpoints

### Milestone A: Secure existing CRUD

The **core portions** of Tasks 1, 2, 4, and 5 are complete. The SPA can sign in and safely use existing User, Doctor, and Patient APIs. This is the first point where live frontend integration should replace local mocks for those resources.

### Milestone B: Scheduling core

Tasks 3, 6, and 7 complete. Clinics and consultations have correct foreign keys, ownership, status, timestamps, pagination, and tests. The doctor and patient consultation views can become live.

### Milestone C: AI and analytics

Tasks 8 and 9 complete. Reviewed symptom records, safe FastAPI proxying, alert monitoring, and status audit history are live. The frontend may replace clearly labelled mock extraction/alert data.

### Milestone D: Video consultation

Task 10 complete. LiveKit token issuance is membership-checked, short-lived, audited, and free of browser-exposed secrets.

---

## Advanced Reference Build Order

```text
1. Stabilize errors and validation contracts
2. Finish AppUser integrity and admin safety
3. Repair patient/clinic/consultation data model and migration path
4. Build JWT authentication, /me, refresh, JSON 401/403, and restricted CORS
5. Verify existing Patient/Doctor/User RBAC with tests
6. Build Clinic CRUD
7. Build Consultation CRUD, ownership checks, pagination, and state transitions
8. Build symptom-record storage and the protected AI proxy boundary
9. Build alert APIs and audit trail
10. Add LiveKit token issuance
11. Expand tests, OpenAPI, migrations, and integration documentation continuously
```

This order is deliberate: secure identity and correct relationships must exist before the system offers patient self-service, consultations, AI, or video. Those features otherwise become difficult to secure retroactively.
