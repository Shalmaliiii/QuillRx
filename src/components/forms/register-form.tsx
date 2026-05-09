"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { registerSchema } from "@/lib/validations";

type FormData = z.infer<typeof registerSchema>;

const fields: Array<keyof FormData> = [
  "fullName",
  "qualification",
  "registrationNumber",
  "specialization",
  "mobileNumber",
  "email",
  "password",
  "clinicName",
  "clinicAddress",
  "consultationTiming",
  "clinicPhone",
];

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: FormData) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Registration failed");
      return;
    }
    router.push("/login");
  };

  return (
    <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
      {fields.map((field) => (
        <Input
          key={field}
          type={field === "password" ? "password" : "text"}
          placeholder={field}
          {...register(field)}
        />
      ))}
      {error && <p className="md:col-span-2 text-sm text-red-600">{error}</p>}
      <Button className="md:col-span-2" disabled={formState.isSubmitting}>
        Create account
      </Button>
    </form>
  );
}
