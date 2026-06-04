"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Award,
  BadgeCheck,
  Building2,
  Clock,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Stethoscope,
  User,
  ImageIcon,
  Send,
  Download,
  Printer,
  LogOut,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { usePageHeader } from "@/contexts/page-header-context";
import { QueueQRCard } from "@/components/queue/queue-qr-card";
import { DoctorCardPreview } from "@/components/profile/doctor-card-preview";
import { shareDoctorCardPdf } from "@/lib/share-doctor-card";
import { toast } from "sonner";

export default function ProfilePage() {
  const { doctor, logout } = useAuth();
  const [sharingCard, setSharingCard] = useState(false);

  usePageHeader({
    title: "Profile",
    description: "Your account and clinic information",
  });

  const displayName = doctor?.fullName?.startsWith("Dr.")
    ? doctor.fullName
    : `Dr. ${doctor?.fullName ?? ""}`.trim();

  const cardPdfUrl = "/api/doctor/card/pdf";

  const handleWhatsApp = async () => {
    setSharingCard(true);
    try {
      const fileSlug = (displayName || "doctor").replace(/[^\w.-]+/g, "-");
      const result = await shareDoctorCardPdf({
        pdfUrl: cardPdfUrl,
        fileName: `${fileSlug}-visiting-card.pdf`,
        title: `${displayName} — Visiting Card`,
        text: [
          displayName,
          [doctor?.qualification, doctor?.specialization].filter(Boolean).join(" · "),
          doctor?.clinicName,
        ]
          .filter(Boolean)
          .join("\n"),
      });

      if (result === "shared") {
        toast.success("Choose WhatsApp to send your visiting card PDF");
      } else {
        toast.info("Card downloaded — attach the PDF in WhatsApp");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      toast.error(error instanceof Error ? error.message : "Could not share card");
    } finally {
      setSharingCard(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Hero */}
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
                  {doctor?.qualification ? ` · ${doctor.qualification}` : ""}
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
        {/* Professional details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Professional Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <InfoItem icon={User} label="Full Name" value={displayName} />
            <InfoItem icon={Award} label="Qualification" value={doctor?.qualification} />
            <InfoItem
              icon={Stethoscope}
              label="Specialization"
              value={doctor?.specialization}
            />
            <InfoItem
              icon={BadgeCheck}
              label="Registration Number"
              value={doctor?.registrationNumber}
            />
            <InfoItem icon={Phone} label="Mobile Number" value={doctor?.mobileNumber} />
            <InfoItem icon={Mail} label="Email" value={doctor?.email} />
          </CardContent>
        </Card>

        {/* Clinic details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clinic Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <InfoItem icon={Building2} label="Clinic Name" value={doctor?.clinicName} />
            <InfoItem icon={Phone} label="Clinic Phone" value={doctor?.clinicPhone} />
            <InfoItem icon={MapPin} label="Clinic Address" value={doctor?.clinicAddress} />
            <InfoItem
              icon={Clock}
              label="Consultation Timings"
              value={doctor?.consultationTimings}
            />
          </CardContent>
        </Card>
      </div>

      {/* Clinic queue QR */}
      <QueueQRCard />

      {/* Professional card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Professional Card</CardTitle>
          <p className="text-sm text-muted-foreground">
            A shareable visiting card built from your details
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <DoctorCardPreview doctor={doctor} displayName={displayName} />

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleWhatsApp} disabled={sharingCard} className="gap-2">
              {sharingCard ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send on WhatsApp
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

      {/* Branding */}
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
                <img
                  src={doctor.logoUrl}
                  alt="Clinic logo"
                  className="size-full object-cover"
                />
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
                <img
                  src={doctor.signatureUrl}
                  alt="Doctor signature"
                  className="h-full w-full object-contain p-2"
                />
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
        <p className="font-medium break-words">{value || "—"}</p>
      </div>
    </div>
  );
}
