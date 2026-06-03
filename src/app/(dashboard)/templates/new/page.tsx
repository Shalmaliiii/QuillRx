"use client";

import { useRouter } from "next/navigation";
import { TemplateForm } from "@/components/templates/template-form";
import { usePageHeader } from "@/contexts/page-header-context";
import { toast } from "sonner";

export default function NewTemplatePage() {
  const router = useRouter();

  usePageHeader({
    title: "New Template",
    backHref: "/templates",
  });

  return (
    <TemplateForm
      submitLabel="Create Template"
      onSubmit={async (body) => {
        const res = await fetch("/api/prescription-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to create template");
        }
        toast.success("Template created");
        router.push("/templates");
      }}
    />
  );
}
