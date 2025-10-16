//app/src/login/page.js
"use client";
import axios from "axios";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleSignIn = async () => {
    try {
      await axios.post(
        "http://localhost:4000/signin",
        { email, password },
        { withCredentials: true }
      );
      router.push("/dashboard");
    } catch (err) {
      alert("فشل تسجيل الدخول");
    }
  };

  return (
    <div>
      <h1>تسجيل الدخول</h1>
      <input
        type="email"
        placeholder="الإيميل"
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="كلمة المرور"
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleSignIn}>دخول</button>
    </div>
  );
}
