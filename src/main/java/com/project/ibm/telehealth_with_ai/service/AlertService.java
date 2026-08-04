package com.project.ibm.telehealth_with_ai.service;

import com.project.ibm.telehealth_with_ai.dto.request.UpdateAlertStatusRequest;
import com.project.ibm.telehealth_with_ai.dto.response.AlertResponse;
import com.project.ibm.telehealth_with_ai.exception.BadRequestException;
import com.project.ibm.telehealth_with_ai.exception.ResourceNotFoundException;
import com.project.ibm.telehealth_with_ai.model.Alert;
import com.project.ibm.telehealth_with_ai.model.AlertStatus;
import com.project.ibm.telehealth_with_ai.repository.AlertRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Reads seeded clinic alerts and allows staff to update only their workflow state. */
@Service
@Transactional
public class AlertService {

    private final AlertRepository alertRepository;

    public AlertService(AlertRepository alertRepository) {
        this.alertRepository = alertRepository;
    }

    @Transactional(readOnly = true)
    public List<AlertResponse> getAll() {
        return alertRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public boolean isAllowedTransition(AlertStatus current, AlertStatus next){
        return switch (current){
            case OPEN -> next == AlertStatus.ACKNOWLEDGED
                    || next == AlertStatus.DISMISSED;
            case ACKNOWLEDGED -> next == AlertStatus.RESOLVED
                    || next == AlertStatus.DISMISSED;
            case DISMISSED, RESOLVED -> false;
        };
    }


    public AlertResponse updateStatus(Long alertId, UpdateAlertStatusRequest request) {
        Alert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found: " + alertId));

        if(!isAllowedTransition(alert.getStatus(), request.getStatus())){
            throw new BadRequestException(
                    "Alert transition from " + alert.getStatus()
                    + " to " + request.getStatus() + " is not allowed"
            );
        }

        alert.setStatus(request.getStatus());
        return toResponse(alertRepository.save(alert));
    }

    private AlertResponse toResponse(Alert alert) {
        AlertResponse response = new AlertResponse();
        response.setAlertId(alert.getAlertId());
        response.setClinicId(alert.getClinic().getClinicId());
        response.setSymptomName(alert.getSymptomName());
        response.setWindowStart(alert.getWindowStart());
        response.setWindowEnd(alert.getWindowEnd());
        response.setObservedCount(alert.getObservedCount());
        response.setBaselineCount(alert.getBaselineCount());
        response.setScore(alert.getScore());
        response.setThreshold(alert.getThreshold());
        response.setStatus(alert.getStatus());
        response.setCreatedAt(alert.getCreatedAt());
        return response;
    }
}