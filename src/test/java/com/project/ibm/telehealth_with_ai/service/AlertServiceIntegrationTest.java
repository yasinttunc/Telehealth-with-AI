package com.project.ibm.telehealth_with_ai.service;

import com.project.ibm.telehealth_with_ai.dto.request.UpdateAlertStatusRequest;
import com.project.ibm.telehealth_with_ai.exception.BadRequestException;
import com.project.ibm.telehealth_with_ai.model.AlertStatus;
import com.project.ibm.telehealth_with_ai.repository.AlertRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest
@Transactional
class AlertServiceIntegrationTest {

    @Autowired
    private AlertService alertService;

    @Autowired
    private AlertRepository alertRepository;

    @Test
    void openAlertCannotSkipAcknowledgementAndResolveDirectly() {
        var alert = alertRepository.findAll().stream()
                .filter(item -> item.getStatus() == AlertStatus.OPEN)
                .findFirst()
                .orElseThrow(() -> new AssertionError("Seed data must include one OPEN alert"));

        UpdateAlertStatusRequest request = new UpdateAlertStatusRequest();
        request.setStatus(AlertStatus.RESOLVED);

        assertThrows(BadRequestException.class,
                () -> alertService.updateStatus(alert.getAlertId(), request));

        assertEquals(AlertStatus.OPEN,
                alertRepository.findById(alert.getAlertId()).orElseThrow().getStatus());
    }
}
