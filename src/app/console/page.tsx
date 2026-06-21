"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Building2,
  Database,
  FileText,
  IndianRupee,
  KeyRound,
  LineChart,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type SeriesPoint = {
  date: string;
  label: string;
  doctors: number;
  prescriptions: number;
  patients: number;
  revenue: number;
};

type FieldDefinition = {
  id: string;
  label: string;
  group: string;
  mandatory: boolean;
  description: string;
};

type ConsoleData = {
  privacySettings: {
    encryptClinicalPrescriptionData: boolean;
    fieldEncryption: Record<string, boolean>;
  };
  fieldDefinitions: FieldDefinition[];
  summary: {
    totalDoctors: number;
    doctorsThisMonth: number;
    activeDoctors30d: number;
    totalPatients: number;
    totalPrescriptions: number;
    prescriptionsToday: number;
    prescriptionsLast7: number;
    totalRevenue: number;
    avgRevenuePerDoctor: number;
    queueEntries: number;
    completedQueueEntries: number;
    labReports: number;
    templates: number;
    encryptedPrescriptions: number;
    plaintextPrescriptions: number;
    clinicalEncryptionCoverage: number;
  };
  series: SeriesPoint[];
  topDoctors: Array<{
    id: string;
    name: string;
    email: string;
    clinicName: string | null;
    specialization: string;
    patients: number;
    prescriptions: number;
    revenue: number;
    lastActivity: string | null;
  }>;
  recentDoctors: Array<{
    id: string;
    name: string;
    email: string;
    clinicName: string | null;
    specialization: string;
    createdAt: string;
  }>;
};

const TOKEN_STORAGE_KEY = "quillrx_console_token";

const inr = (value: number) =>
  `Rs. ${Math.round(value).toLocaleString("en-IN")}`;

const percent = (value: number) => `${Math.round(value * 100)}%`;

export default function CompanyConsolePage() {
  const [token, setToken] = useState("");
  const [inputToken, setInputToken] = useState("");
  const [data, setData] = useState<ConsoleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadDashboard = useCallback(async (nextToken: string) => {
    if (!nextToken) return;
    setLoading(true);
    try {
      const res = await fetch("/api/console/analytics", {
        headers: { Authorization: `Bearer ${nextToken}` },
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(
          res.status === 401 ? "Console token is invalid" : "Failed to load console"
        );
      }
      const nextData = (await res.json()) as ConsoleData;
      setData(nextData);
      setToken(nextToken);
      setInputToken(nextToken);
      window.sessionStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load console");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = window.sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? "";
    if (saved) {
      const timer = window.setTimeout(() => {
        void loadDashboard(saved);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [loadDashboard]);

  const submitToken = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void loadDashboard(inputToken.trim());
  };

  const saveFieldEncryption = async (fieldEncryption: Record<string, boolean>) => {
    if (!token || !data) return;
    setSaving(true);
    try {
      const res = await fetch("/api/console/settings", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fieldEncryption,
        }),
      });
      if (!res.ok) throw new Error("Failed to update privacy setting");

      const settings = await res.json();
      setData({
        ...data,
        privacySettings: settings,
      });
      toast.success("Privacy setting updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const updatePrescriptionPrivacy = (checked: boolean) => {
    if (!data) return;
    const fieldEncryption = { ...data.privacySettings.fieldEncryption };
    for (const field of data.fieldDefinitions) {
      if (field.id.startsWith("prescription.") && !field.mandatory) {
        fieldEncryption[field.id] = checked;
      }
    }
    void saveFieldEncryption(fieldEncryption);
  };

  const updateFieldPrivacy = (fieldId: string, checked: boolean) => {
    if (!data) return;
    void saveFieldEncryption({
      ...data.privacySettings.fieldEncryption,
      [fieldId]: checked,
    });
  };

  const maxRevenue = useMemo(
    () => Math.max(1, ...(data?.series.map((point) => point.revenue) ?? [1])),
    [data?.series]
  );

  const maxPrescriptions = useMemo(
    () =>
      Math.max(1, ...(data?.series.map((point) => point.prescriptions) ?? [1])),
    [data?.series]
  );

  const encryptionOn =
    data?.privacySettings.encryptClinicalPrescriptionData ?? true;

  const groupedFieldDefinitions = useMemo(() => {
    const groups = new Map<string, FieldDefinition[]>();
    for (const field of data?.fieldDefinitions ?? []) {
      groups.set(field.group, [...(groups.get(field.group) ?? []), field]);
    }
    return Array.from(groups.entries());
  }, [data?.fieldDefinitions]);

  const encryptedFieldCount = useMemo(() => {
    if (!data) return 0;
    return data.fieldDefinitions.filter(
      (field) => data.privacySettings.fieldEncryption[field.id] !== false
    ).length;
  }, [data]);

  return (
    <main className="min-h-screen bg-background px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">
                Company Console
              </h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Company growth, adoption, revenue, operational usage, and privacy controls.
            </p>
          </div>
          {data && (
            <Badge variant={encryptionOn ? "default" : "outline"}>
              {encryptionOn ? "Clinical encryption on" : "Identifier-only mode"}
            </Badge>
          )}
        </header>

        {!data && (
          <Card className="mx-auto max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="h-4 w-4 text-primary" />
                Console Access
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitToken} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="console-token">Console token</Label>
                  <Input
                    id="console-token"
                    type="password"
                    value={inputToken}
                    onChange={(event) => setInputToken(event.target.value)}
                    placeholder="Enter ADMIN_CONSOLE_TOKEN"
                    className="h-11"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Loading..." : "Open console"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {data && (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={Building2}
                label="Doctors"
                value={data.summary.totalDoctors}
                detail={`${data.summary.doctorsThisMonth} joined this month`}
              />
              <MetricCard
                icon={Activity}
                label="Active Doctors"
                value={data.summary.activeDoctors30d}
                detail="With prescriptions in last 30 days"
              />
              <MetricCard
                icon={Users}
                label="Patients"
                value={data.summary.totalPatients}
                detail="Registered across clinics"
              />
              <MetricCard
                icon={IndianRupee}
                label="Revenue"
                value={inr(data.summary.totalRevenue)}
                detail={`Avg ${inr(data.summary.avgRevenuePerDoctor)} per doctor`}
              />
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={FileText}
                label="Prescriptions"
                value={data.summary.totalPrescriptions}
                detail={`${data.summary.prescriptionsLast7} in last 7 days`}
              />
              <MetricCard
                icon={Stethoscope}
                label="Today"
                value={data.summary.prescriptionsToday}
                detail="Prescriptions created today"
              />
              <MetricCard
                icon={LineChart}
                label="Queue"
                value={data.summary.queueEntries}
                detail={`${data.summary.completedQueueEntries} completed`}
              />
              <MetricCard
                icon={Database}
                label="Artifacts"
                value={data.summary.labReports + data.summary.templates}
                detail={`${data.summary.labReports} reports, ${data.summary.templates} templates`}
              />
            </section>

            <Card>
              <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <CardTitle className="text-base">Data Privacy Control</CardTitle>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    Encrypt all prescription clinical fields
                  </span>
                  <Switch
                    checked={encryptionOn}
                    disabled={saving}
                    onCheckedChange={(checked) =>
                      updatePrescriptionPrivacy(Boolean(checked))
                    }
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Current mode</p>
                    <p className="mt-1 font-semibold">
                      {encryptionOn
                        ? "Full clinical encryption"
                        : "Identifier-only privacy mode"}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">
                      Encrypted fields
                    </p>
                    <p className="mt-1 font-semibold">
                      {encryptedFieldCount} of {data.fieldDefinitions.length}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">
                      Encrypted prescriptions
                    </p>
                    <p className="mt-1 font-semibold">
                      {data.summary.encryptedPrescriptions}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">
                      Encryption coverage
                    </p>
                    <p className="mt-1 font-semibold">
                      {percent(data.summary.clinicalEncryptionCoverage)}
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {groupedFieldDefinitions.map(([group, fields]) => (
                    <div key={group} className="rounded-lg border p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold">{group}</h3>
                        <Badge variant="secondary">
                          {
                            fields.filter(
                              (field) =>
                                data.privacySettings.fieldEncryption[field.id] !==
                                false
                            ).length
                          }
                          /{fields.length} encrypted
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        {fields.map((field) => {
                          const checked =
                            data.privacySettings.fieldEncryption[field.id] !== false;
                          return (
                            <div
                              key={field.id}
                              className="flex items-start justify-between gap-4 border-t pt-3 first:border-t-0 first:pt-0"
                            >
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-medium">
                                    {field.label}
                                  </p>
                                  {field.mandatory && (
                                    <Badge variant="outline">Mandatory</Badge>
                                  )}
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {field.description}
                                </p>
                              </div>
                              <Switch
                                size="sm"
                                checked={checked}
                                disabled={saving || field.mandatory}
                                onCheckedChange={(nextChecked) =>
                                  updateFieldPrivacy(
                                    field.id,
                                    Boolean(nextChecked)
                                  )
                                }
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Changes affect new writes and updates. Patient name and phone are
                  always encrypted; fields switched off are stored as plaintext for
                  easier analytics and database inspection.
                </p>
              </CardContent>
            </Card>

            <section className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Monthly Prescriptions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex h-48 items-end gap-2">
                    {data.series.map((point) => (
                      <div key={point.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                        <div
                          title={`${point.label}: ${point.prescriptions}`}
                          className="w-full rounded-t bg-primary"
                          style={{
                            height: `${Math.max(
                              3,
                              (point.prescriptions / maxPrescriptions) * 100
                            )}%`,
                          }}
                        />
                        <span className="truncate text-[10px] text-muted-foreground">
                          {point.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Monthly Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex h-48 items-end gap-2">
                    {data.series.map((point) => (
                      <div key={point.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                        <div
                          title={`${point.label}: ${inr(point.revenue)}`}
                          className="w-full rounded-t bg-chart-4"
                          style={{
                            height: `${Math.max(
                              3,
                              (point.revenue / maxRevenue) * 100
                            )}%`,
                          }}
                        />
                        <span className="truncate text-[10px] text-muted-foreground">
                          {point.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top Clinics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="py-2 font-medium">Doctor</th>
                          <th className="py-2 font-medium">Specialization</th>
                          <th className="py-2 text-right font-medium">Patients</th>
                          <th className="py-2 text-right font-medium">Rx</th>
                          <th className="py-2 text-right font-medium">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topDoctors.map((doctor) => (
                          <tr key={doctor.id} className="border-b last:border-0">
                            <td className="py-3">
                              <p className="font-medium">{doctor.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {doctor.clinicName || doctor.email}
                              </p>
                            </td>
                            <td className="py-3">{doctor.specialization}</td>
                            <td className="py-3 text-right">{doctor.patients}</td>
                            <td className="py-3 text-right">{doctor.prescriptions}</td>
                            <td className="py-3 text-right">{inr(doctor.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Signups</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.recentDoctors.map((doctor) => (
                      <div
                        key={doctor.id}
                        className="rounded-lg border p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{doctor.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {doctor.clinicName || doctor.email}
                            </p>
                          </div>
                          <Badge variant="secondary" className="shrink-0">
                            {new Date(doctor.createdAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </Badge>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {doctor.specialization}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>

            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
                  setToken("");
                  setInputToken("");
                  setData(null);
                }}
              >
                Lock company console
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 truncate text-2xl font-bold">{value}</p>
            <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
          </div>
          <div className={cn("rounded-lg bg-primary/10 p-2 text-primary")}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
