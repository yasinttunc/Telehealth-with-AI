package com.project.ibm.telehealth_with_ai.dto.response;

import java.time.Instant;
import java.time.LocalDateTime;

/**
 * Returns consultation data, including transcript state and linked patient/clinician identifiers.
 */
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
