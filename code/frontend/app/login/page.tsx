"use client";

import { FirebaseError } from "firebase/app";
import { signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getFirebaseAuth, googleProvider } from "../../lib/firebase";

const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  "auth/api-key-not-valid.-please-pass-a-valid-api-key.": "Firebase API key ไม่ถูกต้อง ตรวจค่า NEXT_PUBLIC_FIREBASE_API_KEY ใน code/frontend/.env.local ให้ตรงกับ Firebase Console > Project settings > Your apps > Web app แล้ว restart frontend",
  "auth/invalid-api-key": "Firebase API key ไม่ถูกต้อง ตรวจค่า NEXT_PUBLIC_FIREBASE_API_KEY ใน code/frontend/.env.local ให้ตรงกับ Firebase Console > Project settings > Your apps > Web app แล้ว restart frontend",
  "auth/operation-not-allowed": "ยังไม่ได้เปิด Google sign-in ใน Firebase Console > Authentication > Sign-in method",
  "auth/popup-closed-by-user": "คุณปิดหน้าต่างก่อนเข้าสู่ระบบเสร็จ ลองอีกครั้ง",
  "auth/cancelled-popup-request": "คุณปิดหน้าต่างก่อนเข้าสู่ระบบเสร็จ ลองอีกครั้ง",
  "auth/popup-blocked": "เบราว์เซอร์บล็อกหน้าต่างป๊อปอัป อนุญาตป๊อปอัปสำหรับเว็บนี้แล้วลองอีกครั้ง",
  "auth/unauthorized-domain": "โดเมนนี้ยังไม่ได้เพิ่มใน Firebase (Authentication > Settings > Authorized domains)",
  "auth/network-request-failed": "เชื่อมต่ออินเทอร์เน็ตไม่ได้ ตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง",
};

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    return FIREBASE_ERROR_MESSAGES[error.code] ?? "เข้าสู่ระบบด้วย Google ไม่สำเร็จ ลองอีกครั้งภายหลัง";
  }

  if (error instanceof Error) {
    if (error.message.startsWith("Firebase config is missing:")) {
      return error.message;
    }
    if (error.message === "backend/unavailable") {
      return "เข้าสู่ระบบสำเร็จแล้ว แต่เชื่อมต่อ backend ไม่ได้ ตรวจสอบว่า backend กำลังทำงานอยู่";
    }
    if (error.message === "backend/unauthorized") {
      return "backend ปฏิเสธ Firebase token ตรวจสอบว่า frontend และ backend ใช้ Firebase project เดียวกัน แล้ว restart ทั้งสองระบบให้โหลดค่า .env ล่าสุด";
    }
    if (error.message === "backend/forbidden") {
      return "บัญชีนี้ถูกปิดใช้งานในระบบ กรุณาติดต่อผู้ดูแลระบบ";
    }
    if (error.message.startsWith("backend/http-")) {
      return `backend ตอบกลับด้วยสถานะ ${error.message.slice("backend/http-".length)} ตรวจสอบค่า Firebase Admin, ฐานข้อมูล และ log ของ backend`;
    }
  }

  return "เข้าสู่ระบบไม่สำเร็จ ลองอีกครั้งภายหลัง";
}

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGoogleLogin() {
    setError("");
    setLoading(true);

    try {
      const result = await signInWithPopup(getFirebaseAuth(), googleProvider);
      const idToken = await result.user.getIdToken();
      const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080")
        .replace(/\/+$/, "");

      let response: Response;
      try {
        response = await fetch(`${apiBaseUrl}/api/accounts/me`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
      } catch {
        throw new Error("backend/unavailable");
      }

      if (response.status === 401) {
        throw new Error("backend/unauthorized");
      }
      if (response.status === 403) {
        throw new Error("backend/forbidden");
      }
      if (!response.ok) {
        throw new Error(`backend/http-${response.status}`);
      }

      router.replace("/user");
    } catch (loginError) {
      setError(getErrorMessage(loginError));
      console.error("Google sign-in failed", loginError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#f0f9ff,_#e2e8f0_55%,_#f8fafc)] px-5 py-10 text-slate-800">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/70 sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">CP Building</p>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900">เข้าสู่ระบบ</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          ใช้บัญชี Google เพื่อเข้าใช้งานระบบจองห้อง
        </p>

        <button
          type="button"
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
          onClick={handleGoogleLogin}
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? (
            <span className="size-5 animate-spin rounded-full border-2 border-slate-300 border-t-sky-600" aria-hidden="true" />
          ) : (
            <GoogleIcon />
          )}
          <span>{loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบด้วย Google"}</span>
        </button>

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-700" role="alert">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
