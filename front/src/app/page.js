//src/app/page.js


"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await axios.get("http://localhost:4000/me", { withCredentials: true });
        router.push("/dashboard"); // ✅ لو المستخدم مسجل يدخل على لوحة التحكم
      } catch {
        router.push("/login"); // ❌ لو مش مسجل، يروح على تسجيل الدخول
      }
    };
    checkAuth();
  }, []);

  return <p>جارٍ التوجيه...</p>;
}

