package com.project.ibm.telehealth_with_ai.service;

import com.project.ibm.telehealth_with_ai.dto.request.RegisterRequest;
import com.project.ibm.telehealth_with_ai.dto.request.UpdateAppUserRequest;
import com.project.ibm.telehealth_with_ai.dto.response.AppUserResponse;
import com.project.ibm.telehealth_with_ai.exception.BadRequestException;
import com.project.ibm.telehealth_with_ai.exception.DuplicateResourceException;
import com.project.ibm.telehealth_with_ai.exception.ResourceNotFoundException;
import com.project.ibm.telehealth_with_ai.model.AppUser;
import com.project.ibm.telehealth_with_ai.repository.AppUserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
@Transactional
public class AppUserService {

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;

    public AppUserService(AppUserRepository appUserRepository, PasswordEncoder passwordEncoder) {
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public AppUserResponse toResponse(AppUser appUser) {

        AppUserResponse response = new AppUserResponse();
        response.setUserId(appUser.getUserId());
        response.setEmail(appUser.getEmail());
        response.setRole(appUser.getRole().name());
        response.setCreatedAt(appUser.getCreatedAt());
        response.setUsername(appUser.getUsername());
        return response;
    }

    // Creates a new user account from RegisterRequest.
    public AppUserResponse createUser(RegisterRequest request) {
        if(appUserRepository.findByUsernameIgnoreCase(request.getUsername())!=null){
            throw new DuplicateResourceException("Username already exists");
        }
        if(appUserRepository.findByEmail(request.getEmail())!=null){
            throw new DuplicateResourceException("Email already exists");
        }
        AppUser.Role role = parseRole(request.getRole());
        AppUser user = new AppUser();

        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(role);
        AppUser saved = appUserRepository.save(user);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public AppUserResponse getUserById(Long id) {
        AppUser user = appUserRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        // Returns safe response DTO.
        return toResponse(user);
    }

    @Transactional(readOnly = true)
    public AppUserResponse getUserByUsername(String username) {
        AppUser user = appUserRepository.findByUsernameIgnoreCase(username);
        if (user == null) {
            throw new ResourceNotFoundException("User not found");
        }
        return toResponse(user);
    }

    public AppUserResponse getUserByEmail(String email) {
        AppUser user = appUserRepository.findByEmail(email);
        if (user == null) {
            throw new ResourceNotFoundException("User not found");
        }
        return toResponse(user);
    }

    public AppUserResponse updateUser(Long id, UpdateAppUserRequest request) {
        AppUser user = appUserRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (appUserRepository.existsByUsernameIgnoreCaseAndUserIdNot(request.getUsername(), id)) {
            throw new DuplicateResourceException("Username already exists");
        }
        if (appUserRepository.existsByEmailAndUserIdNot(request.getEmail(), id)) {
            throw new DuplicateResourceException("Email already exists");
        }
        else {
            user.setUsername(request.getUsername());
            user.setEmail(request.getEmail());
            user.setPassword(passwordEncoder.encode(request.getPassword()));
            user.setRole(parseRole(request.getRole()));
            AppUser saved = appUserRepository.save(user);
            return toResponse(saved);
        }
    }
    // Deletes user by ID.
    public void deleteUser(Long id) {

        // Checks user exists first for a clearer error.
        if (!appUserRepository.existsById(id)) {
            throw new ResourceNotFoundException("User not found");
        }

        // Deletes user from database.
        appUserRepository.deleteById(id);
    }

    // Temporary compatibility method if old code needs it.
    @Transactional(readOnly = true)
    public boolean isUserExist(Long userId) {
        // Null-safe exists check.
        return userId != null && appUserRepository.existsById(userId);
    }

    @Transactional(readOnly = true)
    public List<AppUserResponse> getAllUsers() {
        return appUserRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private AppUser.Role parseRole(String roleText) {
        try {
            return AppUser.Role.valueOf(roleText.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new BadRequestException("Role must be ADMIN, DOCTOR, or PATIENT");
        }
    }


}
