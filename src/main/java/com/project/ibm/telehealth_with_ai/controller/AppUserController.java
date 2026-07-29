package com.project.ibm.telehealth_with_ai.controller;

import com.project.ibm.telehealth_with_ai.dto.request.RegisterRequest;
import com.project.ibm.telehealth_with_ai.dto.request.UpdateAppUserRequest;
import com.project.ibm.telehealth_with_ai.dto.response.AppUserResponse;
import com.project.ibm.telehealth_with_ai.service.AppUserService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class AppUserController {

    private final AppUserService appUserService;

    public AppUserController(AppUserService appUserService) {
        this.appUserService = appUserService;
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public AppUserResponse createUser(@Valid @RequestBody RegisterRequest request) {
        return appUserService.createUser(request);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public AppUserResponse updateUser(@PathVariable Long id, @Valid @RequestBody UpdateAppUserRequest request) {
        return appUserService.updateUser(id, request);
    }

    @GetMapping("/{id}")
    public AppUserResponse getUserById(@PathVariable Long id) {
        return appUserService.getUserById(id);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public List<AppUserResponse> getAllUsers() {
        return appUserService.getAllUsers();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/username/{username}")
    public AppUserResponse getUserByUsername(@PathVariable String username) {
        return appUserService.getUserByUsername(username);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/email/{email}")
    public AppUserResponse getUserByEmail(@PathVariable String email) {
        return appUserService.getUserByEmail(email);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public void deleteUser(@PathVariable Long id) {
        appUserService.deleteUser(id);
    }
}
