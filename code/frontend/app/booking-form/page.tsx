"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SignOutButton } from "../components/sign-out-button";
import { ApiError, apiRequest, type BookingSchedule, type Room } from "../../lib/api";
import { useSession } from "../../lib/use-session";

function today() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

export default function BookingFormPage() {
  const { account, loading: sessionLoading, error: sessionError } = useSession();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [schedule, setSchedule] = useState<BookingSchedule[]>([]);
  const [roomId, setRoomId] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [purpose, setPurpose] = useState("");
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const requestedRoomId = new URLSearchParams(window.location.search).get("roomId");
    apiRequest<Room[]>("/api/rooms", {}, false)
      .then((availableRooms) => {
        const bookableRooms = availableRooms.filter((room) => room.available);
        setRooms(bookableRooms);
        if (requestedRoomId && bookableRooms.some((room) => String(room.id) === requestedRoomId)) {
          setRoomId(requestedRoomId);
        } else if (bookableRooms.length > 0) {
          setRoomId(String(bookableRooms[0].id));
        }
      })
      .catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : "โหลดรายการห้องไม่สำเร็จ"))
      .finally(() => setLoadingRooms(false));
  }, []);

  useEffect(() => {
    if (!account) return;
    apiRequest<BookingSchedule[]>("/api/bookings/schedule")
      .then(setSchedule)
      .catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : "โหลดตารางการจองไม่สำเร็จ"));
  }, [account]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!roomId || !bookingDate || !purpose.trim()) {
      setError("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }
    if (endTime <= startTime) {
      setError("เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม");
      return;
    }

    setSubmitting(true);
    try {
      const createdBooking = await apiRequest<BookingSchedule>("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          roomId: Number(roomId),
          bookingDate,
          startTime,
          endTime,
          purpose: purpose.trim(),
        }),
      });
      setSchedule((current) => [...current, createdBooking].sort((left, right) =>
        left.bookingDate.localeCompare(right.bookingDate) || left.startTime.localeCompare(right.startTime)));
      setSuccess("บันทึกคำขอจองแล้ว ตรวจสอบสถานะได้ที่ประวัติการจอง");
      setPurpose("");
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 409) {
        setError("ช่วงเวลานี้มีรายการจองที่อนุมัติแล้ว กรุณาเลือกเวลาอื่น");
      } else {
        setError(requestError instanceof Error ? requestError.message : "บันทึกคำขอจองไม่สำเร็จ");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const pageLoading = sessionLoading || loadingRooms;
  const roomDaySchedule = schedule.filter((booking) =>
    String(booking.roomId) === roomId && booking.bookingDate === bookingDate);
  const hasConfirmedOverlap = roomDaySchedule.some((booking) =>
    booking.status === "CONFIRMED" && startTime < booking.endTime && endTime > booking.startTime);

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-4xl rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-sky-600">CP Room Booking</p>
            <h1 className="mt-1 text-3xl font-bold">แบบฟอร์มจองห้อง</h1>
            {account && <p className="mt-2 text-sm text-slate-500">ผู้จอง: {account.fullName} ({account.email})</p>}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/user" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">กลับหน้าหลัก</Link>
            <SignOutButton />
          </div>
        </header>

        {pageLoading && <p role="status" className="mb-4 text-sm text-slate-600">กำลังเตรียมข้อมูล...</p>}
        {sessionError && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{sessionError}</p>}
        {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {success && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">{success}</p>}

        {!pageLoading && !sessionError && rooms.length === 0 && (
          <div className="rounded-xl bg-slate-50 p-5 text-sm text-slate-600">
            ไม่มีห้องที่พร้อมให้จองในขณะนี้ <Link className="text-sky-700 underline" href="/rooms">ดูรายการห้อง</Link>
          </div>
        )}

        {!sessionLoading && account && rooms.length > 0 && (
          <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="roomId" className="mb-2 block text-sm font-medium text-slate-700">เลือกห้อง</label>
              <select id="roomId" required value={roomId} onChange={(event) => setRoomId(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                {rooms.map((room) => <option key={room.id} value={room.id}>{room.roomCode} - {room.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="bookingDate" className="mb-2 block text-sm font-medium text-slate-700">วันที่จอง</label>
              <input id="bookingDate" type="date" required min={today()} value={bookingDate} onChange={(event) => setBookingDate(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5" />
            </div>
            <div>
              <label htmlFor="startTime" className="mb-2 block text-sm font-medium text-slate-700">เวลาเริ่ม</label>
              <input id="startTime" type="time" required value={startTime} onChange={(event) => setStartTime(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5" />
            </div>
            <div>
              <label htmlFor="endTime" className="mb-2 block text-sm font-medium text-slate-700">เวลาสิ้นสุด</label>
              <input id="endTime" type="time" required value={endTime} onChange={(event) => setEndTime(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5" />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="purpose" className="mb-2 block text-sm font-medium text-slate-700">วัตถุประสงค์</label>
              <textarea id="purpose" required maxLength={200} value={purpose} onChange={(event) => setPurpose(event.target.value)} rows={4} placeholder="อธิบายเหตุผลการจองห้อง" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5" />
            </div>
            {bookingDate && (
              <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2" aria-live="polite">
                <h2 className="font-semibold">รายการจองห้องนี้ในวันที่ {bookingDate}</h2>
                <p className="mt-1 text-sm text-slate-600">รายการรออนุมัติแสดงให้ผู้ดูแลพิจารณา ส่วนเวลาที่อนุมัติแล้วจะไม่สามารถจองซ้ำได้</p>
                {hasConfirmedOverlap && (
                  <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    ช่วงเวลาที่เลือกทับกับรายการอนุมัติแล้ว กรุณาเลือกเวลาอื่น
                  </p>
                )}
                {roomDaySchedule.length === 0
                  ? <p className="mt-3 text-sm text-slate-500">ยังไม่มีรายการจองในวันดังกล่าว</p>
                  : <ul className="mt-3 space-y-2">{roomDaySchedule.map((booking) => (
                    <li key={booking.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-3 text-sm">
                      <span>{booking.startTime.slice(0, 5)}–{booking.endTime.slice(0, 5)} · {booking.bookedBy}</span>
                      <span className={booking.status === "CONFIRMED" ? "font-medium text-emerald-700" : "font-medium text-amber-700"}>
                        {booking.status === "CONFIRMED" ? "อนุมัติแล้ว" : "รออนุมัติ"}
                      </span>
                    </li>
                  ))}</ul>}
              </section>
            )}
            <div className="flex justify-end gap-3 md:col-span-2">
              <Link href="/rooms" className="rounded-xl border border-slate-300 px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-100">ยกเลิก</Link>
              <button type="submit" disabled={submitting} className="rounded-xl bg-sky-600 px-5 py-2.5 font-semibold text-white hover:bg-sky-700 disabled:opacity-60">
                {submitting ? "กำลังบันทึก..." : "ส่งคำขอจอง"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
