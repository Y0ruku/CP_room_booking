package com.example.cp_room_booking.service;

import com.example.cp_room_booking.domain.entity.Booking;
import com.example.cp_room_booking.domain.enums.BookingStatus;

import java.util.List;

public interface BookingService {
    List<Booking> getAllBookings();
    Booking getBookingById(Long id);
    Booking createBooking(Booking booking);
    Booking updateBooking(Long id, Booking booking);
    Booking updateStatus(Long id, BookingStatus status);
    void deleteBooking(Long id);
}
