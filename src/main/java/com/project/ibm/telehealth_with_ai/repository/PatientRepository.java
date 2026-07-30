package com.project.ibm.telehealth_with_ai.repository;

import com.project.ibm.telehealth_with_ai.model.Patient;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PatientRepository extends JpaRepository<Patient, Long> {
    Patient findByPatientId(Long patientId);
    Patient findByNhsNumber(String nhsNumber);
    boolean existsByNhsNumber(String nhsNumber);
    boolean existsByAppUserUserId(Long userId);
    List<Patient> findAll();

}
