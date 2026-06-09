"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { TemplateForm } from "@/components/templates/template-form";
import { usePageHeader } from "@/contexts/page-header-context";
import type { PrescriptionTemplateData } from "@/types";
import { toast } from "@/lib/toast";
import { Loader2 } from "lucide-react";

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [template, setTemplate] = useState<PrescriptionTemplateData | null>(null);
  const [loading, setLoading] = useState(true);

  usePageHeader({
    title: "Edit Template",
    backHref: "/templates",
  });

  useEffect(() => {
    fetch(`/api/prescription-templates/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(setTemplate)
      .catch(() => toast.error("Template not found"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!template) return null;

  return (
    <TemplateForm
      submitLabel="Save Changes"
      initial={{
        name: template.name,
        diagnosis: template.diagnosis ?? "",
        medicines: template.medicines,
        labTests: template.labTests ?? "",
        advice: template.advice ?? "",
        followUpDays:
          template.followUpDays != null ? String(template.followUpDays) : "",
      }}
      onSubmit={async (body) => {
        const res = await fetch(`/api/prescription-templates/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to update template");
        }
        toast.success("Template updated");
        router.push("/templates");
      }}
    />
  );
}
