"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function queueCompleteHref(queueEntryId: string) {
  return `/queue?complete=${queueEntryId}`;
}

export function ConsultationDoneButton({
  queueEntryId,
  className,
}: {
  queueEntryId: string;
  className?: string;
}) {
  const router = useRouter();

  return (
    <Button
      type="button"
      size="lg"
      className={cn("gap-2", className)}
      onClick={() => router.push(queueCompleteHref(queueEntryId))}
    >
      <CheckCircle2 className="h-4 w-4" />
      Done
    </Button>
  );
}
