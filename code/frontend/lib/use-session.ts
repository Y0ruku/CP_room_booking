"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiRequest, type Account } from "./api";
import { getFirebaseAuth } from "./firebase";

export function useSession() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    try {
      unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (firebaseUser) => {
        if (!active) return;
        setUser(firebaseUser);
        if (!firebaseUser) {
          router.replace("/login");
          return;
        }

        setLoading(true);
        try {
          const currentAccount = await apiRequest<Account>("/api/accounts/me");
          if (active) setAccount(currentAccount);
        } catch (sessionError) {
          if (active) {
            setError(sessionError instanceof Error ? sessionError.message : "โหลดข้อมูลบัญชีไม่สำเร็จ");
            setAccount(null);
          }
        } finally {
          if (active) setLoading(false);
        }
      });
    } catch (sessionError) {
      queueMicrotask(() => {
        if (active) {
          setError(sessionError instanceof Error ? sessionError.message : "ตั้งค่า Firebase ไม่ถูกต้อง");
          setLoading(false);
        }
      });
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [router]);

  return { user, account, loading, error };
}
