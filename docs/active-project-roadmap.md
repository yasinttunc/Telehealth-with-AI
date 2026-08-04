# Telehealth With AI - Remaining Backend Roadmap

**Scope:** Spring Boot, Spring Security, JPA, PostgreSQL, DTOs, API behaviour, and
backend tests only.
**Audience:** Postgraduate project developer.
**Starting point:** Complete each phase in order and run the stated tests before moving
to the next phase.

---

## 1. Backend Architecture Rules

```text
HTTP request
  -> Controller: route, @Valid, status code
  -> Service: business rule, ownership, transaction
  -> Repository: JPA query
  -> PostgreSQL
  -> Response DTO: safe JSON only
```

### Package responsibilities

| Package | Responsibility |
|---|---|
| `controller` | Defines HTTP routes and receives validated DTOs. Keep it thin. |
| `dto.request` | Accepts only editable input. Never accept JPA entities here. |
| `dto.response` | Returns safe JSON. Never expose password hashes. |
| `service` | Holds transactions, business rules, account/profile integrity, and ownership checks. |
| `repository` | Contains data queries only. |
| `model` | JPA entities and database enums. |
| `security` | JWT authentication, authorization configuration, and security error JSON. |
| `exception` | Provides one predictable error response format. |

### Rules to preserve throughout all phases

1. A controller never decides whether a user owns a consultation; the service does.
2. A request never provides a password hash, role-derived permission, or a status that
   the service must own.
3. `AppUser` is the login identity. `Doctor` and `Patient` are one-to-one profiles.
4. A Doctor profile link uses `app_user_id`; a consultation clinician reference uses
   the Doctor account's `AppUser.userId`.
5. Return DTOs from every public route. Do not return a JPA entity directly.
6. A user archive disables the account instead of deleting clinical history.
7. Backend authorization must work even when a caller sends a handcrafted HTTP request.

### Standard verification commands

```bash
./mvnw -q test
git diff --check
```

---

# Phase 7 - API Contract And Error Consistency

**Goal:** Every backend route accepts a clear request shape, returns safe response
data, and reports errors in one predictable JSON format.

## Task 7.1 - Standardise API error responses

### Why this matters

The same category of error should not sometimes look like a raw Java exception and
sometimes like a structured validation response. A stable error contract makes routes
easier to test and explain.

### Target error JSON

```json
{
  "status": 400,
  "message": "Validation failed",
  "path": "/api/consultations",
  "fieldErrors": {
    "scheduledAt": "Scheduled time must be in the future"
  }
}
```

`fieldErrors` is optional. Use it only when the error can be attached to a specific
request field. Authorization and ownership errors are normally message-only errors.

### Files to inspect

```text
src/main/java/com/project/ibm/telehealth_with_ai/exception/ErrorResponse.java
src/main/java/com/project/ibm/telehealth_with_ai/exception/GlobalExceptionHandler.java
src/main/java/com/project/ibm/telehealth_with_ai/exception/*.java
```

### Step-by-step implementation

1. Confirm `ErrorResponse` contains `status`, `message`, `path`, and optional
   `fieldErrors`.
2. Keep one handler for each known domain exception:
   `ResourceNotFoundException`, `DuplicateResourceException`, `BadRequestException`,
   and `AccessDeniedException`.
3. Keep the `MethodArgumentNotValidException` handler. It maps `@Valid` DTO failures
   into `fieldErrors`.
4. Add a final unexpected-exception handler only if it returns a generic message and
   does not disclose SQL, file paths, tokens, or stack traces.
5. Test a validation failure, duplicate value, missing resource, and access denial.

### Code - `ErrorResponse.java`

```java
package com.project.ibm.telehealth_with_ai.exception;

import java.util.Map;

public class ErrorResponse {
    private final int status;
    private final String message;
    private final String path;
    private final Map<String, String> fieldErrors;

    public ErrorResponse(int status, String message, String path) {
        this(status, message, path, null);
    }

    public ErrorResponse(
            int status,
            String message,
            String path,
            Map<String, String> fieldErrors
    ) {
        this.status = status;
        this.message = message;
        this.path = path;
        this.fieldErrors = fieldErrors;
    }

    public int getStatus() { return status; }
    public String getMessage() { return message; }
    public String getPath() { return path; }
    public Map<String, String> getFieldErrors() { return fieldErrors; }
}
```

### Code - validation handler

Add or retain this in `GlobalExceptionHandler.java`:

```java
@ExceptionHandler(MethodArgumentNotValidException.class)
@ResponseStatus(HttpStatus.BAD_REQUEST)
public ErrorResponse handleValidation(
        MethodArgumentNotValidException exception,
        HttpServletRequest request
) {
    Map<String, String> fieldErrors = exception.getBindingResult()
            .getFieldErrors()
            .stream()
            .collect(Collectors.toMap(
                    FieldError::getField,
                    DefaultMessageSourceResolvable::getDefaultMessage,
                    (first, ignored) -> first,
                    LinkedHashMap::new
            ));

    return new ErrorResponse(
            HttpStatus.BAD_REQUEST.value(),
            "Validation failed",
            request.getRequestURI(),
            fieldErrors
    );
}
```

The map key comes from the Java DTO field name. For example, an annotation on
`scheduledAt` produces `"scheduledAt"` as the key.

### Done when

- [ ] Invalid DTO input returns 400 and a field error map.
- [ ] Missing resource returns 404 with safe JSON.
- [ ] Duplicate account/profile data returns 409 with safe JSON.
- [ ] Access denial returns 403 with safe JSON.
- [ ] No route leaks a stack trace or password hash.

## Task 7.2 - Audit request and response DTOs

### What to audit

Read each controller alongside its request and response DTOs. Make a short table in
the README after the audit.

| Resource | Create request | Response | Important backend rule |
|---|---|---|---|
| User | `RegisterRequest` | `AppUserResponse` | Standalone create is ADMIN only. |
| Doctor | `CreateDoctorRequest` | `DoctorResponse` | Service creates linked DOCTOR account. |
| Patient | `CreatePatientRequest` | `PatientResponse` | Service creates linked PATIENT account. |
| Clinic | `CreateClinicRequest` | `ClinicResponse` | Name/address validated. |
| Consultation | `CreateConsultationRequest` | `ConsultationResponse` | Service sets `SCHEDULED`. |
| Alert | `UpdateAlertStatusRequest` | `AlertResponse` | Request may change status only. |

### DTO rules

1. Password appears only in create/reset request DTOs.
2. `AppUserResponse` never exposes `password`.
3. Consultation creation accepts IDs and `scheduledAt`, not `status`, transcript,
   `startedAt`, or `endedAt`.
4. Alert update accepts `status` only, not score, threshold, or symptom data.
5. Response DTOs use `Instant` for timestamp fields and `LocalDate` for date-only
   fields such as date of birth.

### Code - consultation request DTO

```java
package com.project.ibm.telehealth_with_ai.dto.request;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

public class CreateConsultationRequest {
    @NotNull(message = "Patient ID is required")
    private Long patientId;

    @NotNull(message = "Clinician user ID is required")
    private Long clinicianId;

    @NotNull(message = "Clinic ID is required")
    private Long clinicId;

    @NotNull(message = "Scheduled time is required")
    @Future(message = "Scheduled time must be in the future")
    private Instant scheduledAt;

    // Standard getters and setters.
}
```

### Code - safe account response DTO

```java
public class AppUserResponse {
    private Long userId;
    private String username;
    private String email;
    private String role;
    private boolean enabled;
    private Instant createdAt;

    // Standard getters and setters. No password field belongs here.
}
```

### Common mistakes

- Accepting an entity with `@RequestBody` because it looks shorter.
- Adding a `role` field to Doctor/Patient create requests.
- Returning a response DTO that contains a password hash by accident.
- Confusing `Doctor.doctorId` with the linked `AppUser.userId` in a consultation.

---

# Phase 8 - Consultation Business Rules

**Goal:** A consultation is valid only when all linked records exist, the chosen
clinician is a Doctor account, the time is sensible, and the current user is allowed
to perform the action.

## Task 8.1 - Keep creation and ownership checks in `ConsultationService`

### Required service rules

1. Load Patient, AppUser clinician, and Clinic by ID. Missing records return 404.
2. Reject a clinician whose `AppUser.role` is not `DOCTOR`.
3. Reject a past timestamp even if a caller bypasses DTO validation.
4. A Doctor may create a consultation only where `clinicianId` equals the authenticated
   Doctor's `userId`.
5. The service, not the request, sets new status to `SCHEDULED`.
6. Map the saved entity to `ConsultationResponse`.

### Code - protected create method

```java
public ConsultationResponse createConsultation(CreateConsultationRequest request) {
    Patient patient = patientRepository.findById(request.getPatientId())
            .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));

    AppUser clinician = appUserRepository.findById(request.getClinicianId())
            .orElseThrow(() -> new ResourceNotFoundException("Clinician not found"));

    if (clinician.getRole() != AppUser.Role.DOCTOR) {
        throw new BadRequestException("Selected user must have the DOCTOR role");
    }

    if (!request.getScheduledAt().isAfter(Instant.now())) {
        throw new BadRequestException("Scheduled time must be in the future");
    }

    AppUser currentUser = getCurrentUser();
    if (currentUser.getRole() == AppUser.Role.DOCTOR
            && !clinician.getUserId().equals(currentUser.getUserId())) {
        throw new AccessDeniedException(
                "Doctors can create consultations only for themselves"
        );
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

### Test cases

- [ ] Admin can create a future consultation.
- [ ] A Doctor can create one assigned to themself.
- [ ] A Doctor receives 403 when using another Doctor's `userId`.
- [ ] Patient receives 403 from the create route.
- [ ] Patient/Clinic/Clinician missing ID returns 404.
- [ ] A Patient account used as clinician returns 400.
- [ ] A past date returns 400.

## Task 8.2 - Enforce a consultation status state machine

### Status rules

```text
SCHEDULED   -> IN_PROGRESS, COMPLETED, CANCELLED
IN_PROGRESS -> COMPLETED, CANCELLED
COMPLETED   -> no next status
CANCELLED   -> no next status
```

Completion does not happen merely because `scheduledAt` is in the past. A past
scheduled appointment remains `SCHEDULED`; it is a different fact from completion.

### Code - state transition helper

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

### Code - status update method

```java
public ConsultationResponse updateStatus(
        Long consultationId,
        UpdateConsultationStatusRequest request
) {
    Consultation consultation = findConsultation(consultationId);
    assertCanManage(consultation, getCurrentUser());

    if (!isAllowedTransition(consultation.getStatus(), request.getStatus())) {
        throw new BadRequestException(
                "Status transition from " + consultation.getStatus()
                        + " to " + request.getStatus() + " is not allowed"
        );
    }

    consultation.setStatus(request.getStatus());
    return toResponse(consultationRepository.save(consultation));
}
```

### Done when

- [ ] An assigned Doctor/Admin may follow a legal transition.
- [ ] An unassigned Doctor receives 403.
- [ ] A terminal state cannot be reopened.
- [ ] A failed transition leaves the stored status unchanged.

## Task 8.3 - Keep read and manage ownership separate

### Rule

| Role | Read consultation | Manage status/transcript |
|---|---|---|
| ADMIN | Any | Any |
| DOCTOR | Only assigned clinician | Only assigned clinician |
| PATIENT | Only linked Patient profile | Never |

### Code - read rule

```java
private void assertCanRead(Consultation consultation, AppUser currentUser) {
    if (currentUser.getRole() == AppUser.Role.ADMIN) return;

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

### Code - manage rule

```java
private void assertCanManage(Consultation consultation, AppUser currentUser) {
    if (currentUser.getRole() == AppUser.Role.ADMIN) return;

    if (currentUser.getRole() == AppUser.Role.DOCTOR
            && consultation.getClinician().getUserId().equals(currentUser.getUserId())) {
        return;
    }

    throw new AccessDeniedException("You are not allowed to manage this consultation");
}
```

Do not merge these methods. Patients may read their own consultation but must not gain
the ability to update a transcript merely because they pass a read check.

---

# Phase 9 - Alert And Symptom Backend Rules

**Goal:** The mock symptom workflow remains immutable and alerts follow an enforceable
staff-review process.

## Task 9.1 - Enforce legal alert transitions

### Alert state machine

```text
OPEN         -> ACKNOWLEDGED, DISMISSED
ACKNOWLEDGED -> RESOLVED, DISMISSED
RESOLVED     -> no next status
DISMISSED    -> no next status
```

### Code - `AlertService` transition guard

```java
private boolean isAllowedTransition(AlertStatus current, AlertStatus next) {
    return switch (current) {
        case OPEN -> next == AlertStatus.ACKNOWLEDGED || next == AlertStatus.DISMISSED;
        case ACKNOWLEDGED -> next == AlertStatus.RESOLVED || next == AlertStatus.DISMISSED;
        case RESOLVED, DISMISSED -> false;
    };
}

public AlertResponse updateStatus(Long alertId, UpdateAlertStatusRequest request) {
    Alert alert = alertRepository.findById(alertId)
            .orElseThrow(() -> new ResourceNotFoundException("Alert not found: " + alertId));

    if (!isAllowedTransition(alert.getStatus(), request.getStatus())) {
        throw new BadRequestException(
                "Alert transition from " + alert.getStatus()
                        + " to " + request.getStatus() + " is not allowed"
        );
    }

    alert.setStatus(request.getStatus());
    return toResponse(alertRepository.save(alert));
}
```

### Code - status-only request DTO

```java
public class UpdateAlertStatusRequest {
    @NotNull(message = "Alert status is required")
    private AlertStatus status;

    public AlertStatus getStatus() { return status; }
    public void setStatus(AlertStatus status) { this.status = status; }
}
```

### Test matrix

| Current | Requested | Expected |
|---|---|---:|
| OPEN | ACKNOWLEDGED | 200 |
| OPEN | RESOLVED | 400 |
| ACKNOWLEDGED | RESOLVED | 200 |
| RESOLVED | OPEN | 400 |
| PATIENT token | Any update | 403 |

## Task 9.2 - Keep symptom records append-only and authorised

### Design decision

A symptom record is a snapshot of mock extraction at a point in time. It is not a
diagnosis and must not be overwritten. A later extraction creates a new record.

### Required route policy

| Operation | Allowed role |
|---|---|
| Extract from consultation | ADMIN or assigned DOCTOR |
| Read records for consultation | ADMIN or assigned DOCTOR |
| Edit/delete a record | No route |

### Code - service structure

```java
public SymptomRecordResponse extractFromConsultation(Long consultationId) {
    Consultation consultation = consultationRepository.findById(consultationId)
            .orElseThrow(() -> new ResourceNotFoundException("Consultation not found"));

    consultationAuthorizationService.assertCanManage(consultation);

    String transcript = consultation.getTranscript();
    if (transcript == null || transcript.isBlank()) {
        throw new BadRequestException("Save a transcript before extracting symptoms");
    }

    SymptomRecord record = new SymptomRecord();
    record.setConsultation(consultation);
    record.setModelName("mock-rule-extractor");
    record.setPromptVersion("v1");
    record.setSymptoms(mockExtractor.extract(transcript));

    return toResponse(symptomRecordRepository.save(record));
}
```

`consultationAuthorizationService` can be a small extracted component, or the same
ownership method can remain in `ConsultationService` and be reused deliberately. Do
not copy authorization logic into multiple services without tests.

### Repository method

```java
List<SymptomRecord> findByConsultationConsultationIdOrderByCreatedAtDesc(Long consultationId);
```

### Done when

- [ ] Extraction without transcript returns 400.
- [ ] An assigned Doctor can create a record.
- [ ] An unassigned Doctor receives 403.
- [ ] Repeated extraction adds a second record rather than overwriting the first.
- [ ] There is no update/delete controller method.

---

# Phase 10 - Security And Data-Minimisation Decisions

**Goal:** JWT authentication, role checks, profile links, and sensitive data decisions
are explicit and testable.

## Task 10.1 - Verify JWT security boundaries

### Required configuration properties

```properties
app.jwt.secret=${JWT_SECRET:change-this-local-demo-secret-to-a-long-random-value-32-bytes-minimum}
app.jwt.expiration-ms=${JWT_EXPIRATION_MS:3600000}
```

Use a strong local environment value for `JWT_SECRET` before demonstrating the system.
The fallback is only for local student setup, not a secret to publish.

### Security expectations

| Situation | HTTP status |
|---|---:|
| No token on protected route | 401 |
| Invalid/expired token | 401 |
| Valid token, wrong role | 403 |
| Valid token, no ownership | 403 |
| Valid Admin/assigned Doctor action | 200/201/204 as appropriate |

### Code - protected security chain shape

```java
return http
        .csrf(csrf -> csrf.disable())
        .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .cors(Customizer.withDefaults())
        .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint(authenticationEntryPoint)
                .accessDeniedHandler(accessDeniedHandler))
        .authorizeHttpRequests(authorize -> authorize
                .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                .requestMatchers("/error").permitAll()
                .anyRequest().authenticated())
        .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
        .build();
```

Method-level `@PreAuthorize` rules remain necessary because route authentication alone
does not distinguish Admin, Doctor, and Patient operations.

## Task 10.2 - Keep account/profile lifecycle consistent

### Rules

1. Create Doctor through `DoctorService`; it creates a linked DOCTOR `AppUser`.
2. Create Patient through `PatientService`; it creates a linked PATIENT `AppUser`.
3. Reject changing a linked account's role.
4. Archive a profile/account by setting linked `AppUser.enabled = false`.
5. Preserve profile, consultation, symptom, and alert history.

### Code - linked-role guard in `AppUserService`

```java
AppUser.Role requestedRole = parseRole(request.getRole());
boolean hasRoleProfile = doctorRepository.existsByAppUserUserId(id)
        || patientRepository.existsByAppUserUserId(id);

if (hasRoleProfile && user.getRole() != requestedRole) {
    throw new BadRequestException(
            "Role cannot be changed while this account is linked to a doctor or patient profile"
    );
}
```

### Code - archive rather than delete

```java
public void deleteUser(Long id) {
    AppUser user = appUserRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

    user.setEnabled(false);
    appUserRepository.save(user);
}
```

The endpoint may still use `DELETE` for student-project simplicity, but document that
the backend operation is archive/disable, not physical deletion.

## Task 10.3 - Choose a patient-directory data policy

### Recommended scope decision

Keep the simple staff-directory policy unless the marking rubric requires stronger
data minimisation. If stricter handling is required, remove NHS number from a
Doctor-specific response DTO at the backend, not merely from a display layer.

### Code - stricter Doctor directory DTO

```java
public class PatientDirectoryResponse {
    private Long patientId;
    private String firstName;
    private String lastName;
    private LocalDate dateOfBirth;

    // getters and setters; intentionally no NHS number
}
```

### Code - stricter Doctor directory route

```java
@GetMapping("/directory")
@PreAuthorize("hasRole('DOCTOR')")
public List<PatientDirectoryResponse> getDoctorDirectory() {
    return patientService.getDoctorDirectory();
}
```

Add this route only if you choose the stricter policy. Do not overbuild clinical
privacy functionality beyond the final-project scope.

---

# Phase 11 - Backend Proof And Submission Readiness

**Goal:** Demonstrate important backend behaviour with focused integration tests,
seed checks, and concise API documentation.

## Task 11.1 - Add focused integration tests

### Test set

| Test | Proves |
|---|---|
| Login success/failure | Auth service and JWT response work. |
| Missing token | Protected route returns 401. |
| Wrong role | Patient cannot call Admin route. |
| Patient ownership | Patient cannot read another consultation. |
| Doctor ownership | Doctor cannot update another Doctor's consultation. |
| Linked role change | Role mutation is rejected. |
| Archive | Disabled account cannot authenticate. |
| Alert transition | Illegal transition is rejected and unchanged. |

### Code - Spring Boot 4 MockMvc test class

```java
@SpringBootTest
@AutoConfigureMockMvc
class ApiSecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void protectedRouteWithoutTokenReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/patients"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void patientCannotReadAdminPatientDirectory() throws Exception {
        String token = TestAuthHelper.bearerToken(
                mockMvc,
                objectMapper,
                "patient.oliver.hughes",
                "password"
        );

        mockMvc.perform(get("/api/patients")
                        .header("Authorization", token))
                .andExpect(status().isForbidden());
    }
}
```

For Spring Boot 4, import:

```java
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
```

### Test rule

Use known seed records or create a minimal dedicated test dataset. Do not assume that
the first database row always represents a specific role or relationship.

## Task 11.2 - Validate PostgreSQL seed integrity

### SQL checks

Run these against the local project database after seed changes:

```sql
-- Every linked Patient account must really be a PATIENT.
SELECT p.patient_id, p.app_user_id
FROM patient p
LEFT JOIN app_user u ON u.user_id = p.app_user_id
WHERE p.app_user_id IS NULL OR u.role <> 'PATIENT';

-- Every linked Doctor account must really be a DOCTOR.
SELECT d.doctor_id, d.app_user_id
FROM doctor d
LEFT JOIN app_user u ON u.user_id = d.app_user_id
WHERE d.app_user_id IS NULL OR u.role <> 'DOCTOR';

-- Consultations must reference real relationships.
SELECT c.consultation_id
FROM consultation c
LEFT JOIN patient p ON p.patient_id = c.patient_id
LEFT JOIN app_user u ON u.user_id = c.clinician_id
LEFT JOIN clinic cl ON cl.clinic_id = c.clinic_id
WHERE p.patient_id IS NULL OR u.role <> 'DOCTOR' OR cl.clinic_id IS NULL;
```

Each query should return zero rows. If it returns data, repair seed relationships
before adding more application code.

## Task 11.3 - Maintain backend API reference and final explanation

### Minimum README table

| Route | Roles | Notes |
|---|---|---|
| `POST /api/auth/login` | Public | Returns JWT and safe identity data. |
| `/api/users` | Admin | Standalone Admin accounts; archive instead of hard delete. |
| `/api/doctors` | Signed-in read, Admin write | Creates/updates linked account and profile. |
| `/api/patients` | Staff read, Admin write | Creates/updates linked account and profile. |
| `/api/consultations` | Role/ownership based | `mine` derives ownership from JWT. |
| symptom record routes | Admin/assigned Doctor | Immutable mock extraction snapshots. |
| `/api/alerts` | Staff | Legal state transitions only. |

### Explain the backend in 30 seconds

> Spring Boot exposes validated DTO-based APIs. PostgreSQL stores linked account and
> profile data. JWT authenticates requests, while service methods enforce role and
> ownership rules. Consultation and alert statuses use explicit state transitions. The
> symptom workflow is a clearly labelled mock extraction snapshot, not a diagnosis.

### Final backend definition of done

- [ ] Every protected route returns 401 or 403 correctly.
- [ ] Account/profile links are valid in seed data.
- [ ] Consultation create/read/manage rules are enforced in the service.
- [ ] Alert transitions are enforced in `AlertService`.
- [ ] Symptom records are append-only and ownership-checked.
- [ ] Error JSON is consistent and safe.
- [ ] Focused integration tests pass.
- [ ] `./mvnw -q test` passes.
