//app/src/signup/page.js
"use client";
import axios from "axios";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleSignUp = async () => {
    try {
      await axios.post("http://localhost:4000/signup", {
        name,
        email,
        password,
      });
      router.push("/login");
    } catch (err) {
      alert("فشل إنشاء الحساب");
    }
  };

  return (
    <div>
      <h1>إنشاء حساب</h1>
      <input placeholder="الاسم" onChange={(e) => setName(e.target.value)} />
      <input placeholder="الإيميل" onChange={(e) => setEmail(e.target.value)} />
      <input
        placeholder="كلمة المرور"
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleSignUp}>تسجيل</button>
    </div>
  );
}
