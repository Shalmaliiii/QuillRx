"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { TopBar } from "@/components/layout/topbar";
import { NewPrescriptionFab } from "@/components/layout/new-prescription-fab";
import { PageHeaderProvider, PageHeading } from "@/contexts/page-header-context";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { doctor, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !doctor) {
      router.push("/login");
    }
  }, [doctor, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!doctor) return null;

  return (
    <PageHeaderProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <MobileNav />
          <TopBar />
          <div className="md:hidden border-b px-4 py-3">
            <PageHeading />
          </div>
          <main className="flex-1 p-4 md:p-8">{children}</main>
        </div>
      </div>
      <NewPrescriptionFab />
    </PageHeaderProvider>
  );
}
