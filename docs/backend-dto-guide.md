# Backend DTO Guide

This guide explains how to design and use DTOs for the AI-Integrated Telehealth backend.

DTO means **Data Transfer Object**. A DTO is the object your API receives or returns. It is separate from your database entity.

In a Spring Boot backend, the clean pattern is:

```text
Controller -> DTO -> Service -> Entity -> Repository -> Database
```

And when returning data:

```text
Database -> Entity -> Service -> DTO -> Controller -> JSON response
```

## Why DTOs Matter

Do not expose JPA entities directly from controllers.

Bad pattern:

```java
@GetMapping("/{id}")
public Patient getPatient(@PathVariable Long id) {
    return patientRepository.findById(id).orElse(null);
}
```

Why this is bad:

- It exposes your database structure directly.
- It may leak fields you do not want to return, such as passwords.
- It makes future database changes break your API.
- It can cause lazy-loading JSON problems.
- It mixes API design with persistence design.

Better pattern:

```java
@GetMapping("/{id}")
public PatientResponse getPatient(@PathVariable Long id) {
    return patientService.getPatientById(id);
}
```

Here, the controller returns a DTO, not the entity.

## Recommended DTO Package Structure

Create:

```text
src/main/java/com/project/ibm/telehealth_with_ai/dto/
  request/
  response/
```

Use:

```text
request/   classes received from the client
response/  classes returned to the client
```

Example:

```text
dto/request/CreatePatientRequest.java
dto/request/UpdatePatientRequest.java
dto/response/PatientResponse.java
```

## Naming Rules

Use clear names:

```text
CreateXRequest
UpdateXRequest
XResponse
```

Examples:

```text
CreatePatientRequest
UpdatePatientRequest
PatientResponse

CreateDoctorRequest
UpdateDoctorRequest
DoctorResponse

CreateClinicRequest
UpdateClinicRequest
ClinicResponse
```

Avoid names like:

```text
PatientDTO
PatientData
PatientModel
PatientObject
```

Those names become vague quickly.

## Validation

DTOs are where request validation should begin.

Use annotations from:

```java
jakarta.validation.constraints.*;
```

Common annotations:

```text
@NotBlank   String must not be null or empty after trimming
@NotNull    Value must exist
@Email      Must be valid email format
@Size       String/list size constraints
@Past       Date must be in the past
@Future     Date/time must be in the future
@Min        Minimum number
@Max        Maximum number
```

Example:

```java
public class CreatePatientRequest {

    @NotBlank
    @Size(min = 10, max = 10)
    private String nhsNumber;

    @NotBlank
    private String firstName;

    @NotBlank
    private String lastName;

    @NotNull
    @Past
    private LocalDate dateOfBirth;
}
```

In the controller, use `@Valid`:

```java
@PostMapping
public PatientResponse createPatient(@Valid @RequestBody CreatePatientRequest request) {
    return patientService.createPatient(request);
}
```

Without `@Valid`, the validation annotations will not run.

## DTOs vs Entities

Entity:

```java
@Entity
public class AppUser {
    private Long userId;
    private String username;
    private String email;
    private String password;
    private Role role;
}
```

Response DTO:

```java
public class AppUserResponse {
    private Long userId;
    private String username;
    private String email;
    private String role;
}
```

Notice that the response DTO does **not** include password.

This is the key rule:

```text
Entities are for persistence.
DTOs are for API input/output.
```

## Auth DTOs

Authentication DTOs should live in:

```text
dto/request/
dto/response/
```

### RegisterRequest

Use this when creating a new login account.

Path:

```text
src/main/java/com/project/ibm/telehealth_with_ai/dto/request/RegisterRequest.java
```

```java
package com.project.ibm.telehealth_with_ai.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class RegisterRequest {

    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    private String username;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 100, message = "Password must be between 8 and 100 characters")
    private String password;

    @NotNull(message = "Role is required")
    private String role;

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }
}
```

Teaching notes:

- `password` is allowed in a request DTO.
- `password` should never be returned in a response DTO.
- `role` is a string here for easier JSON input, but the service should convert it into `AppUser.Role`.
- Later, you may decide that only admins can register doctors/admins.

Example JSON:

```json
{
  "username": "patient.john",
  "email": "john@example.com",
  "password": "StrongPass123",
  "role": "PATIENT"
}
```

### LoginRequest

Path:

```text
src/main/java/com/project/ibm/telehealth_with_ai/dto/request/LoginRequest.java
```

```java
package com.project.ibm.telehealth_with_ai.dto.request;

import jakarta.validation.constraints.NotBlank;

public class LoginRequest {

    @NotBlank(message = "Username or email is required")
    private String username;

    @NotBlank(message = "Password is required")
    private String password;

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
```

Teaching notes:

- The field can be called `username` even if you allow email login too.
- The service can search by username or email.

Example JSON:

```json
{
  "username": "admin",
  "password": "admin"
}
```

### AuthResponse

Path:

```text
src/main/java/com/project/ibm/telehealth_with_ai/dto/response/AuthResponse.java
```

```java
package com.project.ibm.telehealth_with_ai.dto.response;

public class AuthResponse {

    private String accessToken;
    private String tokenType = "Bearer";
    private Long userId;
    private String username;
    private String email;
    private String role;

    public String getAccessToken() {
        return accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }

    public String getTokenType() {
        return tokenType;
    }

    public void setTokenType(String tokenType) {
        this.tokenType = tokenType;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }
}
```

Teaching notes:

- This is for future JWT authentication.
- Right now your app uses form login, but this DTO prepares you for API login.

Example JSON response:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1Ni...",
  "tokenType": "Bearer",
  "userId": 1,
  "username": "admin",
  "email": "admin@telehealth.local",
  "role": "ADMIN"
}
```

### AppUserResponse

Path:

```text
src/main/java/com/project/ibm/telehealth_with_ai/dto/response/AppUserResponse.java
```

```java
package com.project.ibm.telehealth_with_ai.dto.response;

import java.time.Instant;

public class AppUserResponse {

    private Long userId;
    private String username;
    private String email;
    private String role;
    private Instant createdAt;

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
```

Teaching notes:

- No password.
- No password hash.
- Safe to return from `/api/users`.

## Patient DTOs

### CreatePatientRequest

Path:

```text
src/main/java/com/project/ibm/telehealth_with_ai/dto/request/CreatePatientRequest.java
```

```java
package com.project.ibm.telehealth_with_ai.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public class CreatePatientRequest {

    @NotBlank(message = "NHS number is required")
    @Size(min = 10, max = 10, message = "NHS number must be exactly 10 characters")
    private String nhsNumber;

    @NotBlank(message = "First name is required")
    @Size(max = 100, message = "First name must be 100 characters or fewer")
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(max = 100, message = "Last name must be 100 characters or fewer")
    private String lastName;

    @NotNull(message = "Date of birth is required")
    @Past(message = "Date of birth must be in the past")
    private LocalDate dateOfBirth;

    public String getNhsNumber() {
        return nhsNumber;
    }

    public void setNhsNumber(String nhsNumber) {
        this.nhsNumber = nhsNumber;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public LocalDate getDateOfBirth() {
        return dateOfBirth;
    }

    public void setDateOfBirth(LocalDate dateOfBirth) {
        this.dateOfBirth = dateOfBirth;
    }
}
```

Example JSON:

```json
{
  "nhsNumber": "4857773456",
  "firstName": "Oliver",
  "lastName": "Hughes",
  "dateOfBirth": "1991-04-12"
}
```

### UpdatePatientRequest

Path:

```text
src/main/java/com/project/ibm/telehealth_with_ai/dto/request/UpdatePatientRequest.java
```

```java
package com.project.ibm.telehealth_with_ai.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public class UpdatePatientRequest {

    @NotBlank(message = "First name is required")
    @Size(max = 100, message = "First name must be 100 characters or fewer")
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(max = 100, message = "Last name must be 100 characters or fewer")
    private String lastName;

    @NotNull(message = "Date of birth is required")
    @Past(message = "Date of birth must be in the past")
    private LocalDate dateOfBirth;

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public LocalDate getDateOfBirth() {
        return dateOfBirth;
    }

    public void setDateOfBirth(LocalDate dateOfBirth) {
        this.dateOfBirth = dateOfBirth;
    }
}
```

Teaching notes:

- Usually you do not allow NHS number update casually.
- If NHS number must change, create a dedicated admin-only endpoint later.

### PatientResponse

Path:

```text
src/main/java/com/project/ibm/telehealth_with_ai/dto/response/PatientResponse.java
```

```java
package com.project.ibm.telehealth_with_ai.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class PatientResponse {

    private Long patientId;
    private String nhsNumber;
    private String firstName;
    private String lastName;
    private LocalDate dateOfBirth;
    private LocalDateTime createdAt;

    public Long getPatientId() {
        return patientId;
    }

    public void setPatientId(Long patientId) {
        this.patientId = patientId;
    }

    public String getNhsNumber() {
        return nhsNumber;
    }

    public void setNhsNumber(String nhsNumber) {
        this.nhsNumber = nhsNumber;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public LocalDate getDateOfBirth() {
        return dateOfBirth;
    }

    public void setDateOfBirth(LocalDate dateOfBirth) {
        this.dateOfBirth = dateOfBirth;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
```

## Doctor DTOs

Your current code uses `Doctor`. Later, you may rename it to `Clinician`. For now, these DTOs match your current project.

### CreateDoctorRequest

Path:

```text
src/main/java/com/project/ibm/telehealth_with_ai/dto/request/CreateDoctorRequest.java
```

```java
package com.project.ibm.telehealth_with_ai.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CreateDoctorRequest {

    @NotBlank(message = "First name is required")
    @Size(max = 100)
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(max = 100)
    private String lastName;

    @NotBlank(message = "Specialty is required")
    @Size(max = 100)
    private String specialty;

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getSpecialty() {
        return specialty;
    }

    public void setSpecialty(String specialty) {
        this.specialty = specialty;
    }
}
```

Example JSON:

```json
{
  "firstName": "Sarah",
  "lastName": "Patel",
  "specialty": "General Practice"
}
```

### UpdateDoctorRequest

Path:

```text
src/main/java/com/project/ibm/telehealth_with_ai/dto/request/UpdateDoctorRequest.java
```

```java
package com.project.ibm.telehealth_with_ai.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class UpdateDoctorRequest {

    @NotBlank(message = "First name is required")
    @Size(max = 100)
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(max = 100)
    private String lastName;

    @NotBlank(message = "Specialty is required")
    @Size(max = 100)
    private String specialty;

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getSpecialty() {
        return specialty;
    }

    public void setSpecialty(String specialty) {
        this.specialty = specialty;
    }
}
```

### DoctorResponse

Path:

```text
src/main/java/com/project/ibm/telehealth_with_ai/dto/response/DoctorResponse.java
```

```java
package com.project.ibm.telehealth_with_ai.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public class DoctorResponse {

    private Long doctorId;
    private String firstName;
    private String lastName;
    private String specialty;
    private List<LocalDateTime> availableTimes;
    private LocalDateTime createdAt;

    public Long getDoctorId() {
        return doctorId;
    }

    public void setDoctorId(Long doctorId) {
        this.doctorId = doctorId;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getSpecialty() {
        return specialty;
    }

    public void setSpecialty(String specialty) {
        this.specialty = specialty;
    }

    public List<LocalDateTime> getAvailableTimes() {
        return availableTimes;
    }

    public void setAvailableTimes(List<LocalDateTime> availableTimes) {
        this.availableTimes = availableTimes;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
```

Important note:

Your current `Doctor` entity has `availableTimes` but no getter/setter for it. Add these methods later if you want to include available times in responses.

## Clinic DTOs

### CreateClinicRequest

Path:

```text
src/main/java/com/project/ibm/telehealth_with_ai/dto/request/CreateClinicRequest.java
```

```java
package com.project.ibm.telehealth_with_ai.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CreateClinicRequest {

    @NotBlank(message = "Clinic name is required")
    @Size(max = 160)
    private String clinicName;

    @NotBlank(message = "Clinic address is required")
    @Size(max = 255)
    private String clinicAddress;

    public String getClinicName() {
        return clinicName;
    }

    public void setClinicName(String clinicName) {
        this.clinicName = clinicName;
    }

    public String getClinicAddress() {
        return clinicAddress;
    }

    public void setClinicAddress(String clinicAddress) {
        this.clinicAddress = clinicAddress;
    }
}
```

Example JSON:

```json
{
  "clinicName": "Swansea Central Telehealth Clinic",
  "clinicAddress": "12 Wind Street, Swansea SA1 1AA"
}
```

### UpdateClinicRequest

Path:

```text
src/main/java/com/project/ibm/telehealth_with_ai/dto/request/UpdateClinicRequest.java
```

```java
package com.project.ibm.telehealth_with_ai.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class UpdateClinicRequest {

    @NotBlank(message = "Clinic name is required")
    @Size(max = 160)
    private String clinicName;

    @NotBlank(message = "Clinic address is required")
    @Size(max = 255)
    private String clinicAddress;

    public String getClinicName() {
        return clinicName;
    }

    public void setClinicName(String clinicName) {
        this.clinicName = clinicName;
    }

    public String getClinicAddress() {
        return clinicAddress;
    }

    public void setClinicAddress(String clinicAddress) {
        this.clinicAddress = clinicAddress;
    }
}
```

### ClinicResponse

Path:

```text
src/main/java/com/project/ibm/telehealth_with_ai/dto/response/ClinicResponse.java
```

```java
package com.project.ibm.telehealth_with_ai.dto.response;

public class ClinicResponse {

    private Long clinicId;
    private String clinicName;
    private String clinicAddress;

    public Long getClinicId() {
        return clinicId;
    }

    public void setClinicId(Long clinicId) {
        this.clinicId = clinicId;
    }

    public String getClinicName() {
        return clinicName;
    }

    public void setClinicName(String clinicName) {
        this.clinicName = clinicName;
    }

    public String getClinicAddress() {
        return clinicAddress;
    }

    public void setClinicAddress(String clinicAddress) {
        this.clinicAddress = clinicAddress;
    }
}
```

## Consultation DTOs

Consultations are central to your project because transcripts and symptom extraction attach to consultations.

### CreateConsultationRequest

Path:

```text
src/main/java/com/project/ibm/telehealth_with_ai/dto/request/CreateConsultationRequest.java
```

```java
package com.project.ibm.telehealth_with_ai.dto.request;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public class CreateConsultationRequest {

    @NotNull(message = "Patient ID is required")
    private Long patientId;

    @NotNull(message = "Clinician user ID is required")
    private Long clinicianId;

    private String clinicId;

    @NotNull(message = "Consultation time is required")
    private LocalDateTime dateTime;

    public Long getPatientId() {
        return patientId;
    }

    public void setPatientId(Long patientId) {
        this.patientId = patientId;
    }

    public Long getClinicianId() {
        return clinicianId;
    }

    public void setClinicianId(Long clinicianId) {
        this.clinicianId = clinicianId;
    }

    public String getClinicId() {
        return clinicId;
    }

    public void setClinicId(String clinicId) {
        this.clinicId = clinicId;
    }

    public LocalDateTime getDateTime() {
        return dateTime;
    }

    public void setDateTime(LocalDateTime dateTime) {
        this.dateTime = dateTime;
    }
}
```

Example JSON:

```json
{
  "patientId": 1,
  "clinicianId": 2,
  "clinicId": "CLINIC-SWANSEA-CENTRAL",
  "dateTime": "2026-08-03T10:30:00"
}
```

### UpdateTranscriptRequest

Path:

```text
src/main/java/com/project/ibm/telehealth_with_ai/dto/request/UpdateTranscriptRequest.java
```

```java
package com.project.ibm.telehealth_with_ai.dto.request;

import jakarta.validation.constraints.NotBlank;

public class UpdateTranscriptRequest {

    @NotBlank(message = "Transcript is required")
    private String transcript;

    public String getTranscript() {
        return transcript;
    }

    public void setTranscript(String transcript) {
        this.transcript = transcript;
    }
}
```

Example JSON:

```json
{
  "transcript": "Patient reports fever, dry cough, and fatigue for two days. Denies chest pain."
}
```

### ConsultationResponse

Path:

```text
src/main/java/com/project/ibm/telehealth_with_ai/dto/response/ConsultationResponse.java
```

```java
package com.project.ibm.telehealth_with_ai.dto.response;

import java.time.Instant;
import java.time.LocalDateTime;

public class ConsultationResponse {

    private Long consultationId;
    private Long patientId;
    private String patientName;
    private Long clinicianId;
    private String clinicianUsername;
    private String clinicId;
    private LocalDateTime dateTime;
    private Instant startedAt;
    private Instant endedAt;
    private String transcript;

    public Long getConsultationId() {
        return consultationId;
    }

    public void setConsultationId(Long consultationId) {
        this.consultationId = consultationId;
    }

    public Long getPatientId() {
        return patientId;
    }

    public void setPatientId(Long patientId) {
        this.patientId = patientId;
    }

    public String getPatientName() {
        return patientName;
    }

    public void setPatientName(String patientName) {
        this.patientName = patientName;
    }

    public Long getClinicianId() {
        return clinicianId;
    }

    public void setClinicianId(Long clinicianId) {
        this.clinicianId = clinicianId;
    }

    public String getClinicianUsername() {
        return clinicianUsername;
    }

    public void setClinicianUsername(String clinicianUsername) {
        this.clinicianUsername = clinicianUsername;
    }

    public String getClinicId() {
        return clinicId;
    }

    public void setClinicId(String clinicId) {
        this.clinicId = clinicId;
    }

    public LocalDateTime getDateTime() {
        return dateTime;
    }

    public void setDateTime(LocalDateTime dateTime) {
        this.dateTime = dateTime;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
    }

    public Instant getEndedAt() {
        return endedAt;
    }

    public void setEndedAt(Instant endedAt) {
        this.endedAt = endedAt;
    }

    public String getTranscript() {
        return transcript;
    }

    public void setTranscript(String transcript) {
        this.transcript = transcript;
    }
}
```

Teaching notes:

- It includes IDs for linking data.
- It also includes human-readable names for frontend convenience.
- It does not include full nested `Patient` or `AppUser` objects. That keeps the response simple.

## Symptom DTOs

These are needed for the AI extraction part later.

### SymptomItem

Path:

```text
src/main/java/com/project/ibm/telehealth_with_ai/dto/response/SymptomItem.java
```

```java
package com.project.ibm.telehealth_with_ai.dto.response;

public class SymptomItem {

    private String name;
    private String assertion;
    private Double confidence;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getAssertion() {
        return assertion;
    }

    public void setAssertion(String assertion) {
        this.assertion = assertion;
    }

    public Double getConfidence() {
        return confidence;
    }

    public void setConfidence(Double confidence) {
        this.confidence = confidence;
    }
}
```

Example:

```json
{
  "name": "fever",
  "assertion": "present",
  "confidence": 0.95
}
```

Assertion values should eventually be:

```text
present
negated
uncertain
```

### ExtractionRequest

Path:

```text
src/main/java/com/project/ibm/telehealth_with_ai/dto/request/ExtractionRequest.java
```

```java
package com.project.ibm.telehealth_with_ai.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class ExtractionRequest {

    @NotNull(message = "Consultation ID is required")
    private Long consultationId;

    @NotBlank(message = "Transcript is required")
    private String transcript;

    private String promptVersion = "v1";

    public Long getConsultationId() {
        return consultationId;
    }

    public void setConsultationId(Long consultationId) {
        this.consultationId = consultationId;
    }

    public String getTranscript() {
        return transcript;
    }

    public void setTranscript(String transcript) {
        this.transcript = transcript;
    }

    public String getPromptVersion() {
        return promptVersion;
    }

    public void setPromptVersion(String promptVersion) {
        this.promptVersion = promptVersion;
    }
}
```

This is what Spring Boot can send to FastAPI later.

### SymptomRecordResponse

Path:

```text
src/main/java/com/project/ibm/telehealth_with_ai/dto/response/SymptomRecordResponse.java
```

```java
package com.project.ibm.telehealth_with_ai.dto.response;

import java.time.Instant;
import java.util.List;

public class SymptomRecordResponse {

    private Long symptomRecordId;
    private Long consultationId;
    private String modelName;
    private String promptVersion;
    private List<SymptomItem> symptoms;
    private Instant createdAt;

    public Long getSymptomRecordId() {
        return symptomRecordId;
    }

    public void setSymptomRecordId(Long symptomRecordId) {
        this.symptomRecordId = symptomRecordId;
    }

    public Long getConsultationId() {
        return consultationId;
    }

    public void setConsultationId(Long consultationId) {
        this.consultationId = consultationId;
    }

    public String getModelName() {
        return modelName;
    }

    public void setModelName(String modelName) {
        this.modelName = modelName;
    }

    public String getPromptVersion() {
        return promptVersion;
    }

    public void setPromptVersion(String promptVersion) {
        this.promptVersion = promptVersion;
    }

    public List<SymptomItem> getSymptoms() {
        return symptoms;
    }

    public void setSymptoms(List<SymptomItem> symptoms) {
        this.symptoms = symptoms;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
```

Teaching notes:

- This is response-friendly.
- It returns symptoms as a list, not raw JSON text.
- Later, your entity can store JSONB while the DTO returns typed Java objects.

## Alert DTOs

Alerts support the outbreak detection part.

### AlertResponse

Path:

```text
src/main/java/com/project/ibm/telehealth_with_ai/dto/response/AlertResponse.java
```

```java
package com.project.ibm.telehealth_with_ai.dto.response;

import java.math.BigDecimal;
import java.time.Instant;

public class AlertResponse {

    private Long alertId;
    private String clinicId;
    private String symptomName;
    private Instant windowStart;
    private Instant windowEnd;
    private Integer observedCount;
    private BigDecimal baselineCount;
    private BigDecimal score;
    private BigDecimal threshold;
    private String status;
    private Instant createdAt;

    public Long getAlertId() {
        return alertId;
    }

    public void setAlertId(Long alertId) {
        this.alertId = alertId;
    }

    public String getClinicId() {
        return clinicId;
    }

    public void setClinicId(String clinicId) {
        this.clinicId = clinicId;
    }

    public String getSymptomName() {
        return symptomName;
    }

    public void setSymptomName(String symptomName) {
        this.symptomName = symptomName;
    }

    public Instant getWindowStart() {
        return windowStart;
    }

    public void setWindowStart(Instant windowStart) {
        this.windowStart = windowStart;
    }

    public Instant getWindowEnd() {
        return windowEnd;
    }

    public void setWindowEnd(Instant windowEnd) {
        this.windowEnd = windowEnd;
    }

    public Integer getObservedCount() {
        return observedCount;
    }

    public void setObservedCount(Integer observedCount) {
        this.observedCount = observedCount;
    }

    public BigDecimal getBaselineCount() {
        return baselineCount;
    }

    public void setBaselineCount(BigDecimal baselineCount) {
        this.baselineCount = baselineCount;
    }

    public BigDecimal getScore() {
        return score;
    }

    public void setScore(BigDecimal score) {
        this.score = score;
    }

    public BigDecimal getThreshold() {
        return threshold;
    }

    public void setThreshold(BigDecimal threshold) {
        this.threshold = threshold;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
```

### UpdateAlertStatusRequest

Path:

```text
src/main/java/com/project/ibm/telehealth_with_ai/dto/request/UpdateAlertStatusRequest.java
```

```java
package com.project.ibm.telehealth_with_ai.dto.request;

import jakarta.validation.constraints.NotBlank;

public class UpdateAlertStatusRequest {

    @NotBlank(message = "Alert status is required")
    private String status;

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
```

Allowed statuses:

```text
OPEN
ACKNOWLEDGED
DISMISSED
RESOLVED
```

Later, prefer an enum:

```java
public enum AlertStatus {
    OPEN,
    ACKNOWLEDGED,
    DISMISSED,
    RESOLVED
}
```

## Error DTO

Spring Boot has `ProblemDetail`, which is good. But you can also understand error DTOs conceptually.

Example validation error response:

```json
{
  "status": 400,
  "message": "Validation failed",
  "errors": {
    "nhsNumber": "NHS number must be exactly 10 characters",
    "dateOfBirth": "Date of birth must be in the past"
  }
}
```

Recommended path:

```text
Use ProblemDetail in GlobalExceptionHandler later.
```

Do not worry too much about custom error DTOs yet.

## Mapping DTOs To Entities

You need to convert between DTOs and entities.

For small projects, manual mapping is totally fine.

Example:

```java
private PatientResponse toResponse(Patient patient) {
    PatientResponse response = new PatientResponse();
    response.setPatientId(patient.getPatientId());
    response.setNhsNumber(patient.getNhsNumber());
    response.setFirstName(patient.getFirstName());
    response.setLastName(patient.getLastName());
    response.setDateOfBirth(patient.getDateOfBirth());
    response.setCreatedAt(patient.getCreatedAt());
    return response;
}
```

Example create mapping:

```java
private Patient toEntity(CreatePatientRequest request) {
    Patient patient = new Patient();
    patient.setNhsNumber(request.getNhsNumber());
    patient.setFirstName(request.getFirstName());
    patient.setLastName(request.getLastName());
    patient.setDateOfBirth(request.getDateOfBirth());
    return patient;
}
```

Where should mapping live?

Simple option:

```text
Inside the service class as private methods
```

Cleaner later option:

```text
mapper/PatientMapper.java
```

Example mapper:

```java
package com.project.ibm.telehealth_with_ai.mapper;

import com.project.ibm.telehealth_with_ai.dto.request.CreatePatientRequest;
import com.project.ibm.telehealth_with_ai.dto.response.PatientResponse;
import com.project.ibm.telehealth_with_ai.model.Patient;

public class PatientMapper {

    private PatientMapper() {
    }

    public static Patient toEntity(CreatePatientRequest request) {
        Patient patient = new Patient();
        patient.setNhsNumber(request.getNhsNumber());
        patient.setFirstName(request.getFirstName());
        patient.setLastName(request.getLastName());
        patient.setDateOfBirth(request.getDateOfBirth());
        return patient;
    }

    public static PatientResponse toResponse(Patient patient) {
        PatientResponse response = new PatientResponse();
        response.setPatientId(patient.getPatientId());
        response.setNhsNumber(patient.getNhsNumber());
        response.setFirstName(patient.getFirstName());
        response.setLastName(patient.getLastName());
        response.setDateOfBirth(patient.getDateOfBirth());
        response.setCreatedAt(patient.getCreatedAt());
        return response;
    }
}
```

For your current level, I recommend:

```text
Start with private mapping methods inside services.
Move to mapper classes later if services become messy.
```

## Controller Example With DTOs

```java
@RestController
@RequestMapping("/api/patients")
public class PatientController {

    private final PatientService patientService;

    public PatientController(PatientService patientService) {
        this.patientService = patientService;
    }

    @PostMapping
    public PatientResponse createPatient(@Valid @RequestBody CreatePatientRequest request) {
        return patientService.createPatient(request);
    }

    @GetMapping("/{id}")
    public PatientResponse getPatient(@PathVariable Long id) {
        return patientService.getPatientById(id);
    }
}
```

Important details:

- `@Valid` activates validation.
- `@RequestBody` reads JSON from the request body.
- The controller accepts a request DTO.
- The controller returns a response DTO.

## Service Example With DTOs

```java
@Service
public class PatientService {

    private final PatientRepository patientRepository;

    public PatientService(PatientRepository patientRepository) {
        this.patientRepository = patientRepository;
    }

    public PatientResponse createPatient(CreatePatientRequest request) {
        Patient patient = new Patient();
        patient.setNhsNumber(request.getNhsNumber());
        patient.setFirstName(request.getFirstName());
        patient.setLastName(request.getLastName());
        patient.setDateOfBirth(request.getDateOfBirth());

        Patient saved = patientRepository.save(patient);

        PatientResponse response = new PatientResponse();
        response.setPatientId(saved.getPatientId());
        response.setNhsNumber(saved.getNhsNumber());
        response.setFirstName(saved.getFirstName());
        response.setLastName(saved.getLastName());
        response.setDateOfBirth(saved.getDateOfBirth());
        response.setCreatedAt(saved.getCreatedAt());

        return response;
    }
}
```

## How DTOs Help Authentication And RBAC

DTOs make security easier.

Example:

```java
@PreAuthorize("hasRole('ADMIN')")
@GetMapping("/api/users")
public List<AppUserResponse> getUsers() {
    return appUserService.getUsers();
}
```

Because you return `AppUserResponse`, even an admin response will not leak passwords.

For patients:

```java
@PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR')")
@GetMapping("/api/patients")
public List<PatientResponse> getPatients() {
    return patientService.getPatients();
}
```

Again, the DTO controls what data comes out.

## Implementation Order

Create DTOs in this order:

1. Patient DTOs
2. Doctor DTOs
3. Clinic DTOs
4. AppUser/Auth DTOs
5. Consultation DTOs
6. Symptom DTOs
7. Alert DTOs

Then implement CRUD in this order:

1. Patient CRUD
2. Doctor CRUD
3. Clinic CRUD
4. Consultation CRUD
5. Alert read/update endpoints
6. Symptom extraction endpoints later

## DTO Checklist

For each resource, check:

- [ ] Do I have a create request?
- [ ] Do I have an update request?
- [ ] Do I have a response DTO?
- [ ] Are request fields validated?
- [ ] Does the response avoid sensitive fields?
- [ ] Does the controller use `@Valid`?
- [ ] Does the service map entity to response DTO?
- [ ] Does the controller avoid returning entities directly?

## Next Step After DTOs

After DTOs, create:

```text
docs/backend-service-controller-guide.md
```

That guide should teach:

- service layer structure
- constructor injection
- CRUD business logic
- controller endpoint design
- exception handling
- `@PreAuthorize` RBAC placement

