package com.project.ibm.telehealth_with_ai.service;

import com.project.ibm.telehealth_with_ai.dto.request.CreateConsultationRequest;
import com.project.ibm.telehealth_with_ai.dto.request.UpdateConsultationStatusRequest;
import com.project.ibm.telehealth_with_ai.dto.response.ConsultationResponse;
import com.project.ibm.telehealth_with_ai.exception.BadRequestException;
import com.project.ibm.telehealth_with_ai.exception.ResourceNotFoundException;
import com.project.ibm.telehealth_with_ai.model.AppUser;
import com.project.ibm.telehealth_with_ai.model.Clinic;
import com.project.ibm.telehealth_with_ai.model.Consultation;
import com.project.ibm.telehealth_with_ai.model.ConsultationStatus;
import com.project.ibm.telehealth_with_ai.model.Patient;
import com.project.ibm.telehealth_with_ai.repository.AppUserRepository;
import com.project.ibm.telehealth_with_ai.repository.ClinicRepository;
import com.project.ibm.telehealth_with_ai.repository.ConsultationRepository;
import com.project.ibm.telehealth_with_ai.repository.PatientRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.security.access.AccessDeniedException;

import java.util.List;

@Service
@Transactional
public class ConsultationService {

    private final ConsultationRepository consultationRepository;
    private final PatientRepository patientRepository;
    private final AppUserRepository appUserRepository;
    private final ClinicRepository clinicRepository;

    public ConsultationService(ConsultationRepository consultationRepository, PatientRepository patientRepository, AppUserRepository appUserRepository, ClinicRepository clinicRepository) {
        this.consultationRepository = consultationRepository;
        this.patientRepository = patientRepository;
        this.appUserRepository = appUserRepository;
        this.clinicRepository = clinicRepository;
    }

    private ConsultationResponse toResponse(Consultation consultation) {
        ConsultationResponse response = new ConsultationResponse();
        response.setConsultationId(consultation.getConsultationId());
        response.setPatientId(consultation.getPatient().getPatientId());
        response.setPatientName(
                consultation.getPatient().getFirstName() + " "
                        + consultation.getPatient().getLastName()
        );
        response.setClinicianId(consultation.getClinician().getUserId());
        response.setClinicianUsername(consultation.getClinician().getUsername());
        response.setClinicId(consultation.getClinic().getClinicId());
        response.setClinicName(consultation.getClinic().getClinicName());
        response.setScheduledAt(consultation.getScheduledAt());
        response.setStatus(consultation.getStatus());
        response.setStartedAt(consultation.getStartedAt());
        response.setEndedAt(consultation.getEndedAt());
        response.setTranscript(consultation.getTranscript());
        return response;
    }

    public ConsultationResponse createConsultation(CreateConsultationRequest request) {
        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));

        AppUser clinician = appUserRepository.findById(request.getClinicianId())
                .orElseThrow(() -> new ResourceNotFoundException("Clinician not found"));

        if(clinician.getRole() != AppUser.Role.DOCTOR) {
            throw new BadRequestException("Selected user must have the DOCTOR role");
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

    @Transactional(readOnly = true)
    public List<ConsultationResponse> getAllConsultations() {
        return  consultationRepository.findAllByOrderByScheduledDateDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ConsultationResponse getConsultationById(Long consultationId) {
        Consultation consultation = findConsultation(consultationId);
        assertCanRead(consultation, getCurrentUser());
        return toResponse(consultation);
    }

    private Consultation findConsultation(Long consultationId) {
        return consultationRepository.findById(consultationId)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation not found"));
    }

    private AppUser getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new BadRequestException("No authenticated user found");
        }

        return appUserRepository.findByUsernameIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("Current user not found"));
    }

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

    private void assertCanManage(Consultation consultation, AppUser currentUser) {
        if (currentUser.getRole() == AppUser.Role.ADMIN) {
            return;
        }

        if (currentUser.getRole() == AppUser.Role.DOCTOR
                && consultation.getClinician().getUserId().equals(currentUser.getUserId())) {
            return;
        }
        throw new AccessDeniedException("You are not allowed to manage this consultation");
    }

    private boolean isAllowedTransition(
            ConsultationStatus current,
            ConsultationStatus next
    ){
        return switch (current){
            case SCHEDULED ->  next == ConsultationStatus.IN_PROGRESS
            || next == ConsultationStatus.COMPLETED
                    || next == ConsultationStatus.CANCELLED;
            case IN_PROGRESS -> next == ConsultationStatus.COMPLETED
                    || next == ConsultationStatus.CANCELLED;
            case COMPLETED, CANCELLED -> false;
        };
    }
    public ConsultationResponse updateStatus(
            Long consultationId,
            UpdateConsultationStatusRequest request
    ) {
        Consultation consultation = findConsultation(consultationId);
        assertCanManage(consultation,getCurrentUser());

        if(!isAllowedTransition(consultation.getStatus(), request.getStatus())) {
            throw new BadRequestException("Status transition from " + consultation.getStatus()
                    + " to " + request.getStatus() + " is not allowed"
            );
        }

        consultation.setStatus(request.getStatus());
        return toResponse(consultationRepository.save(consultation));
    }


}
