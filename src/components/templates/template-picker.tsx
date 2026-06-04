"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ClipboardList, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { applyTemplateToForm } from "@/lib/prescription-template";
import type { PrescriptionTemplateData } from "@/types";
import type { TemplateFormValues } from "@/lib/prescription-template";
import { toast } from "sonner";

type TemplatePickerProps = {
  onApply: (values: Partial<TemplateFormValues>, templateName: string) => void;
};

export function TemplatePicker({ onApply }: TemplatePickerProps) {
  const [query, setQuery] = useState("");
  const [templates, setTemplates] = useState<PrescriptionTemplateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadTemplates = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const url = q
        ? `/api/prescription-templates?q=${encodeURIComponent(q)}`
        : "/api/prescription-templates";
      const res = await fetch(url);
      if (res.ok) setTemplates(await res.json());
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadTemplates(query.trim() || undefined), 250);
    return () => clearTimeout(timer);
  }, [query, loadTemplates]);

  const handleSelect = (template: PrescriptionTemplateData) => {
    setSelectedId(template.id);
    onApply(applyTemplateToForm(template), template.name);
    toast.success(`Applied "${template.name}"`);
  };

  return (
    <Card className="border-primary/20 bg-primary/[0.02]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          Quick Templates
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Search and tap a template to fill diagnosis, medicines, and notes
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates (e.g. fever, URTI, diabetes)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 h-11 bg-background"
          />
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading templates...
          </div>
        ) : templates.length === 0 ? (
          <p className="text-sm text-muted-foreground py-1">
            {query
              ? "No templates match your search."
              : "No templates yet — create some under Templates in the sidebar."}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleSelect(template)}
                className={cn(
                  "text-left rounded-lg border px-3 py-2 transition-colors hover:bg-accent/60 hover:border-primary/30",
                  selectedId === template.id && "border-primary bg-primary/10"
                )}
              >
                <p className="text-sm font-medium">{template.name}</p>
                {(template.diagnosis) && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {template.diagnosis}
                  </p>
                )}
                {template.medicines.length > 0 && (
                  <Badge variant="secondary" className="mt-1.5 text-[10px] h-5">
                    {template.medicines.length} med
                    {template.medicines.length !== 1 ? "s" : ""}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
