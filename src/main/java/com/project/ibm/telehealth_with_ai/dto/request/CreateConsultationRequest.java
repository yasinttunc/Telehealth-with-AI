package com.project.ibm.telehealth_with_ai.dto.request;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

/**
 * Carries the IDs and timing needed to create a telehealth consultation.
 */
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
