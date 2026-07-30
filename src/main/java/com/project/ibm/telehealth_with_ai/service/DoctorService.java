package com.project.ibm.telehealth_with_ai.service;

// Imports the request DTO used when creating a new doctor.
import com.project.ibm.telehealth_with_ai.dto.request.CreateDoctorRequest;

// Imports the request DTO used when updating an existing doctor.
import com.project.ibm.telehealth_with_ai.dto.request.UpdateDoctorRequest;

// Imports the response DTO returned to controllers/API clients.
import com.project.ibm.telehealth_with_ai.dto.response.DoctorResponse;

// Imports the Doctor JPA entity that is saved to/read from the database.
import com.project.ibm.telehealth_with_ai.exception.BadRequestException;
import com.project.ibm.telehealth_with_ai.exception.DuplicateResourceException;
import com.project.ibm.telehealth_with_ai.exception.ResourceNotFoundException;
import com.project.ibm.telehealth_with_ai.model.AppUser;
import com.project.ibm.telehealth_with_ai.model.Doctor;

// Imports the repository that handles database operations for Doctor.
import com.project.ibm.telehealth_with_ai.repository.AppUserRepository;
import com.project.ibm.telehealth_with_ai.repository.DoctorRepository;

// Marks this class as a Spring service bean.
import org.springframework.stereotype.Service;

// Gives service methods transactional database boundaries.
import org.springframework.transaction.annotation.Transactional;

// Java collection type used when returning many doctors.
import java.util.List;


@Service
@Transactional
public class DoctorService {

    private final DoctorRepository doctorRepository;
    private final AppUserRepository appUserRepository;

    public DoctorService(DoctorRepository doctorRepository, AppUserRepository appUserRepository) {
        this.doctorRepository = doctorRepository;
        this.appUserRepository = appUserRepository;
    }

    private DoctorResponse toResponse(Doctor doctor) {
        DoctorResponse response = new DoctorResponse();
        response.setAppUserId(
                doctor.getAppUser() == null
                        ? null
                        : doctor.getAppUser().getUserId()
        );
        response.setDoctorId(doctor.getDoctorId());
        response.setFirstName(doctor.getFirstName());
        response.setLastName(doctor.getLastName());
        response.setSpecialty(doctor.getSpecialty());
        response.setCreatedAt(doctor.getCreatedAt());
        response.setAvailableTimes(doctor.getAvailableTimes() == null
                ? List.of()
                : List.copyOf(doctor.getAvailableTimes()));
        return response;
    }

    public DoctorResponse createDoctor(CreateDoctorRequest request) {
        AppUser appUser = appUserRepository.findById(request.getAppUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (appUser.getRole() != AppUser.Role.DOCTOR) {
            throw new BadRequestException("Selected user must have the DOCTOR role");
        }
        if (doctorRepository.existsByAppUserUserId(appUser.getUserId())) {
            throw new DuplicateResourceException("This user already has a doctor profile");
        }
        Doctor doctor = new Doctor();
        doctor.setAppUser(appUser);
        doctor.setFirstName(request.getFirstName());
        doctor.setLastName(request.getLastName());
        doctor.setSpecialty(request.getSpecialty());
        doctor.setAvailableTimes(request.getAvailableTimes());
        Doctor saved = doctorRepository.save(doctor);

        // Converts the saved entity into a safe API response DTO.
        return toResponse(saved);
    }

    // Read-only transaction because this method
    @Transactional(readOnly = true)
    public List<DoctorResponse> getAllDoctors() {
        return doctorRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public DoctorResponse getDoctorById(Long id) {
        Doctor doctor = doctorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found"));
        return toResponse(doctor);
    }

    @Transactional(readOnly = true)
    public List<DoctorResponse> getDoctorsBySpecialty(String specialty) {
        return doctorRepository.findBySpecialtyIgnoreCase(specialty)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public DoctorResponse updateDoctor(Long id, UpdateDoctorRequest request) {
        Doctor doctor = doctorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found"));
        doctor.setFirstName(request.getFirstName());
        doctor.setLastName(request.getLastName());
        doctor.setSpecialty(request.getSpecialty());
        doctor.setAvailableTimes(request.getAvailableTimes());
        Doctor saved = doctorRepository.save(doctor);
        return toResponse(saved);
    }

    public void deleteDoctor(Long id) {
        if (!doctorRepository.existsById(id)) {
            throw new ResourceNotFoundException("Doctor not found");
        }
        doctorRepository.deleteById(id);
    }

    public boolean isDoctorExist(Long doctorId) {
        return doctorId != null && doctorRepository.existsById(doctorId);
    }




}
