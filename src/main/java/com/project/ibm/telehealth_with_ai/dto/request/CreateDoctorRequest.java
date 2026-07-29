package com.project.ibm.telehealth_with_ai.dto.request;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.Valid;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Carries the data required to create a doctor/clinician profile.
 */
public class CreateDoctorRequest {

    @NotBlank(message = "First name is required")
    @Size(max = 100, message = "First name must be 100 characters or fewer")
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(max = 100, message = "Last name must be 100 characters or fewer")
    private String lastName;

    @NotBlank(message = "Specialty is required")
    @Size(max = 100, message = "Specialty must be 100 characters or fewer")
    private String specialty;

    @Valid
    private List<@Future(message = "Available times must be in the future") LocalDateTime> availableTimes;

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getSpecialty() {
        return specialty;
    }

    public void setSpecialty(String specialty) {
        this.specialty = specialty;
    }
    public List<LocalDateTime> getAvailableTimes() {
        return availableTimes;
    }
    public void setAvailableTimes(List<LocalDateTime> availableTimes) {
        this.availableTimes = availableTimes;
    }

}
