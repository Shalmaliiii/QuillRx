"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  FileText,
  CalendarClock,
  PlusCircle,
  Stethoscope,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { format } from "date-fns";

interface DashboardData {
  todayPatients: number;
  totalConsultations: number;
  pendingFollowUps: number;
  recentPrescriptions: Array<{
    id: string;
    createdAt: string;
    diagnosis: string | null;
    totalAmount: number | null;
    patient: {
      fullName: string;
      age: number;
      gender: string;
    };
  }>;
}

export default function DashboardPage() {
  const { doctor } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            Good {getGreeting()}, {doctor?.fullName?.startsWith("Dr.") ? doctor.fullName.split(" ").slice(0, 2).join(" ") : `Dr. ${doctor?.fullName?.split(" ")[0] ?? ""}`}
          </h1>
          <p className="text-muted-foreground mt-1">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <Link href="/prescriptions/new">
          <Button size="lg" className="h-12">
            <PlusCircle className="h-5 w-5 mr-2" />
            New Prescription
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Stethoscope className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today&apos;s Patients</p>
                <p className="text-3xl font-bold">{loading ? "—" : data?.todayPatients ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-chart-2/10">
                <FileText className="h-6 w-6 text-chart-2" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Consultations</p>
                <p className="text-3xl font-bold">{loading ? "—" : data?.totalConsultations ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-chart-5/10">
                <CalendarClock className="h-6 w-6 text-chart-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Follow-ups</p>
                <p className="text-3xl font-bold">{loading ? "—" : data?.pendingFollowUps ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Prescriptions</CardTitle>
          <Link href="/prescriptions">
            <Button variant="ghost" size="sm">View all</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Loading...</p>
          ) : !data?.recentPrescriptions?.length ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">No prescriptions yet</p>
              <Link href="/prescriptions/new" className="mt-2 inline-block">
                <Button variant="link">Create your first prescription</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {data.recentPrescriptions.map((rx) => (
                <Link
                  key={rx.id}
                  href={`/prescriptions/${rx.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                      {rx.patient.fullName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{rx.patient.fullName}</p>
                      <p className="text-sm text-muted-foreground">
                        {rx.patient.age}y / {rx.patient.gender}
                        {rx.diagnosis && ` — ${rx.diagnosis}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(rx.createdAt), "d MMM, h:mm a")}
                    </p>
                    {rx.totalAmount ? (
                      <Badge variant="secondary" className="mt-1">
                        ₹{rx.totalAmount}
                      </Badge>
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

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
