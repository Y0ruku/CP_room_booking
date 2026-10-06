package com.example.cp_room_booking.service;

import com.example.cp_room_booking.domain.entity.Account;
import com.example.cp_room_booking.domain.enums.Role;

import java.util.List;

public interface AccountService {
    Account createAccount(Account account);
    Account updateRole(Long accountId, Role role);
    List<Account> getAllAccounts();
    Account getAccountById(Long id);
}
