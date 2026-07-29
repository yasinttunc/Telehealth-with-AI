package com.project.ibm.telehealth_with_ai.service;

import com.project.ibm.telehealth_with_ai.dto.request.CreatePatientRequest;
import com.project.ibm.telehealth_with_ai.dto.request.UpdatePatientRequest;
import com.project.ibm.telehealth_with_ai.dto.response.PatientResponse;
import com.project.ibm.telehealth_with_ai.exception.DuplicateResourceException;
import com.project.ibm.telehealth_with_ai.exception.ResourceNotFoundException;
import com.project.ibm.telehealth_with_ai.model.Patient;
import com.project.ibm.telehealth_with_ai.repository.PatientRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class PatientService {

    private final PatientRepository patientRepository;

    public PatientService(PatientRepository patientRepository) {
        this.patientRepository = patientRepository;
    }

    public PatientResponse createPatient(CreatePatientRequest request) {
        if (patientRepository.existsByNhsNumber(request.getNhsNumber())) {
            throw new DuplicateResourceException("NHS number already exists");
        }

        Patient patient = new Patient();
        patient.setNhsNumber(request.getNhsNumber());
        patient.setFirstName(request.getFirstName());
        patient.setLastName(request.getLastName());
        patient.setDateOfBirth(request.getDateOfBirth());

        Patient saved = patientRepository.save(patient);

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<PatientResponse> getAllPatients() {
        return patientRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PatientResponse getPatientById(Long id) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));

        return toResponse(patient);
    }

    @Transactional(readOnly = true)
    public PatientResponse getPatientByNhsNumber(String nhsNumber) {
        Patient patient = patientRepository.findByNhsNumber(nhsNumber);

        if (patient == null) {
            throw new ResourceNotFoundException("Patient not found");
        }

        return toResponse(patient);
    }

    public PatientResponse updatePatient(Long id, UpdatePatientRequest request) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));

        patient.setFirstName(request.getFirstName());
        patient.setLastName(request.getLastName());
        patient.setDateOfBirth(request.getDateOfBirth());

        Patient saved = patientRepository.save(patient);

        return toResponse(saved);
    }

    public void deletePatient(Long id) {
        if (!patientRepository.existsById(id)) {
            throw new ResourceNotFoundException("Patient not found");
        }

        patientRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public boolean isPatientExist(Long patientId) {
        return patientId != null && patientRepository.existsById(patientId);
    }

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
}
