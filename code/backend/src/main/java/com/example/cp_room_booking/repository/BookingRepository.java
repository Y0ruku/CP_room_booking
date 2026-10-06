package com.example.cp_room_booking.repository;

import com.example.cp_room_booking.domain.entity.Booking;
import com.example.cp_room_booking.domain.enums.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.time.LocalDate;
import java.time.LocalTime;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    @EntityGraph(attributePaths = "room")
    List<Booking> findAllByOrderByBookingDateDescStartTimeDesc();

    @EntityGraph(attributePaths = "room")
    List<Booking> findAllByOwnerUidOrderByBookingDateDescStartTimeDesc(String ownerUid);

    @Query("""
            select (count(b) > 0) from Booking b
            where b.room.id = :roomId
              and b.bookingDate = :bookingDate
              and b.status = :confirmed
              and b.startTime < :endTime
              and b.endTime > :startTime
            """)
    boolean existsOverlappingConfirmedBooking(
            @Param("roomId") Long roomId,
            @Param("bookingDate") LocalDate bookingDate,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime,
            @Param("confirmed") BookingStatus confirmed);

    @Query("""
            select (count(b) > 0) from Booking b
            where b.room.id = :roomId
              and b.bookingDate = :bookingDate
              and b.id <> :excludedBookingId
              and b.status = :confirmed
              and b.startTime < :endTime
              and b.endTime > :startTime
            """)
    boolean existsOtherOverlappingConfirmedBooking(
            @Param("roomId") Long roomId,
            @Param("bookingDate") LocalDate bookingDate,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime,
            @Param("excludedBookingId") Long excludedBookingId,
            @Param("confirmed") BookingStatus confirmed);

    @EntityGraph(attributePaths = "room")
    List<Booking> findAllByStatusInOrderByBookingDateAscStartTimeAsc(List<BookingStatus> statuses);
}
