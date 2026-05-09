import { AppShell } from "@/components/app-shell";
import { PatientForm } from "@/components/forms/patient-form";
import { Input } from "@/components/ui/input";
import { requireDoctor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Patient = {
  id: string;
  fullName: string;
  age: number;
  gender: string;
  phoneNumber: string;
  allergies?: string | null;
  existingConditions?: string | null;
};

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const doctor = await requireDoctor();
  const { q = "" } = await searchParams;
  const patients: Patient[] = await prisma.patient.findMany({
    where: {
      doctorId: doctor.id,
      OR: q
        ? [{ fullName: { contains: q, mode: "insensitive" } }, { phoneNumber: { contains: q } }]
        : undefined,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <AppShell>
      <h2 className="text-2xl font-semibold">Patients</h2>
      <div className="mt-4 rounded border bg-white p-4">
        <PatientForm />
      </div>
      <div className="mt-4 rounded border bg-white p-4">
        <form className="mb-3" method="GET">
          <Input placeholder="Search by name or phone" defaultValue={q} name="q" />
        </form>
        <div className="mt-3 space-y-2">
          {patients.map((p) => (
            <div key={p.id} className="rounded border p-3 text-sm">
              <p className="font-semibold">
                {p.fullName} ({p.age}/{p.gender})
              </p>
              <p>{p.phoneNumber}</p>
              <p>Allergies: {p.allergies || "-"}</p>
              <p>Conditions: {p.existingConditions || "-"}</p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
