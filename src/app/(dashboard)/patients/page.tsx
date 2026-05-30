"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Search, Users } from "lucide-react";
import type { PatientData } from "@/types";
import { usePageHeader } from "@/contexts/page-header-context";
import { format } from "date-fns";

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  usePageHeader({
    title: "Patients",
    description: "Manage your patient records",
  });

  useEffect(() => {
    fetch("/api/patients")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load patients");
        return res.json();
      })
      .then(setPatients)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = patients.filter(
    (p) =>
      p.fullName.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link href="/patients/new">
          <Button>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Patient
          </Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11"
        />
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-12">Loading patients...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">
              {search ? "No patients match your search" : "No patients added yet"}
            </p>
            {!search && (
              <Link href="/patients/new" className="mt-2 inline-block">
                <Button variant="link">Add your first patient</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((patient) => (
            <Link key={patient.id} href={`/patients/${patient.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="p-4 pb-2 flex flex-row items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                    {patient.fullName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">
                      {patient.fullName}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {patient.age}y / {patient.gender} &middot; {patient.phone}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(patient.updatedAt), "d MMM yyyy")}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  <div className="flex gap-2 flex-wrap">
                    {patient.bp && <Badge variant="secondary">BP: {patient.bp}</Badge>}
                    {patient.diabetesStatus && patient.diabetesStatus !== "None" && (
                      <Badge variant="secondary">Diabetes: {patient.diabetesStatus}</Badge>
                    )}
                    {patient.allergies && (
                      <Badge variant="outline">Allergy: {patient.allergies}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
