"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SignOutButton } from "../components/sign-out-button";
import { apiRequest, type Booking } from "../../lib/api";
import { useSession } from "../../lib/use-session";

const statusLabels: Record<Booking["status"], string> = {
  PENDING: "รออนุมัติ",
  CONFIRMED: "อนุมัติแล้ว",
  CANCELLED: "ยกเลิก",
  COMPLETED: "เสร็จสิ้น",
};

export default function BookingsPage() {
  const { account, loading: sessionLoading, error: sessionError } = useSession();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!account) return;
    apiRequest<Booking[]>("/api/bookings/mine")
      .then(setBookings)
      .catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : "โหลดประวัติการจองไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, [account]);

  const busy = sessionLoading || !account || loading;
  const visibleError = sessionError || error;

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div>
            <p className="text-sm text-violet-600">CP Room Booking</p>
            <h1 className="mt-1 text-3xl font-bold">ประวัติการจอง</h1>
            {account && <p className="mt-2 text-sm text-slate-500">{account.fullName} · {account.email}</p>}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/user" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">กลับหน้าหลัก</Link>
            <SignOutButton />
          </div>
        </header>

        {busy && <p role="status" className="rounded-xl bg-white p-5">กำลังโหลดข้อมูล...</p>}
        {visibleError && <p role="alert" className="rounded-xl bg-red-50 p-5 text-red-700">{visibleError}</p>}
        {!busy && !visibleError && bookings.length === 0 && (
          <p className="rounded-xl bg-white p-5 text-slate-600">ยังไม่มีประวัติการจอง</p>
        )}
        {!busy && !visibleError && bookings.length > 0 && (
          <section className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">ห้อง</th>
                  <th className="px-4 py-3 font-semibold">วันที่</th>
                  <th className="px-4 py-3 font-semibold">เวลา</th>
                  <th className="px-4 py-3 font-semibold">วัตถุประสงค์</th>
                  <th className="px-4 py-3 font-semibold">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">{booking.id}</td>
                    <td className="px-4 py-3 font-medium">{booking.roomCode} · {booking.roomName}</td>
                    <td className="px-4 py-3">{booking.bookingDate}</td>
                    <td className="px-4 py-3">{booking.startTime.slice(0, 5)} - {booking.endTime.slice(0, 5)}</td>
                    <td className="px-4 py-3">{booking.purpose}</td>
                    <td className="px-4 py-3">{statusLabels[booking.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </main>
  );
}
