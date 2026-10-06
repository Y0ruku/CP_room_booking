package com.example.cp_room_booking.service.impl;

import com.example.cp_room_booking.domain.entity.Account;
import com.example.cp_room_booking.domain.enums.Role;
import com.example.cp_room_booking.repository.AccountRepository;
import com.example.cp_room_booking.service.AccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AccountServiceImpl implements AccountService {

    private final AccountRepository accountRepository;

    @Override
    public Account createAccount(Account account) {
        if (accountRepository.existsByUsername(account.getUsername())) {
            throw new IllegalArgumentException("Username already exists");
        }
        return accountRepository.save(account);
    }

    @Override
    public Account updateRole(Long accountId, Role role) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Account not found with id: " + accountId));
        account.setRole(role);
        return accountRepository.save(account);
    }

    @Override
    public List<Account> getAllAccounts() {
        return accountRepository.findAll();
    }

    @Override
    public Account getAccountById(Long id) {
        return accountRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Account not found with id: " + id));
    }
}
