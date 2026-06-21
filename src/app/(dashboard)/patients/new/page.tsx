"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { patientCreateSchema, type PatientCreateInput } from "@/lib/validators";
import { usePageHeader } from "@/contexts/page-header-context";
import { toast } from "@/lib/toast";

export default function NewPatientPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  usePageHeader({ title: "Add New Patient", backHref: "/patients" });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PatientCreateInput>({
    resolver: zodResolver(patientCreateSchema),
    defaultValues: { gender: "Male" },
  });

  const onSubmit = async (data: PatientCreateInput) => {
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
