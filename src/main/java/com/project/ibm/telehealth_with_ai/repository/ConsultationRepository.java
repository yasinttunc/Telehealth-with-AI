package com.project.ibm.telehealth_with_ai.repository;

import com.project.ibm.telehealth_with_ai.model.Consultation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ConsultationRepository extends JpaRepository<Consultation, Long> {
    List<Consultation> findByPatientIdOrderByScheduledDateDesc(Long patientId);
    List<Consultation> findByClinicianUserIdOrderByScheduledDateDesc(Long clinicianUserId);
    List<Consultation> findAllByOrderByScheduledDateDesc();

}
