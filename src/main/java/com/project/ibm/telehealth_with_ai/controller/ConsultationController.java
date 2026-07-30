package com.project.ibm.telehealth_with_ai.controller;


import com.project.ibm.telehealth_with_ai.dto.request.CreateConsultationRequest;
import com.project.ibm.telehealth_with_ai.dto.response.ConsultationResponse;
import com.project.ibm.telehealth_with_ai.service.ConsultationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/consultations")
public class ConsultationController {

    private final ConsultationService consultationService;
    public ConsultationController(ConsultationService consultationService) {
        this.consultationService = consultationService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR')")
    public ResponseEntity<ConsultationResponse> createConsultation(
            @Valid @RequestBody CreateConsultationRequest request
    ){
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(consultationService.createConsultation(request));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<ConsultationResponse> getAll() {
        return consultationService.getAllConsultations();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR', 'PATIENT')")
    public ConsultationResponse getById(@PathVariable Long id) {
        return consultationService.getConsultationById(id);
    }

}
