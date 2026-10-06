"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SignOutButton } from "../components/sign-out-button";
import { ApiError, apiRequest, type Account, type Booking, type Room } from "../../lib/api";
import { useSession } from "../../lib/use-session";

export default function AdminPage() {
  const { account, loading: sessionLoading, error: sessionError } = useSession();
  const [users, setUsers] = useState<Account[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [savingRoom, setSavingRoom] = useState(false);
  const [roomForm, setRoomForm] = useState({
    roomCode: "",
    name: "",
    roomType: "MEETING" as Room["roomType"],
    capacity: "1",
    description: "",
  });

  useEffect(() => {
    if (!account || account.role !== "ADMIN") return;
    Promise.all([
      apiRequest<Account[]>("/api/accounts"),
      apiRequest<Booking[]>("/api/bookings"),
      apiRequest<Room[]>("/api/rooms", {}, false),
    ])
      .then(([accountList, bookingList, roomList]) => {
        setUsers(accountList);
        setBookings(bookingList);
        setRooms(roomList);
      })
      .catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : "โหลดข้อมูลผู้ดูแลไม่สำเร็จ"))
      .finally(() => setLoadingData(false));
  }, [account]);

  async function changeRole(user: Account, role: Account["role"]) {
    setError("");
    setMessage("");
    setBusyId(user.id);
    try {
      const updated = await apiRequest<Account>(`/api/accounts/${user.id}/role?role=${role}`, { method: "PATCH" });
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item));
      setMessage(`เปลี่ยนสิทธิ์ ${updated.email} เป็น ${updated.role} แล้ว`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "เปลี่ยนสิทธิ์ไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  }

  async function setBookingStatus(booking: Booking, status: Booking["status"]) {
    setError("");
    setMessage("");
    setBusyId(booking.id);
    try {
      const updated = await apiRequest<Booking>(
        `/api/bookings/${booking.id}/status?status=${status}`,
        { method: "PATCH" },
      );
      setBookings((current) => current.map((item) => item.id === updated.id ? updated : item));
      setMessage(`อัปเดตคำขอจอง #${updated.id} แล้ว`);
    } catch (requestError) {
      setError(requestError instanceof ApiError && requestError.status === 409
        ? "อนุมัติไม่ได้ เพราะมีรายการอื่นที่อนุมัติแล้วในช่วงเวลาซ้อนกัน"
        : requestError instanceof Error ? requestError.message : "เปลี่ยนสถานะการจองไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  }

  async function createRoom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSavingRoom(true);
    try {
      const room = await apiRequest<Room>("/api/rooms", {
        method: "POST",
        body: JSON.stringify({
          ...roomForm,
          roomCode: roomForm.roomCode.trim(),
          name: roomForm.name.trim(),
          capacity: Number(roomForm.capacity),
          description: roomForm.description.trim(),
          available: true,
        }),
      });
      setRooms((current) => [...current, room]);
      setRoomForm({ roomCode: "", name: "", roomType: "MEETING", capacity: "1", description: "" });
      setMessage(`เพิ่มห้อง ${room.roomCode} ลงฐานข้อมูลแล้ว`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "เพิ่มห้องไม่สำเร็จ");
    } finally {
      setSavingRoom(false);
    }
  }

  const filteredBookings = bookings.filter((booking) => {
    const query = search.toLocaleLowerCase();
    return `${booking.roomCode} ${booking.roomName} ${booking.bookedBy} ${booking.status}`
      .toLocaleLowerCase()
      .includes(query);
  });

  if (sessionLoading) {
    return <main className="min-h-screen bg-slate-100 p-6"><p role="status">กำลังตรวจสอบบัญชี...</p></main>;
  }
  if (sessionError) {
    return <main className="min-h-screen bg-slate-100 p-6"><p role="alert" className="text-red-700">{sessionError}</p></main>;
  }
  if (account?.role !== "ADMIN") {
    return <main className="min-h-screen bg-slate-100 p-6"><p role="alert" className="mx-auto max-w-2xl rounded-xl bg-white p-6 text-red-700">บัญชีนี้ไม่มีสิทธิ์เข้าหน้าผู้ดูแลระบบ</p></main>;
  }

  const loading = loadingData;

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-800">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-violet-600">Admin Panel</p>
            <h1 className="mt-1 text-3xl font-bold">จัดการระบบ</h1>
            <p className="mt-2 text-sm text-slate-500">เข้าสู่ระบบเป็น {account.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/user" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">กลับหน้าหลัก</Link>
            <SignOutButton />
          </div>
        </header>

        {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
        {message && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-700">{message}</p>}
        {loading && <p role="status" className="rounded-xl bg-white p-5">กำลังโหลดข้อมูล...</p>}
        {!loading && !error && (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              {[
                { label: "รออนุมัติ", value: bookings.filter((booking) => booking.status === "PENDING").length, style: "bg-amber-50 text-amber-700" },
                { label: "อนุมัติแล้ว", value: bookings.filter((booking) => booking.status === "CONFIRMED").length, style: "bg-emerald-50 text-emerald-700" },
                { label: "บัญชีผู้ใช้", value: users.length, style: "bg-sky-50 text-sky-700" },
                { label: "ห้องทั้งหมด", value: rooms.length, style: "bg-violet-50 text-violet-700" },
              ].map((item) => (
                <div key={item.label} className={`rounded-2xl p-5 ring-1 ring-slate-200 ${item.style}`}>
                  <p className="text-sm">{item.label}</p><p className="mt-3 text-3xl font-bold">{item.value}</p>
                </div>
              ))}
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <form onSubmit={createRoom} className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h2 className="text-xl font-bold">เพิ่มห้อง</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">รหัสห้อง
                    <input required maxLength={50} value={roomForm.roomCode} onChange={(event) => setRoomForm((current) => ({ ...current, roomCode: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" />
                  </label>
                  <label className="text-sm font-medium text-slate-700">ชื่อห้อง
                    <input required maxLength={100} value={roomForm.name} onChange={(event) => setRoomForm((current) => ({ ...current, name: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" />
                  </label>
                  <label className="text-sm font-medium text-slate-700">ประเภทห้อง
                    <select value={roomForm.roomType} onChange={(event) => {
                      const roomType = event.target.value;
                      if (roomType === "MEETING" || roomType === "CONFERENCE" || roomType === "TRAINING" || roomType === "PRIVATE") {
                        setRoomForm((current) => ({ ...current, roomType }));
                      }
                    }} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <option value="MEETING">ห้องประชุม</option>
                      <option value="CONFERENCE">ห้องสัมมนา</option>
                      <option value="TRAINING">ห้องอบรม</option>
                      <option value="PRIVATE">ห้องส่วนตัว</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-slate-700">ความจุ (คน)
                    <input required type="number" min={1} value={roomForm.capacity} onChange={(event) => setRoomForm((current) => ({ ...current, capacity: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" />
                  </label>
                  <label className="text-sm font-medium text-slate-700 sm:col-span-2">รายละเอียด
                    <textarea maxLength={500} value={roomForm.description} onChange={(event) => setRoomForm((current) => ({ ...current, description: event.target.value }))} rows={2} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" />
                  </label>
                </div>
                <button type="submit" disabled={savingRoom} className="mt-4 rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white disabled:opacity-60">
                  {savingRoom ? "กำลังบันทึก..." : "บันทึกห้อง"}
                </button>
              </form>

              <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h2 className="text-xl font-bold">ห้องในระบบ</h2>
                {rooms.length === 0
                  ? <p className="mt-4 text-sm text-slate-500">ยังไม่มีห้อง เพิ่มห้องได้จากแบบฟอร์มนี้</p>
                  : <ul className="mt-4 space-y-3">{rooms.map((room) => (
                    <li key={room.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                      <div><p className="font-semibold">{room.roomCode} · {room.name}</p><p className="text-sm text-slate-500">{room.roomType} · {room.capacity} คน</p></div>
                      <span className="text-xs">{room.available ? "พร้อมจอง" : "ปิดใช้งาน"}</span>
                    </li>
                  ))}</ul>}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-bold">คำขอจองห้อง</h2>
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาห้อง / ผู้จอง / สถานะ" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm sm:w-64" />
                </div>
                {filteredBookings.length === 0
                  ? <p className="text-sm text-slate-500">ไม่พบรายการจอง</p>
                  : <div className="space-y-3">{filteredBookings.map((booking) => (
                    <article key={booking.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div>
                        <p className="font-semibold">{booking.roomCode} · {booking.roomName}</p>
                        <p className="text-sm text-slate-500">{booking.bookedBy} · {booking.bookingDate} · {booking.startTime.slice(0, 5)}–{booking.endTime.slice(0, 5)}</p>
                        <p className="mt-1 text-sm text-slate-600">{booking.purpose}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{booking.status}</span>
                        {booking.status === "PENDING" && (
                          <button disabled={busyId === booking.id} onClick={() => setBookingStatus(booking, "CONFIRMED")} className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">อนุมัติ</button>
                        )}
                        {booking.status === "PENDING" && (
                          <button disabled={busyId === booking.id} onClick={() => setBookingStatus(booking, "CANCELLED")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-60">ปฏิเสธ</button>
                        )}
                      </div>
                    </article>
                  ))}</div>}
              </div>

              <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h2 className="text-xl font-bold">สิทธิ์ผู้ใช้</h2>
                <div className="mt-4 space-y-3">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{user.fullName}</p>
                        <p className="truncate text-xs text-slate-500">{user.email}</p>
                      </div>
                      <select
                        aria-label={`สิทธิ์ของ ${user.email}`}
                        value={user.role}
                        disabled={busyId === user.id || user.id === account.id}
                        onChange={(event) => {
                          const role = event.target.value;
                          if (role === "ADMIN" || role === "USER") void changeRole(user, role);
                        }}
                        className="rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-sm disabled:opacity-60"
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="USER">USER</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
