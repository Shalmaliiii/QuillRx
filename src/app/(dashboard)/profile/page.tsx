"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Award,
  BadgeCheck,
  Building2,
  Clock,
  Download,
  ImageIcon,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Printer,
  Send,
  Stethoscope,
  User,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { usePageHeader } from "@/contexts/page-header-context";
import { QueueQRCard } from "@/components/queue/queue-qr-card";
import { toast } from "sonner";
import type { DoctorProfile } from "@/types";

export default function ProfilePage() {
  const { doctor, logout } = useAuth();

  usePageHeader({
    title: "Profile",
    description: "Your account and clinic information",
  });

  const displayName = doctor?.fullName?.startsWith("Dr.")
    ? doctor.fullName
    : `Dr. ${doctor?.fullName ?? ""}`.trim();

  const cardPdfUrl = "/api/doctor/card/pdf";

  const handleWhatsApp = async () => {
    if (!doctor) return;

    let file: File;
    try {
      file = await createProfessionalCardImage(doctor, displayName || "Doctor");
    } catch (error) {
      console.error("Could not prepare card image:", error);
      toast.error("Could not prepare card image");
      return;
    }

    let canNativeShare = false;
    if (typeof navigator.share === "function" && typeof navigator.canShare === "function") {
      try {
        canNativeShare = navigator.canShare({ files: [file] });
      } catch (error) {
        console.warn("Native file share is unavailable:", error);
      }
    }

    if (canNativeShare) {
      try {
        await navigator.share({
          title: "Professional card",
          files: [file],
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.warn("Native share failed, falling back to clipboard:", error);
      }
    }

    try {
      await copyCardImageToClipboard(file);
      toast.success("Card image copied. Paste it into WhatsApp.");
      window.open("https://web.whatsapp.com/", "_blank");
    } catch (error) {
      console.warn("Could not copy card image to clipboard:", error);
      toast.error("This browser cannot attach images to WhatsApp. Use Download and attach the card manually.");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card className="overflow-hidden p-0">
        <div className="h-28 bg-gradient-to-r from-primary to-primary/70" />
        <CardContent className="px-6 pb-6">
          <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="flex size-24 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-3xl font-bold text-primary shadow-sm ring-4 ring-background">
                {doctor?.fullName?.charAt(0) || "D"}
              </div>
              <div className="mb-1 min-w-0">
                <h2 className="truncate text-2xl font-bold leading-tight">
                  {displayName || "Doctor"}
                </h2>
                <p className="truncate text-sm text-muted-foreground">
                  {doctor?.specialization}
                  {doctor?.qualification ? ` | ${doctor.qualification}` : ""}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link href="/settings">
                <Button variant="outline">
                  <Pencil className="mr-1 h-4 w-4" />
                  Edit Profile
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => logout()}
                className="text-destructive hover:text-destructive"
              >
                <LogOut className="mr-1 h-4 w-4" />
                Sign out
              </Button>
            </div>
          </div>

          {(doctor?.clinicName || doctor?.registrationNumber) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {doctor?.clinicName && (
                <Badge variant="secondary" className="gap-1">
                  <Building2 className="h-3 w-3" />
                  {doctor.clinicName}
                </Badge>
              )}
              {doctor?.registrationNumber && (
                <Badge variant="outline" className="gap-1">
                  <BadgeCheck className="h-3 w-3" />
                  Reg. {doctor.registrationNumber}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Professional Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <InfoItem icon={User} label="Full Name" value={displayName} />
            <InfoItem icon={Award} label="Qualification" value={doctor?.qualification} />
            <InfoItem icon={Stethoscope} label="Specialization" value={doctor?.specialization} />
            <InfoItem icon={BadgeCheck} label="Registration Number" value={doctor?.registrationNumber} />
            <InfoItem icon={Phone} label="Mobile Number" value={doctor?.mobileNumber} />
            <InfoItem icon={Mail} label="Email" value={doctor?.email} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clinic Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <InfoItem icon={Building2} label="Clinic Name" value={doctor?.clinicName} />
            <InfoItem icon={Phone} label="Clinic Phone" value={doctor?.clinicPhone} />
            <InfoItem icon={MapPin} label="Clinic Address" value={doctor?.clinicAddress} />
            <InfoItem icon={Clock} label="Consultation Timings" value={doctor?.consultationTimings} />
          </CardContent>
        </Card>
      </div>

      <QueueQRCard />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Professional Card</CardTitle>
          <p className="text-sm text-muted-foreground">
            A shareable visiting card built from your details
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-950 via-cyan-950 to-slate-900 shadow-lg shadow-primary/10">
            <div className="relative grid min-h-[280px] gap-6 p-6 sm:grid-cols-[0.9fr_1.1fr] sm:p-8">
              <div className="absolute -right-12 -top-16 size-44 rounded-full bg-primary/25 blur-2xl" />
              <div className="absolute -bottom-16 left-10 size-36 rounded-full bg-cyan-400/10 blur-2xl" />
              <div className="relative flex flex-col justify-between gap-8 rounded-2xl bg-white/8 p-5 ring-1 ring-white/10">
                <div className="flex items-center gap-3">
                  {doctor?.logoUrl ? (
                    <div className="size-16 shrink-0 overflow-hidden rounded-2xl bg-white p-1 shadow-md">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={doctor.logoUrl} alt="Clinic logo" className="size-full rounded-xl object-cover" />
                    </div>
                  ) : (
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl font-bold text-primary shadow-md">
                      {doctor?.fullName?.charAt(0) || "D"}
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-100/70">QuillRx</p>
                    <p className="text-sm font-medium text-white/80">{doctor?.clinicName || "Clinic"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-3xl font-bold tracking-tight text-white">{displayName || "Doctor"}</p>
                  <p className="mt-2 text-sm font-medium text-cyan-100">
                    {[doctor?.qualification, doctor?.specialization].filter(Boolean).join(" | ")}
                  </p>
                  {doctor?.registrationNumber && (
                    <Badge className="mt-4 bg-white/15 text-white hover:bg-white/20">
                      Reg. {doctor.registrationNumber}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="relative flex flex-col justify-center gap-4 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">Clinic</p>
                <h3 className="text-2xl font-bold">{doctor?.clinicName || "Clinic"}</h3>
                <div className="grid gap-3 text-sm text-cyan-50/90">
                  <CardContact icon={Phone} value={doctor?.clinicPhone || doctor?.mobileNumber} />
                  <CardContact icon={Mail} value={doctor?.email} />
                  <CardContact icon={Clock} value={doctor?.consultationTimings} />
                  <CardContact icon={MapPin} value={doctor?.clinicAddress} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleWhatsApp} className="gap-2">
              <Send className="h-4 w-4" />
              Send image on WhatsApp
            </Button>
            <a href={cardPdfUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2">
                <Printer className="h-4 w-4" />
                View PDF
              </Button>
            </a>
            <a href={cardPdfUrl} download="doctor-card.pdf">
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Download
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Branding</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium">Clinic Logo</p>
            <div className="flex size-28 items-center justify-center overflow-hidden rounded-xl border bg-muted/40">
              {doctor?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={doctor.logoUrl} alt="Clinic logo" className="size-full object-cover" />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
              )}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Signature</p>
            <div className="flex h-28 w-full items-center justify-center overflow-hidden rounded-xl border bg-muted/40">
              {doctor?.signatureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={doctor.signatureUrl} alt="Doctor signature" className="h-full w-full object-contain p-2" />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0 rounded-lg bg-muted p-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="break-words font-medium">{value || "-"}</p>
      </div>
    </div>
  );
}

function CardContact({
  icon: Icon,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <p className="flex items-start gap-3">
      <span className="mt-0.5 rounded-full bg-primary/20 p-2 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 break-words pt-1.5">{value}</span>
    </p>
  );
}

async function copyCardImageToClipboard(file: File) {
  if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
    throw new Error("Clipboard image copy is unavailable");
  }

  await navigator.clipboard.write([
    new ClipboardItem({
      [file.type]: file,
    }),
  ]);
}

async function createProfessionalCardImage(doctor: DoctorProfile, displayName: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 700;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  const primary = "#0891a3";
  const cyan = "#b8f3ff";
  const white = "#ffffff";

  const gradient = ctx.createLinearGradient(0, 0, 1200, 700);
  gradient.addColorStop(0, "#07161d");
  gradient.addColorStop(0.52, "#0b4f5b");
  gradient.addColorStop(1, "#061018");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1200, 700);

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  roundRect(ctx, 70, 70, 460, 560, 32);
  ctx.fill();

  ctx.fillStyle = "rgba(8,145,163,0.28)";
  ctx.beginPath();
  ctx.arc(1030, 40, 170, 0, Math.PI * 2);
  ctx.fill();

  const drawFallbackLogo = () => {
    ctx.fillStyle = white;
    roundRect(ctx, 110, 110, 112, 112, 28);
    ctx.fill();
    ctx.fillStyle = primary;
    ctx.font = "bold 54px Arial";
    ctx.fillText(doctor.fullName?.charAt(0) || "D", 148, 182);
  };

  if (doctor.logoUrl) {
    try {
      const logo = await loadImage(doctor.logoUrl);
      ctx.fillStyle = white;
      roundRect(ctx, 110, 110, 112, 112, 28);
      ctx.fill();
      ctx.save();
      roundRect(ctx, 122, 122, 88, 88, 20);
      ctx.clip();
      ctx.drawImage(logo, 122, 122, 88, 88);
      ctx.restore();
    } catch (error) {
      console.warn("Could not load card logo, using initial:", error);
      drawFallbackLogo();
    }
  } else {
    drawFallbackLogo();
  }

  ctx.fillStyle = "rgba(184,243,255,0.72)";
  ctx.font = "bold 22px Arial";
  ctx.fillText("QUILLRX", 245, 145);
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.font = "24px Arial";
  ctx.fillText(doctor.clinicName || "Clinic", 245, 184);

  ctx.fillStyle = white;
  ctx.font = "bold 52px Arial";
  wrapCanvasText(ctx, displayName, 110, 430, 360, 58);
  ctx.fillStyle = cyan;
  ctx.font = "26px Arial";
  wrapCanvasText(
    ctx,
    [doctor.qualification, doctor.specialization].filter(Boolean).join(" | "),
    110,
    510,
    360,
    34
  );

  if (doctor.registrationNumber) {
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    roundRect(ctx, 110, 570, 230, 42, 21);
    ctx.fill();
    ctx.fillStyle = white;
    ctx.font = "bold 20px Arial";
    ctx.fillText(`Reg. ${doctor.registrationNumber}`, 135, 598);
  }

  ctx.fillStyle = primary;
  ctx.font = "bold 20px Arial";
  ctx.fillText("CLINIC", 610, 155);
  ctx.fillStyle = white;
  ctx.font = "bold 42px Arial";
  wrapCanvasText(ctx, doctor.clinicName || "Clinic", 610, 205, 470, 48);

  const contacts = [
    doctor.clinicPhone || doctor.mobileNumber,
    doctor.email,
    doctor.consultationTimings,
    doctor.clinicAddress,
  ].filter(Boolean) as string[];

  ctx.font = "26px Arial";
  let y = 325;
  for (const contact of contacts) {
    ctx.fillStyle = "rgba(8,145,163,0.22)";
    ctx.beginPath();
    ctx.arc(625, y - 8, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = cyan;
    ctx.fillText("*", 620, y);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    y = wrapCanvasText(ctx, contact, 665, y, 430, 34) + 18;
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png", 0.95)
  );
  if (!blob) throw new Error("Could not create card");

  return new File([blob], "quillrx-professional-card.png", { type: "image/png" });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line) ctx.fillText(line, x, currentY);
  return currentY + lineHeight;
}
