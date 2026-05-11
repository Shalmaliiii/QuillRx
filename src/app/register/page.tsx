"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pill, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/auth-context";
import { registerSchema, type RegisterInput } from "@/lib/validators";
import { toast } from "sonner";

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    setSubmitting(true);
    try {
      await registerUser(data as unknown as Record<string, string>);
      toast.success("Account created successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-muted/30">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Link href="/" className="flex items-center gap-2">
              <Pill className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">QuillRx</span>
            </Link>
          </div>
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>
            Set up your doctor profile to start creating digital prescriptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Account Details
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" placeholder="doctor@clinic.com" {...register("email")} className="h-11" />
                  {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input id="password" type="password" placeholder="Min 6 characters" {...register("password")} className="h-11" />
                  {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Doctor Details
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input id="fullName" placeholder="Dr. John Doe" {...register("fullName")} className="h-11" />
                  {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qualification">Qualification *</Label>
                  <Input id="qualification" placeholder="MBBS, MD" {...register("qualification")} className="h-11" />
                  {errors.qualification && <p className="text-sm text-destructive">{errors.qualification.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registrationNumber">Registration Number *</Label>
                  <Input id="registrationNumber" placeholder="MCI-12345" {...register("registrationNumber")} className="h-11" />
                  {errors.registrationNumber && <p className="text-sm text-destructive">{errors.registrationNumber.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialization">Specialization *</Label>
                  <Input id="specialization" placeholder="General Physician" {...register("specialization")} className="h-11" />
                  {errors.specialization && <p className="text-sm text-destructive">{errors.specialization.message}</p>}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="mobileNumber">Mobile Number *</Label>
                  <Input id="mobileNumber" placeholder="+91 98765 43210" {...register("mobileNumber")} className="h-11" />
                  {errors.mobileNumber && <p className="text-sm text-destructive">{errors.mobileNumber.message}</p>}
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Clinic Details (optional)
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clinicName">Clinic Name</Label>
                  <Input id="clinicName" placeholder="City Health Clinic" {...register("clinicName")} className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinicPhone">Clinic Phone</Label>
                  <Input id="clinicPhone" placeholder="+91 22 1234 5678" {...register("clinicPhone")} className="h-11" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="clinicAddress">Clinic Address</Label>
                  <Input id="clinicAddress" placeholder="123 Medical Lane, Mumbai" {...register("clinicAddress")} className="h-11" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="consultationTimings">Consultation Timings</Label>
                  <Input id="consultationTimings" placeholder="Mon-Sat: 10AM - 1PM, 5PM - 8PM" {...register("consultationTimings")} className="h-11" />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full h-12 text-base" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Account
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
