import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function PublicPrescriptionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const rx = await prisma.prescription.findUnique({
    where: { secureToken: token },
    include: { patient: true, doctor: true, medicines: true },
  });

  if (!rx) notFound();

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">{rx.doctor.clinicName} Prescription</h1>
      <p className="mt-1 text-slate-600">
        Patient: {rx.patient.fullName} ({rx.patient.age}/{rx.patient.gender})
      </p>
      <p className="mt-3">Diagnosis: {rx.diagnosis || "-"}</p>
      <ul className="mt-3 list-disc pl-6">
        {rx.medicines.map((m) => (
          <li key={m.id}>
            {m.name} - {m.duration || "as advised"}
          </li>
        ))}
      </ul>
      {rx.pdfUrl && (
        <a className="mt-4 inline-block text-blue-700 underline" href={rx.pdfUrl} target="_blank">
          Download PDF
        </a>
      )}
    </main>
  );
}
