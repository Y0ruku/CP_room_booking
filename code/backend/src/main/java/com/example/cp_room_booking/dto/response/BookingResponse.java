package com.example.cp_room_booking.dto.response;

import com.example.cp_room_booking.domain.entity.Booking;
import com.example.cp_room_booking.domain.enums.BookingStatus;

import java.time.LocalDate;
import java.time.LocalTime;

public record BookingResponse(
        Long id,
        Long roomId,
        String roomCode,
        String roomName,
        LocalDate bookingDate,
        LocalTime startTime,
        LocalTime endTime,
        String purpose,
        String bookedBy,
        BookingStatus status) {

    public static BookingResponse from(Booking booking) {
        return new BookingResponse(
                booking.getId(),
                booking.getRoom().getId(),
                booking.getRoom().getRoomCode(),
                booking.getRoom().getName(),
                booking.getBookingDate(),
                booking.getStartTime(),
                booking.getEndTime(),
                booking.getPurpose(),
                booking.getBookedBy(),
                booking.getStatus());
    }
}
