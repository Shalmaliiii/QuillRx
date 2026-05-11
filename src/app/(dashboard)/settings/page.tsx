"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Loader2, Upload, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "next-themes";
import { doctorProfileSchema, type DoctorProfileInput } from "@/lib/validators";
import { toast } from "sonner";

export default function SettingsPage() {
  const { doctor, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const [submitting, setSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DoctorProfileInput>({
    resolver: zodResolver(doctorProfileSchema),
    defaultValues: {
      fullName: doctor?.fullName || "",
      qualification: doctor?.qualification || "",
      registrationNumber: doctor?.registrationNumber || "",
      specialization: doctor?.specialization || "",
      mobileNumber: doctor?.mobileNumber || "",
      clinicName: doctor?.clinicName || "",
      clinicAddress: doctor?.clinicAddress || "",
      consultationTimings: doctor?.consultationTimings || "",
      clinicPhone: doctor?.clinicPhone || "",
    },
  });

  const onSubmit = async (data: DoctorProfileInput) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/doctor", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Update failed");
      }

      await refreshProfile();
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (file: File, type: "logo" | "signature") => {
    const setter = type === "logo" ? setUploadingLogo : setUploadingSignature;
    setter(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      await refreshProfile();
      toast.success(`${type === "logo" ? "Logo" : "Signature"} uploaded`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setter(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your profile and clinic details
        </p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Doctor Profile</CardTitle>
          <CardDescription>Update your professional details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input {...register("fullName")} className="h-11" />
                {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Qualification</Label>
                <Input {...register("qualification")} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>Registration Number</Label>
                <Input {...register("registrationNumber")} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>Specialization</Label>
                <Input {...register("specialization")} className="h-11" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Mobile Number</Label>
                <Input {...register("mobileNumber")} className="h-11" />
              </div>
            </div>

            <Separator />

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Clinic Name</Label>
                <Input {...register("clinicName")} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>Clinic Phone</Label>
                <Input {...register("clinicPhone")} className="h-11" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Clinic Address</Label>
                <Input {...register("clinicAddress")} className="h-11" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Consultation Timings</Label>
                <Input {...register("consultationTimings")} className="h-11" />
              </div>
            </div>

            <Button type="submit" className="w-full h-11" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Uploads */}
      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>Upload your clinic logo and signature</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/50 overflow-hidden shrink-0">
              {doctor?.logoUrl ? (
                <Image src={doctor.logoUrl} alt="Clinic logo" width={80} height={80} className="w-full h-full object-contain" />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Clinic Logo</p>
              <p className="text-xs text-muted-foreground mb-2">PNG, JPEG, or SVG. Max 5MB.</p>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f, "logo");
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingLogo}
                onClick={() => logoInputRef.current?.click()}
              >
                {uploadingLogo ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                Upload Logo
              </Button>
            </div>
          </div>

          <Separator />

          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/50 overflow-hidden shrink-0">
              {doctor?.signatureUrl ? (
                <Image src={doctor.signatureUrl} alt="Signature" width={80} height={80} className="w-full h-full object-contain" />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Doctor Signature</p>
              <p className="text-xs text-muted-foreground mb-2">PNG or JPEG on white background. Max 5MB.</p>
              <input
                ref={signatureInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f, "signature");
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingSignature}
                onClick={() => signatureInputRef.current?.click()}
              >
                {uploadingSignature ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                Upload Signature
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dark Mode */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Dark Mode</p>
              <p className="text-xs text-muted-foreground">Toggle dark theme</p>
            </div>
            <Switch
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
