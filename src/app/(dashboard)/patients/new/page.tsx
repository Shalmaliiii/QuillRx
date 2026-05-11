"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft } from "lucide-react";
import { patientSchema, type PatientInput } from "@/lib/validators";
import { toast } from "sonner";
import Link from "next/link";

export default function NewPatientPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PatientInput>({
    resolver: zodResolver(patientSchema),
    defaultValues: { gender: "Male" },
  });

  const onSubmit = async (data: PatientInput) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add patient");
      }

      const patient = await res.json();
      toast.success("Patient added successfully");
      router.push(`/patients/${patient.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add patient");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/patients">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Add New Patient</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Patient Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input placeholder="Patient name" {...register("fullName")} className="h-11" />
                {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input placeholder="+91 98765 43210" {...register("phone")} className="h-11" />
                {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Age *</Label>
                <Input type="number" placeholder="Age" {...register("age", { valueAsNumber: true })} className="h-11" />
                {errors.age && <p className="text-sm text-destructive">{errors.age.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Gender *</Label>
                <Select
                  defaultValue="Male"
                  onValueChange={(val: string | null) => { if (val) setValue("gender", val as "Male" | "Female" | "Other"); }}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Weight</Label>
                <Input placeholder="e.g. 70 kg" {...register("weight")} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>Blood Pressure</Label>
                <Input placeholder="e.g. 120/80" {...register("bp")} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>Diabetes Status</Label>
                <Select onValueChange={(val: string | null) => { if (val) setValue("diabetesStatus", val); }}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">None</SelectItem>
                    <SelectItem value="Type 1">Type 1</SelectItem>
                    <SelectItem value="Type 2">Type 2</SelectItem>
                    <SelectItem value="Pre-diabetic">Pre-diabetic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Allergies</Label>
              <Textarea placeholder="Known allergies..." {...register("allergies")} />
            </div>
            <div className="space-y-2">
              <Label>Existing Conditions</Label>
              <Textarea placeholder="Existing medical conditions..." {...register("existingConditions")} />
            </div>
            <Button type="submit" className="w-full h-12" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Patient
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
