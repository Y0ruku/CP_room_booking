package com.example.cp_room_booking.controller;

import com.example.cp_room_booking.domain.entity.Account;
import com.example.cp_room_booking.domain.enums.Role;
import com.example.cp_room_booking.service.AccountService;
import com.example.cp_room_booking.service.FirebaseAuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;
    private final FirebaseAuthService firebaseAuthService;

    @GetMapping("/me")
    public ResponseEntity<Account> getCurrentAccount(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorizationHeader) {
        return ResponseEntity.ok(firebaseAuthService.getOrCreateAccount(authorizationHeader));
    }

    @GetMapping
    public ResponseEntity<List<Account>> getAllAccounts(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorizationHeader) {
        firebaseAuthService.requireAdmin(authorizationHeader);
        return ResponseEntity.ok(accountService.getAllAccounts());
    }

    @PatchMapping("/{id}/role")
    public ResponseEntity<Account> updateRole(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorizationHeader,
            @PathVariable Long id,
            @RequestParam Role role) {
        firebaseAuthService.requireAdmin(authorizationHeader);
        Account target = accountService.getAccountById(id);
        if (firebaseAuthService.isConfiguredAdminEmail(target.getEmail()) && role != Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Configured administrator accounts must remain admins");
        }
        return ResponseEntity.ok(accountService.updateRole(id, role));
    }
}
