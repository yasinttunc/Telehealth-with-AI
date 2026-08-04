package com.project.ibm.telehealth_with_ai.controller;

import com.project.ibm.telehealth_with_ai.dto.request.UpdateAlertStatusRequest;
import com.project.ibm.telehealth_with_ai.dto.response.AlertResponse;
import com.project.ibm.telehealth_with_ai.service.AlertService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Staff-only API for reviewing seeded clinic alerts. */
@RestController
@RequestMapping("/api/alerts")
@PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR')")
public class AlertController {

    private final AlertService alertService;

    public AlertController(AlertService alertService) {
        this.alertService = alertService;
    }

    @GetMapping
    public List<AlertResponse> getAll() {
        return alertService.getAll();
    }

    @PutMapping("/{alertId}/status")
    public AlertResponse updateStatus(
            @PathVariable Long alertId,
            @Valid @RequestBody UpdateAlertStatusRequest request
    ) {
        return alertService.updateStatus(alertId, request);
    }
}