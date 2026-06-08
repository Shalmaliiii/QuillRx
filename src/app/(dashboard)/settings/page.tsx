"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Upload, Image as ImageIcon, Pencil, Lock, X } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { usePageHeader } from "@/contexts/page-header-context";
import { useTheme } from "next-themes";
import { doctorProfileSchema, type DoctorProfileInput } from "@/lib/validators";
import {
  readNewPrescriptionFabVisible,
  subscribeNewPrescriptionFabVisible,
  writeNewPrescriptionFabVisible,
} from "@/lib/new-prescription-fab-preferences";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

export default function SettingsPage() {
  const { doctor, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();

  usePageHeader({
    title: "Settings",
    description: "Manage your profile and clinic details",
  });
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const showNewPrescriptionFab = useSyncExternalStore(
    subscribeNewPrescriptionFabVisible,
    readNewPrescriptionFabVisible,
    () => true
  );
  const [logoCropSrc, setLogoCropSrc] = useState<string | null>(null);
  const [logoCropFileName, setLogoCropFileName] = useState("clinic-logo.png");
  const [cropZoom, setCropZoom] = useState(1);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const cropImageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    return () => {
      if (logoCropSrc) URL.revokeObjectURL(logoCropSrc);
    };
  }, [logoCropSrc]);

  const currentValues = (): DoctorProfileInput => ({
    fullName: doctor?.fullName || "",
    qualification: doctor?.qualification || "",
    registrationNumber: doctor?.registrationNumber || "",
    specialization: doctor?.specialization || "",
    mobileNumber: doctor?.mobileNumber || "",
    clinicName: doctor?.clinicName || "",
    clinicAddress: doctor?.clinicAddress || "",
    consultationTimings: doctor?.consultationTimings || "",
    clinicPhone: doctor?.clinicPhone || "",
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DoctorProfileInput>({
    resolver: zodResolver(doctorProfileSchema),
    defaultValues: currentValues(),
  });

  const fieldClass = cn(
    "h-11 transition-colors",
    editing
      ? "border-primary/50 bg-background ring-1 ring-primary/10"
      : "border-transparent bg-muted/60 text-foreground"
  );

  const handleCancel = () => {
    reset(currentValues());
    setEditing(false);
  };

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
      setEditing(false);
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

  const handleLogoPicked = (file: File) => {
    if (logoCropSrc) URL.revokeObjectURL(logoCropSrc);
    setLogoCropSrc(URL.createObjectURL(file));
    setLogoCropFileName(file.name.replace(/\.[^.]+$/, "") || "clinic-logo");
    setCropZoom(1);
    setCropX(0);
    setCropY(0);
  };

  const handleNewPrescriptionFabChange = (checked: boolean) => {
    writeNewPrescriptionFabVisible(checked);
  };

  const uploadCroppedLogo = async () => {
    const image = cropImageRef.current;
    if (!image) return;

    const canvas = document.createElement("canvas");
    const size = 512;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);

    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight) / cropZoom;
    const maxOffsetX = Math.max(0, (image.naturalWidth - sourceSize) / 2);
    const maxOffsetY = Math.max(0, (image.naturalHeight - sourceSize) / 2);
    const sourceX = (image.naturalWidth - sourceSize) / 2 + cropX * maxOffsetX;
    const sourceY = (image.naturalHeight - sourceSize) / 2 + cropY * maxOffsetY;

    ctx.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png", 0.95)
    );
    if (!blob) {
      toast.error("Could not crop logo");
      return;
    }

    const file = new File([blob], `${logoCropFileName}.png`, { type: "image/png" });
    await handleFileUpload(file, "logo");
    if (logoCropSrc) URL.revokeObjectURL(logoCropSrc);
    setLogoCropSrc(null);
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Doctor Profile</CardTitle>
              <CardDescription>
                {editing
                  ? "Editing — make your changes and save"
                  : "Your professional details"}
              </CardDescription>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                editing
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {editing ? (
                <>
                  <Pencil className="h-3 w-3" /> Editing
                </>
              ) : (
                <>
                  <Lock className="h-3 w-3" /> Locked
                </>
              )}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input {...register("fullName")} readOnly={!editing} className={fieldClass} />
                {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Qualification</Label>
                <Input {...register("qualification")} readOnly={!editing} className={fieldClass} />
              </div>
              <div className="space-y-2">
                <Label>Registration Number</Label>
                <Input {...register("registrationNumber")} readOnly={!editing} className={fieldClass} />
              </div>
              <div className="space-y-2">
                <Label>Specialization</Label>
                <Input {...register("specialization")} readOnly={!editing} className={fieldClass} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Mobile Number</Label>
                <Input {...register("mobileNumber")} readOnly={!editing} className={fieldClass} />
              </div>
            </div>

            <Separator />

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Clinic Name</Label>
                <Input {...register("clinicName")} readOnly={!editing} className={fieldClass} />
              </div>
              <div className="space-y-2">
                <Label>Clinic Phone</Label>
                <Input {...register("clinicPhone")} readOnly={!editing} className={fieldClass} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Clinic Address</Label>
                <Input {...register("clinicAddress")} readOnly={!editing} className={fieldClass} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Consultation Timings</Label>
                <Input {...register("consultationTimings")} readOnly={!editing} className={fieldClass} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              {editing ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11"
                    onClick={handleCancel}
                    disabled={submitting}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button type="submit" className="h-11" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit Profile
                </Button>
              )}
            </div>
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
            <div className="w-20 h-20 rounded-full border-2 border-dashed flex items-center justify-center bg-muted/50 overflow-hidden shrink-0">
              {doctor?.logoUrl ? (
                <Image src={doctor.logoUrl} alt="Clinic logo" width={80} height={80} className="w-full h-full object-cover rounded-full" />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Clinic Logo</p>
              <p className="text-xs text-muted-foreground mb-2">PNG, JPEG, or SVG. Max 5MB. Will be auto-cropped to a circle.</p>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleLogoPicked(f);
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

      <Dialog open={!!logoCropSrc} onOpenChange={(open) => !open && setLogoCropSrc(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Crop clinic logo</DialogTitle>
            <DialogDescription>
              Adjust the logo so it appears exactly how you want inside the profile circle.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="mx-auto flex size-64 items-center justify-center overflow-hidden rounded-full border-4 border-background bg-muted shadow-inner ring-1 ring-border">
              {logoCropSrc && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  ref={cropImageRef}
                  src={logoCropSrc}
                  alt="Logo crop preview"
                  className="size-full object-cover"
                  style={{
                    transform: `translate(${cropX * 38}px, ${cropY * 38}px) scale(${cropZoom})`,
                  }}
                />
              )}
            </div>
            <CropSlider label="Zoom" value={cropZoom} min={1} max={3} step={0.05} onChange={setCropZoom} />
            <CropSlider label="Move left/right" value={cropX} min={-1} max={1} step={0.02} onChange={setCropX} />
            <CropSlider label="Move up/down" value={cropY} min={-1} max={1} step={0.02} onChange={setCropY} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLogoCropSrc(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={uploadCroppedLogo} disabled={uploadingLogo}>
              {uploadingLogo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save cropped logo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dark Mode */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
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
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-sm">New Prescription button</p>
              <p className="text-xs text-muted-foreground">
                Show the floating shortcut on screen
              </p>
            </div>
            <Switch
              checked={showNewPrescriptionFab}
              onCheckedChange={handleNewPrescriptionFabChange}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CropSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <Label>{label}</Label>
        <span className="text-xs text-muted-foreground">{value.toFixed(2)}</span>
      </div>
      <Input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
