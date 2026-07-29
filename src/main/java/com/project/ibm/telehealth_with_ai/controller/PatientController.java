package com.project.ibm.telehealth_with_ai.controller;

import com.project.ibm.telehealth_with_ai.dto.request.CreatePatientRequest;
import com.project.ibm.telehealth_with_ai.dto.request.UpdatePatientRequest;
import com.project.ibm.telehealth_with_ai.dto.response.PatientResponse;
import com.project.ibm.telehealth_with_ai.service.PatientService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/patients")
public class PatientController {

    private final PatientService patientService;

    public PatientController(PatientService patientService) {
        this.patientService = patientService;
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR')")
    @PostMapping
    public PatientResponse createPatient(@Valid @RequestBody CreatePatientRequest request) {
        return patientService.createPatient(request);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR')")
    @GetMapping
    public List<PatientResponse> getAllPatients(){
        return patientService.getAllPatients();
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR')")
    @GetMapping("/{id}")
    public PatientResponse getPatientById(@PathVariable Long id){
        return patientService.getPatientById(id);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR')")
    @GetMapping("/nhs/{nhsNumber}")
    public PatientResponse getPatientByNhsNumber(@PathVariable String nhsNumber){
        return patientService.getPatientByNhsNumber(nhsNumber);
    }
    @PreAuthorize("hasAnyRole('ADMIN')")
    @DeleteMapping("/{id}")
    public void deletePatient(@PathVariable Long id){
        patientService.deletePatient(id);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR')")
    @PutMapping("/{id}")
    public PatientResponse updatePatient(@PathVariable Long id,
    @Valid @RequestBody UpdatePatientRequest request){
        return patientService.updatePatient(id, request);
    }
}
