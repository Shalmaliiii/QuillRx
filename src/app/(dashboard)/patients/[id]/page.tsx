"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { PlusCircle, FileText } from "lucide-react";
import { usePageHeader } from "@/contexts/page-header-context";
import { format } from "date-fns";

interface PatientDetail {
  id: string;
  fullName: string;
  age: number;
  gender: string;
  phone: string;
  weight: string | null;
  bp: string | null;
  diabetesStatus: string | null;
  allergies: string | null;
  existingConditions: string | null;
  createdAt: string;
  prescriptions: Array<{
    id: string;
    createdAt: string;
    diagnosis: string | null;
    symptoms: string | null;
    totalAmount: number | null;
    medicines: Array<{ name: string }>;
  }>;
}

export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/patients/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load patient");
        return res.json();
      })
      .then(setPatient)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  usePageHeader({
    title: patient?.fullName ?? "Patient",
    description: patient
      ? `${patient.age}y / ${patient.gender} · ${patient.phone}`
      : undefined,
    backHref: "/patients",
  });

  if (loading) {
    return <p className="text-center text-muted-foreground py-12">Loading...</p>;
  }

  if (!patient) {
    return <p className="text-center text-muted-foreground py-12">Patient not found</p>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-end">
        <Link href={`/prescriptions/new?patientId=${patient.id}`}>
          <Button>
            <PlusCircle className="h-4 w-4 mr-2" />
            New Prescription
          </Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Patient Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Phone" value={patient.phone} />
            <InfoRow label="Weight" value={patient.weight} />
            <InfoRow label="Blood Pressure" value={patient.bp} />
            <InfoRow label="Diabetes" value={patient.diabetesStatus} />
            <InfoRow label="Allergies" value={patient.allergies} />
            <InfoRow label="Conditions" value={patient.existingConditions} />
            <InfoRow label="Registered" value={format(new Date(patient.createdAt), "d MMM yyyy")} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-4">
              <p className="text-4xl font-bold text-primary">{patient.prescriptions.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Total Visits</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Prescription History</CardTitle>
        </CardHeader>
        <CardContent>
          {patient.prescriptions.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No prescriptions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {patient.prescriptions.map((rx) => (
                <Link
                  key={rx.id}
                  href={`/prescriptions/${rx.id}`}
                  className="block p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {format(new Date(rx.createdAt), "d MMMM yyyy, h:mm a")}
                      </p>
                      {rx.diagnosis && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Diagnosis: {rx.diagnosis}
                        </p>
                      )}
                      {rx.medicines.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {rx.medicines.slice(0, 3).map((m, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {m.name}
                            </Badge>
                          ))}
                          {rx.medicines.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{rx.medicines.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    {rx.totalAmount ? (
                      <p className="font-medium text-primary">₹{rx.totalAmount}</p>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
