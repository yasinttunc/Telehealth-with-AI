package com.project.ibm.telehealth_with_ai.dto.request;

import jakarta.validation.constraints.NotBlank;

/**
 * Carries an admin decision for changing the lifecycle status of an outbreak alert.
 */
public class UpdateAlertStatusRequest {

    @NotBlank(message = "Alert status is required")
    private String status;

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
