package com.example.cp_room_booking.controller;

import com.example.cp_room_booking.domain.entity.Account;
import com.example.cp_room_booking.domain.entity.Booking;
import com.example.cp_room_booking.domain.entity.Room;
import com.example.cp_room_booking.domain.enums.BookingStatus;
import com.example.cp_room_booking.dto.response.BookingResponse;
import com.example.cp_room_booking.dto.response.BookingScheduleResponse;
import com.example.cp_room_booking.repository.BookingRepository;
import com.example.cp_room_booking.repository.RoomRepository;
import com.example.cp_room_booking.service.FirebaseAuthService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingRepository bookingRepository;
    private final RoomRepository roomRepository;
    private final FirebaseAuthService firebaseAuthService;

    @GetMapping
    public ResponseEntity<List<BookingResponse>> getAllBookings(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorizationHeader) {
        firebaseAuthService.requireAdmin(authorizationHeader);
        return ResponseEntity.ok(bookingRepository.findAllByOrderByBookingDateDescStartTimeDesc()
                .stream().map(BookingResponse::from).toList());
    }

    @GetMapping("/mine")
    public ResponseEntity<List<BookingResponse>> getMyBookings(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorizationHeader) {
        Account account = firebaseAuthService.getOrCreateAccount(authorizationHeader);
        return ResponseEntity.ok(bookingRepository
                .findAllByOwnerUidOrderByBookingDateDescStartTimeDesc(account.getUsername())
                .stream().map(BookingResponse::from).toList());
    }

    @GetMapping("/schedule")
    public ResponseEntity<List<BookingScheduleResponse>> getBookingSchedule(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorizationHeader) {
        firebaseAuthService.getOrCreateAccount(authorizationHeader);
        return ResponseEntity.ok(bookingRepository
                .findAllByStatusInOrderByBookingDateAscStartTimeAsc(
                        List.of(BookingStatus.PENDING, BookingStatus.CONFIRMED))
                .stream().map(BookingScheduleResponse::from).toList());
    }

    @PostMapping
    @Transactional
    public ResponseEntity<BookingResponse> createBooking(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorizationHeader,
            @Valid @RequestBody CreateBookingRequest request) {
        Account account = firebaseAuthService.getOrCreateAccount(authorizationHeader);
        Room room = roomRepository.findByIdForUpdate(request.roomId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));
        if (!room.isAvailable()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Room is not available");
        }
        if (!request.endTime().isAfter(request.startTime())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End time must be after start time");
        }
        if (request.bookingDate().isBefore(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Booking date cannot be in the past");
        }
        if (bookingRepository.existsOverlappingConfirmedBooking(
                room.getId(), request.bookingDate(), request.startTime(), request.endTime(), BookingStatus.CONFIRMED)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "The room already has a confirmed booking for that time");
        }

        Booking booking = Booking.builder()
                .room(room)
                .bookingDate(request.bookingDate())
                .startTime(request.startTime())
                .endTime(request.endTime())
                .purpose(request.purpose().trim())
                .bookedBy(account.getFullName())
                .ownerUid(account.getUsername())
                .status(BookingStatus.PENDING)
                .build();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(BookingResponse.from(bookingRepository.save(booking)));
    }

    @PatchMapping("/{id}/status")
    @Transactional
    public ResponseEntity<BookingResponse> updateStatus(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorizationHeader,
            @PathVariable Long id,
            @RequestParam BookingStatus status) {
        firebaseAuthService.requireAdmin(authorizationHeader);
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        if (status == BookingStatus.CONFIRMED && booking.getStatus() != BookingStatus.CONFIRMED) {
            Room room = roomRepository.findByIdForUpdate(booking.getRoom().getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));
            if (bookingRepository.existsOtherOverlappingConfirmedBooking(
                    room.getId(), booking.getBookingDate(), booking.getStartTime(), booking.getEndTime(),
                    booking.getId(), BookingStatus.CONFIRMED)) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT, "Another booking is already confirmed for an overlapping time");
            }
        }
        booking.setStatus(status);
        return ResponseEntity.ok(BookingResponse.from(bookingRepository.save(booking)));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<BookingResponse> cancelMyBooking(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorizationHeader,
            @PathVariable Long id) {
        Account account = firebaseAuthService.getOrCreateAccount(authorizationHeader);
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        if (!account.getUsername().equals(booking.getOwnerUid())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This booking does not belong to the current account");
        }
        if (booking.getStatus() != BookingStatus.PENDING && booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This booking cannot be cancelled");
        }
        booking.setStatus(BookingStatus.CANCELLED);
        return ResponseEntity.ok(BookingResponse.from(bookingRepository.save(booking)));
    }

    public record CreateBookingRequest(
            @NotNull Long roomId,
            @NotNull LocalDate bookingDate,
            @NotNull LocalTime startTime,
            @NotNull LocalTime endTime,
            @NotBlank @Size(max = 200) String purpose) {
    }
}
