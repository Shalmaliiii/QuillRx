"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PageHeaderState {
  title: string;
  description?: string;
  backHref?: string;
}

interface PageHeaderContextValue {
  header: PageHeaderState;
  setHeader: (header: PageHeaderState) => void;
}

const PageHeaderContext = createContext<PageHeaderContextValue | null>(null);

export function PageHeaderProvider({ children }: { children: React.ReactNode }) {
  const [header, setHeader] = useState<PageHeaderState>({ title: "" });
  return (
    <PageHeaderContext.Provider value={{ header, setHeader }}>
      {children}
    </PageHeaderContext.Provider>
  );
}

export function usePageHeader({ title, description, backHref }: PageHeaderState) {
  const ctx = useContext(PageHeaderContext);
  const setHeader = ctx?.setHeader;
  useEffect(() => {
    setHeader?.({ title, description, backHref });
  }, [setHeader, title, description, backHref]);
}

export function PageHeading({ className }: { className?: string }) {
  const ctx = useContext(PageHeaderContext);
  const header = ctx?.header;

  if (!header?.title) return null;

  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      {header.backHref && (
        <Link href={header.backHref} aria-label="Back">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
      )}
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold tracking-tight md:text-2xl">
          {header.title}
        </h1>
        {header.description && (
          <p className="truncate text-sm text-muted-foreground">
            {header.description}
          </p>
        )}
      </div>
    </div>
  );
}
