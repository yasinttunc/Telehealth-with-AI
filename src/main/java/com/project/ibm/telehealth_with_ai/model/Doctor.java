package com.project.ibm.telehealth_with_ai.model;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import java.util.List;
import java.time.LocalDateTime;

@Entity
@Table(name = "doctor")
public class Doctor {
    public Doctor() {}

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long doctorId;

    @Column(name = "firstname", nullable = false, length = 100)
    private String firstName;

    @Column(name = "lastname", nullable = false, length = 100)
    private String lastName;

    @Column(name= "specialty", nullable = false, length = 100)
    private String specialty;

    @ElementCollection
    @CollectionTable(name = "available_times", joinColumns = @JoinColumn(name = "doctor_id"))
    @Column(name = "available_times")
    private List<LocalDateTime> availableTimes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public Long getDoctorId() {
        return doctorId;
    }

    public void setDoctorId(Long doctorId) {
        this.doctorId = doctorId;
    }

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

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    public List<LocalDateTime> getAvailableTimes() {
        return availableTimes;
    }
    public void setAvailableTimes(List<LocalDateTime> availableTimes) {
        this.availableTimes = availableTimes;
    }
}
