"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest, type Room } from "../../lib/api";

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<Room[]>("/api/rooms", {}, false)
      .then(setRooms)
      .catch((requestError: unknown) => {
        setError(requestError instanceof Error ? requestError.message : "โหลดรายการห้องไม่สำเร็จ");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-800">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div>
            <p className="text-sm text-sky-600">CP Room Booking</p>
            <h1 className="mt-1 text-3xl font-bold">รายการห้อง</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/user" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">กลับหน้าหลัก</Link>
            <Link href="/booking-form" className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">
              จองห้อง
            </Link>
          </div>
        </header>

        {loading && <p role="status" className="rounded-xl bg-white p-5">กำลังโหลดรายการห้อง...</p>}
        {error && <p role="alert" className="rounded-xl bg-red-50 p-5 text-red-700">{error}</p>}
        {!loading && !error && rooms.length === 0 && (
          <p className="rounded-xl bg-white p-5 text-slate-600">ยังไม่มีข้อมูลห้องในระบบ กรุณาติดต่อผู้ดูแลระบบ</p>
        )}

        {!loading && !error && rooms.length > 0 && (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {rooms.map((room) => (
              <article key={room.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <div className="mb-4 flex items-center justify-between">
                  <span className="rounded-lg bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700">{room.roomCode}</span>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${room.available ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                    {room.available ? "พร้อมจอง" : "ไม่พร้อมใช้งาน"}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">{room.name}</h2>
                <p className="mt-2 text-sm text-slate-500">{room.roomType}</p>
                <p className="mt-4 text-sm text-slate-600">ความจุ {room.capacity} คน</p>
                {room.description && <p className="mt-2 text-sm text-slate-500">{room.description}</p>}
                <Link
                  href={`/booking-form?roomId=${room.id}`}
                  aria-disabled={!room.available}
                  className={`mt-5 block rounded-xl px-3 py-2 text-center text-sm font-medium text-white ${room.available ? "bg-slate-900 hover:bg-slate-700" : "pointer-events-none bg-slate-400"}`}
                >
                  จองห้องนี้
                </Link>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
