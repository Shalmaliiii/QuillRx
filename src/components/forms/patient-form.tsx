"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { patientSchema } from "@/lib/validations";

export function PatientForm() {
  const { register, handleSubmit, reset } = useForm<z.input<typeof patientSchema>>({
    resolver: zodResolver(patientSchema),
    defaultValues: { gender: "Male" },
  });

  const onSubmit = async (data: z.input<typeof patientSchema>) => {
    const res = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) return;
    reset();
    if (typeof window !== "undefined") window.location.reload();
  };

  return (
    <form className="grid gap-2 md:grid-cols-3" onSubmit={handleSubmit(onSubmit)}>
      <Input placeholder="Full name" {...register("fullName")} />
      <Input placeholder="Age" type="number" {...register("age")} />
      <Input placeholder="Gender" {...register("gender")} />
      <Input placeholder="Phone" {...register("phoneNumber")} />
      <Input placeholder="Weight" {...register("weight")} />
      <Input placeholder="BP" {...register("bloodPressure")} />
      <Input placeholder="Diabetes status" {...register("diabetesStatus")} />
      <Input placeholder="Allergies" {...register("allergies")} />
      <Input placeholder="Existing conditions" {...register("existingConditions")} />
      <Button className="md:col-span-3">Add patient</Button>
    </form>
  );
}
