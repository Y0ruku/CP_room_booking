import Link from "next/link";

const navigation = [
  { title: "แดชบอร์ด", href: "/dashboard", description: "ดูสรุปข้อมูลบัญชีและรายการจอง" },
  { title: "รายการห้อง", href: "/rooms", description: "ตรวจสอบห้องที่อยู่ในฐานข้อมูล" },
  { title: "ประวัติการจอง", href: "/bookings", description: "ดูคำขอจองของบัญชีที่เข้าสู่ระบบ" },
  { title: "จองห้อง", href: "/booking-form", description: "ส่งคำขอจองห้องเข้าสู่ระบบ" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f0f9ff,_#e2e8f0_45%,_#f8fafc)] px-6 py-10 text-slate-800">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-5 rounded-[28px] border border-sky-100 bg-white/90 p-6 shadow-lg shadow-sky-100/50">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-600">CP Building</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">ระบบจองห้อง</h1>
          </div>
          <Link href="/login" className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
            เข้าสู่ระบบ
          </Link>
        </header>

        <p className="mb-6 text-slate-600">ข้อมูลห้องและรายการจองจะแสดงจากฐานข้อมูลผ่านระบบโดยตรง</p>
        <section className="grid gap-5 md:grid-cols-2">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <h2 className="text-xl font-bold text-slate-900">{item.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{item.description}</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
