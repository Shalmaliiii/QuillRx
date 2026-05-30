"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { usePageHeader } from "@/contexts/page-header-context";
import { format } from "date-fns";

interface PrescriptionListItem {
  id: string;
  createdAt: string;
  diagnosis: string | null;
  symptoms: string | null;
  totalAmount: number | null;
  medicines: Array<{ name: string }>;
  patient: {
    fullName: string;
    age: number;
    gender: string;
    phone: string;
  };
}

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<PrescriptionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    fetch(`/api/prescriptions?page=${page}&limit=20`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setPrescriptions(data.prescriptions || []);
          setTotal(data.total || 0);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled && err.name !== "AbortError") {
          console.error(err);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [page]);

  const totalPages = Math.ceil(total / 20);

  usePageHeader({
    title: "Prescriptions",
    description: `${total} total prescription${total !== 1 ? "s" : ""}`,
  });

  return (
    <div className="space-y-6">
      {loading ? (
        <p className="text-center text-muted-foreground py-12">Loading...</p>
      ) : prescriptions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">No prescriptions yet</p>
            <Link href="/prescriptions/new" className="mt-2 inline-block">
              <Button variant="link">Create your first prescription</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {prescriptions.map((rx) => (
              <Link key={rx.id} href={`/prescriptions/${rx.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
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
                          {rx.medicines.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {rx.medicines.slice(0, 3).map((m, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {m.name}
                                </Badge>
                              ))}
                              {rx.medicines.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{rx.medicines.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(rx.createdAt), "d MMM yyyy")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(rx.createdAt), "h:mm a")}
                        </p>
                        {rx.totalAmount ? (
                          <Badge variant="secondary" className="mt-1">
                            ₹{rx.totalAmount}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="flex items-center text-sm text-muted-foreground px-3">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
