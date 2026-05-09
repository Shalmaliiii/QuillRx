import { AppShell } from "@/components/app-shell";
import { PrescriptionForm } from "@/components/forms/prescription-form";
import { requireDoctor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function NewPrescriptionPage() {
  const doctor = await requireDoctor();
  const patients = await prisma.patient.findMany({
    where: { doctorId: doctor.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell>
      <h2 className="text-2xl font-semibold">New Prescription</h2>
      <p className="mb-4 text-sm text-slate-600">Optimized for fast consultation workflow.</p>
      <PrescriptionForm
        patients={patients.map((p) => ({
          id: p.id,
          fullName: p.fullName,
          phoneNumber: p.phoneNumber,
        }))}
        clinicName={doctor.clinicName}
        appUrl={process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}
      />
    </AppShell>
  );
}
