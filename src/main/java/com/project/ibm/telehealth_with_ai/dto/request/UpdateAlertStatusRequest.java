package com.project.ibm.telehealth_with_ai.dto.request;

import com.project.ibm.telehealth_with_ai.model.AlertStatus;
import jakarta.validation.constraints.NotNull;

/** Request body used by staff to move one alert through its workflow. */
public class UpdateAlertStatusRequest {

    @NotNull(message = "Alert status is required")
    private AlertStatus status;

    public AlertStatus getStatus() {
        return status;
    }

    public void setStatus(AlertStatus status) {
        this.status = status;
    }
}