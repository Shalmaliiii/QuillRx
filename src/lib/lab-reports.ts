import { prisma } from "@/lib/db";
import type { LabReportData } from "@/types";

type QueueEntryLike = { id: string; labReports?: LabReportData[] };

export async function attachLabReportsToQueueEntries<T extends QueueEntryLike>(
  entries: T[]
): Promise<Array<T & { labReports: LabReportData[] }>> {
  if (entries.length === 0) {
    return [];
  }

  try {
    const reports = await prisma.labReport.findMany({
      where: { queueEntryId: { in: entries.map((entry) => entry.id) } },
      orderBy: { createdAt: "desc" },
    });
    const reportsByEntry = new Map<string, LabReportData[]>();

    for (const report of reports) {
      if (!report.queueEntryId) continue;

      const existing = reportsByEntry.get(report.queueEntryId) ?? [];
      existing.push(report as unknown as LabReportData);
      reportsByEntry.set(report.queueEntryId, existing);
    }

    return entries.map((entry) => ({
      ...entry,
      labReports: reportsByEntry.get(entry.id) ?? [],
    }));
  } catch (error) {
    console.error("Lab report attach error:", error);
    return entries.map((entry) => ({ ...entry, labReports: [] }));
  }
}

export async function attachLabReportsToQueueEntry<T extends QueueEntryLike>(
  entry: T
): Promise<T & { labReports: LabReportData[] }> {
  const [withReports] = await attachLabReportsToQueueEntries([entry]);
  return withReports;
}

export async function getPatientLabReports(patientId: string) {
  try {
    return (await prisma.labReport.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
    })) as unknown as LabReportData[];
  } catch (error) {
    console.error("Patient lab reports fetch error:", error);
    return [];
  }
}

export function hasLabReports(entry: QueueEntryLike) {
  return (entry.labReports?.length ?? 0) > 0;
}
