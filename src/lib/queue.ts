import { prisma } from "@/lib/db";

export function startOfToday(): Date {
  return startOfDay(new Date());
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() + 1);
  return d;
}

/** Next token number for a doctor, reset each day. */
export async function nextTokenNumber(doctorId: string): Promise<number> {
  const count = await prisma.queueEntry.count({
    where: { doctorId, createdAt: { gte: startOfToday() } },
  });
  return count + 1;
}

/**
 * How many active patients (waiting or being seen) are ahead of the given
 * entry — i.e. joined earlier and not yet finished.
 */
export async function peopleAhead(
  doctorId: string,
  entryCreatedAt: Date
): Promise<number> {
  const queueDayStart = startOfDay(entryCreatedAt);

  return prisma.queueEntry.count({
    where: {
      doctorId,
      status: { in: ["WAITING", "IN_PROGRESS"] },
      createdAt: { gte: queueDayStart, lt: entryCreatedAt },
    },
  });
}

const DEFAULT_CONSULT_MINUTES = 12;

/** Average consultation length for a doctor today, from completed queue entries. */
export async function averageConsultMinutes(
  doctorId: string,
  queueDate = new Date()
): Promise<number> {
  const queueDayStart = startOfDay(queueDate);
  const queueDayEnd = endOfDay(queueDate);

  const completed = await prisma.queueEntry.findMany({
    where: {
      doctorId,
      status: "DONE",
      createdAt: { gte: queueDayStart, lt: queueDayEnd },
      calledAt: { not: null },
      completedAt: { not: null },
    },
    select: { calledAt: true, completedAt: true },
    orderBy: { completedAt: "desc" },
    take: 15,
  });

  if (completed.length === 0) return DEFAULT_CONSULT_MINUTES;

  const total = completed.reduce((sum, entry) => {
    if (!entry.calledAt || !entry.completedAt) return sum;

    const mins =
      (entry.completedAt.getTime() - entry.calledAt.getTime()) / 60_000;
    return sum + Math.max(mins, 3);
  }, 0);

  const avg = Math.round(total / completed.length);
  return Math.min(45, Math.max(5, avg));
}

/** Rough wait estimate from people ahead and today's average consult time. */
export async function estimateWaitMinutes(
  doctorId: string,
  peopleAheadCount: number,
  queueDate = new Date()
): Promise<number> {
  const avg = await averageConsultMinutes(doctorId, queueDate);

  if (peopleAheadCount === 0) {
    const queueDayStart = startOfDay(queueDate);
    const queueDayEnd = endOfDay(queueDate);
    const inProgress = await prisma.queueEntry.findFirst({
      where: {
        doctorId,
        status: "IN_PROGRESS",
        createdAt: { gte: queueDayStart, lt: queueDayEnd },
      },
      select: { id: true },
    });
    return inProgress ? Math.max(3, Math.round(avg * 0.4)) : 0;
  }

  return peopleAheadCount * avg;
}
