import { AppShell } from "@/components/app-shell";
import { requireDoctor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const doctor = await requireDoctor();
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const [todayCount, recent, followUps] = await Promise.all([
    prisma.prescription.count({ where: { doctorId: doctor.id, createdAt: { gte: start } } }),
    prisma.prescription.findMany({
      where: { doctorId: doctor.id },
      include: { patient: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.prescription.count({
      where: { doctorId: doctor.id, followUpDate: { gte: new Date() } },
    }),
  ]);

  return (
    <AppShell>
      <h2 className="text-2xl font-semibold">Welcome, Dr. {doctor.fullName}</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded border bg-white p-4">
          <p className="text-sm text-slate-600">Today&apos;s consultations</p>
          <p className="text-2xl font-bold">{todayCount}</p>
        </div>
        <div className="rounded border bg-white p-4">
          <p className="text-sm text-slate-600">Pending follow-ups</p>
          <p className="text-2xl font-bold">{followUps}</p>
        </div>
        <div className="rounded border bg-white p-4">
          <p className="text-sm text-slate-600">Clinic</p>
          <p className="text-xl font-bold">{doctor.clinicName}</p>
        </div>
      </div>
      <h3 className="mt-6 text-lg font-semibold">Recent prescriptions</h3>
      <div className="mt-2 space-y-2">
        {recent.map((item) => (
          <div key={item.id} className="rounded border bg-white p-3 text-sm">
            {item.patient.fullName} - {item.diagnosis ?? "General"} - INR {item.totalPayable.toFixed(2)}
          </div>
        ))}
      </div>
    </AppShell>
  );
}
