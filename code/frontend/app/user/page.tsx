"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SignOutButton } from "../components/sign-out-button";
import { apiRequest, type Booking, type BookingSchedule, type Room } from "../../lib/api";
import { useSession } from "../../lib/use-session";

const statusLabels: Record<Booking["status"], string> = {
  PENDING: "รออนุมัติ",
  CONFIRMED: "อนุมัติแล้ว",
  CANCELLED: "ยกเลิก",
  COMPLETED: "เสร็จสิ้น",
};

export default function UserPage() {
  const { account, loading: sessionLoading, error: sessionError } = useSession();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [schedule, setSchedule] = useState<BookingSchedule[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");
  const [busyBookingId, setBusyBookingId] = useState<number | null>(null);

  useEffect(() => {
    if (!account) return;
    Promise.all([
      apiRequest<Booking[]>("/api/bookings/mine"),
      apiRequest<BookingSchedule[]>("/api/bookings/schedule"),
      apiRequest<Room[]>("/api/rooms", {}, false),
    ])
      .then(([myBookings, allBookings, allRooms]) => {
        setBookings(myBookings);
        setSchedule(allBookings);
        setRooms(allRooms);
      })
      .catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : "โหลดประวัติการจองไม่สำเร็จ"))
      .finally(() => setLoadingData(false));
  }, [account]);

  const loading = sessionLoading || !account || loadingData;
  const problem = sessionError || error;

  async function cancelBooking(booking: Booking) {
    setError("");
    setBusyBookingId(booking.id);
    try {
      const updated = await apiRequest<Booking>(`/api/bookings/${booking.id}/cancel`, { method: "PATCH" });
      setBookings((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSchedule((current) => current.filter((item) => item.id !== updated.id));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "ยกเลิกคำขอจองไม่สำเร็จ");
    } finally {
      setBusyBookingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-800">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-600">CP Room Booking</p>
            <h1 className="mt-1 text-3xl font-bold">แดชบอร์ด</h1>
            {account && <p className="mt-2 text-sm text-slate-500">{account.fullName} · {account.email}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/rooms" className="rounded-xl border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-50">ดูห้องทั้งหมด</Link>
            <Link href="/bookings" className="rounded-xl border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-50">ประวัติการจอง</Link>
            <Link href="/booking-form" className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700">จองห้องใหม่</Link>
            {account?.role === "ADMIN" && <Link href="/admin" className="rounded-xl border border-violet-300 bg-violet-50 px-4 py-2 font-semibold text-violet-800 hover:bg-violet-100">แดชบอร์ดแอดมิน</Link>}
            <SignOutButton />
          </div>
        </header>

        {loading && <p role="status" className="rounded-xl bg-white p-5">กำลังโหลดข้อมูล...</p>}
        {problem && <p role="alert" className="rounded-xl bg-red-50 p-5 text-red-700">{problem}</p>}
        {!loading && !problem && (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "รอดำเนินการ", value: bookings.filter((item) => item.status === "PENDING").length, style: "bg-amber-50 text-amber-700" },
                { label: "อนุมัติแล้ว", value: bookings.filter((item) => item.status === "CONFIRMED").length, style: "bg-emerald-50 text-emerald-700" },
                { label: "ประวัติทั้งหมด", value: bookings.length, style: "bg-sky-50 text-sky-700" },
                { label: "ห้องพร้อมจอง", value: rooms.filter((room) => room.available).length, style: "bg-violet-50 text-violet-700" },
              ].map((item) => (
                <div key={item.label} className={`rounded-2xl p-5 ring-1 ring-slate-200 ${item.style}`}>
                  <p className="text-sm">{item.label}</p>
                  <p className="mt-3 text-3xl font-bold">{item.value}</p>
                </div>
              ))}
            </section>

            <section className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">ตารางการจองทุกห้อง</h2>
                  <p className="mt-1 text-sm text-slate-500">รายการรออนุมัติและอนุมัติแล้ว พร้อมชื่อผู้จองและช่วงเวลา</p>
                </div>
                <Link href="/booking-form" className="text-sm font-medium text-sky-700">จองห้อง</Link>
              </div>
              {schedule.length === 0
                ? <p className="text-sm text-slate-500">ยังไม่มีรายการจอง</p>
                : <div className="space-y-3">{schedule.map((booking) => (
                  <article key={booking.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div>
                      <p className="font-semibold">{booking.roomCode} · {booking.roomName}</p>
                      <p className="text-sm text-slate-600">{booking.bookingDate} · {booking.startTime.slice(0, 5)}–{booking.endTime.slice(0, 5)}</p>
                      <p className="text-sm text-slate-500">ผู้จอง: {booking.bookedBy}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${booking.status === "CONFIRMED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                      {booking.status === "CONFIRMED" ? "อนุมัติแล้ว" : "รออนุมัติ"}
                    </span>
                  </article>
                ))}</div>}
            </section>

            <section className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold">ห้องพร้อมจอง</h2>
                <Link href="/rooms" className="text-sm font-medium text-sky-700">ดูห้องทั้งหมด</Link>
              </div>
              {rooms.filter((room) => room.available).length === 0
                ? <p className="text-sm text-slate-500">ไม่มีห้องพร้อมจองในขณะนี้</p>
                : <ul className="space-y-3">{rooms.filter((room) => room.available).slice(0, 5).map((room) => (
                  <li key={room.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div><p className="font-semibold">{room.roomCode} · {room.name}</p><p className="text-sm text-slate-500">ความจุ {room.capacity} คน</p></div>
                    <Link href={`/booking-form?roomId=${room.id}`} className="text-sm font-medium text-sky-700">จอง</Link>
                  </li>
                ))}</ul>}
            </section>

            <section className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-4 text-xl font-bold">ประวัติคำขอจอง</h2>
              {bookings.length === 0
                ? <p className="text-sm text-slate-500">ยังไม่มีประวัติการจอง</p>
                : <div className="space-y-3">{bookings.map((booking) => (
                  <article key={booking.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div>
                      <p className="font-semibold">{booking.roomCode} · {booking.roomName}</p>
                      <p className="text-sm text-slate-500">{booking.bookingDate} · {booking.startTime.slice(0, 5)}–{booking.endTime.slice(0, 5)}</p>
                      <p className="mt-1 text-sm text-slate-600">{booking.purpose}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium">{statusLabels[booking.status]}</span>
                      {(booking.status === "PENDING" || booking.status === "CONFIRMED") && (
                        <button
                          type="button"
                          disabled={busyBookingId === booking.id}
                          onClick={() => cancelBooking(booking)}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium disabled:opacity-60"
                        >
                          {busyBookingId === booking.id ? "กำลังยกเลิก..." : "ยกเลิก"}
                        </button>
                      )}
                    </div>
                  </article>
                ))}</div>}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
