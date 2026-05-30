"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Download,
  Send,
  Copy,
  FileText,
  Pill,
  QrCode,
  Printer,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import type { PrescriptionData, DoctorProfile, PatientData } from "@/types";

interface FullPrescription extends PrescriptionData {
  patient: PatientData;
  doctor: DoctorProfile;
}

export default function PrescriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [prescription, setPrescription] = useState<FullPrescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/prescriptions/${id}`)
      .then((res) => res.json())
      .then(setPrescription)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const pdfUrl = `/api/prescriptions/${id}/pdf`;
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const shareUrl = `${appUrl}/api/prescriptions/${id}/pdf`;

  const handleWhatsApp = () => {
    if (!prescription) return;
    const phone = prescription.patient.phone.replace(/[^\d]/g, "");
    const phoneWithCountry = phone.startsWith("91") ? phone : `91${phone}`;
    const message = encodeURIComponent(
      `Hello ${prescription.patient.fullName},\n\nYour prescription from ${prescription.doctor.clinicName || "our clinic"} is ready.\n\nDownload here:\n${shareUrl}\n\nTake medicines as advised by the doctor.\n\nRegards,\nDr. ${prescription.doctor.fullName}`
    );
    window.open(`https://wa.me/${phoneWithCountry}?text=${message}`, "_blank");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied to clipboard");
  };

  const handlePrint = () => {
    window.open(pdfUrl, "_blank");
  };

  const generateQR = async () => {
    try {
      const QRCode = (await import("qrcode")).default;
      const url = await QRCode.toDataURL(shareUrl, { width: 256, margin: 2 });
      setQrDataUrl(url);
      setShowQR(true);
    } catch {
      toast.error("Failed to generate QR code");
    }
  };

  const handleDuplicate = () => {
    if (!prescription) return;
    const params = new URLSearchParams({ patientId: prescription.patientId });
    window.location.href = `/prescriptions/new?${params.toString()}`;
  };

  if (loading) {
    return <p className="text-center text-muted-foreground py-12">Loading...</p>;
  }

  if (!prescription) {
    return <p className="text-center text-muted-foreground py-12">Prescription not found</p>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/prescriptions">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Prescription</h1>
          <p className="text-muted-foreground text-sm">
            {format(new Date(prescription.createdAt), "d MMMM yyyy, h:mm a")}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleWhatsApp} className="gap-2">
          <Send className="h-4 w-4" />
          Send on WhatsApp
        </Button>
        <Button variant="outline" onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          View PDF
        </Button>
        <a href={pdfUrl} download={`prescription-${id}.pdf`}>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Download
          </Button>
        </a>
        <Button variant="outline" onClick={handleCopyLink} className="gap-2">
          <Copy className="h-4 w-4" />
          Copy Link
        </Button>
        <Button variant="outline" onClick={generateQR} className="gap-2">
          <QrCode className="h-4 w-4" />
          QR Code
        </Button>
        <Button variant="secondary" onClick={handleDuplicate} className="gap-2">
          <FileText className="h-4 w-4" />
          Duplicate
        </Button>
      </div>

      {/* QR Code Modal */}
      {showQR && qrDataUrl && (
        <Card>
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Scan to view prescription
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="Prescription QR Code" width={256} height={256} />
            <Button variant="ghost" size="sm" onClick={() => setShowQR(false)}>
              Close
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Patient Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Patient Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Name</p>
              <p className="font-medium">{prescription.patient.fullName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Age / Gender</p>
              <p className="font-medium">
                {prescription.patient.age}y / {prescription.patient.gender}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Phone</p>
              <p className="font-medium">{prescription.patient.phone}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vitals */}
      {prescription.vitals && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vitals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {prescription.vitals.bp && (
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">BP</p>
                  <p className="font-semibold mt-1">{prescription.vitals.bp}</p>
                </div>
              )}
              {prescription.vitals.temperature && (
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Temperature</p>
                  <p className="font-semibold mt-1">{prescription.vitals.temperature}</p>
                </div>
              )}
              {prescription.vitals.weight && (
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Weight</p>
                  <p className="font-semibold mt-1">{prescription.vitals.weight}</p>
                </div>
              )}
              {prescription.vitals.pulse && (
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Pulse</p>
                  <p className="font-semibold mt-1">{prescription.vitals.pulse}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clinical Notes */}
      {(prescription.symptoms || prescription.diagnosis) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clinical Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {prescription.symptoms && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Symptoms</p>
                <p>{prescription.symptoms}</p>
              </div>
            )}
            {prescription.diagnosis && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Diagnosis</p>
                <p>{prescription.diagnosis}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Medicines */}
      {prescription.medicines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Pill className="h-5 w-5 text-primary" />
              Medicines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {prescription.medicines.map((med, i) => (
                <div key={i} className="p-4 rounded-lg border">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">
                        {med.name}
                        {med.strength && (
                          <span className="text-muted-foreground ml-1">({med.strength})</span>
                        )}
                      </p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {med.morning && <Badge variant="secondary">Morning</Badge>}
                        {med.afternoon && <Badge variant="secondary">Afternoon</Badge>}
                        {med.night && <Badge variant="secondary">Night</Badge>}
                        <Badge variant="outline">
                          {med.beforeFood ? "Before food" : "After food"}
                        </Badge>
                      </div>
                    </div>
                    {med.duration && (
                      <Badge className="ml-2 shrink-0">{med.duration}</Badge>
                    )}
                  </div>
                  {med.specialInstructions && (
                    <p className="text-sm text-muted-foreground mt-2 italic">
                      {med.specialInstructions}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lab Tests & Advice */}
      {(prescription.labTests || prescription.advice) && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {prescription.labTests && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Lab Tests</p>
                <p>{prescription.labTests}</p>
              </div>
            )}
            {prescription.advice && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Advice</p>
                <p>{prescription.advice}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Follow-up & Fees */}
      <div className="grid sm:grid-cols-2 gap-4">
        {prescription.followUpDate && (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">Follow-up Date</p>
              <p className="text-lg font-semibold mt-1">
                {format(new Date(prescription.followUpDate), "d MMMM yyyy")}
              </p>
            </CardContent>
          </Card>
        )}
        {prescription.totalAmount !== null && prescription.totalAmount > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2 text-sm">
                {prescription.consultationFee ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Consultation</span>
                    <span>₹{prescription.consultationFee}</span>
                  </div>
                ) : null}
                {prescription.additionalCharges ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Additional</span>
                    <span>₹{prescription.additionalCharges}</span>
                  </div>
                ) : null}
                {prescription.discount ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount</span>
                    <span>-₹{prescription.discount}</span>
                  </div>
                ) : null}
                <Separator />
                <div className="flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span className="text-primary">₹{prescription.totalAmount}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
