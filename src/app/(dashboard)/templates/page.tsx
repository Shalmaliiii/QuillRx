"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Search, ClipboardList, Pencil, Trash2 } from "lucide-react";
import { usePageHeader } from "@/contexts/page-header-context";
import type { PrescriptionTemplateData } from "@/types";
import { toast } from "sonner";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<PrescriptionTemplateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  usePageHeader({
    title: "Templates",
    description: "Saved medicine sets for common conditions",
  });

  const loadTemplates = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const url = q
        ? `/api/prescription-templates?q=${encodeURIComponent(q)}`
        : "/api/prescription-templates";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load templates");
      setTemplates(await res.json());
    } catch {
      toast.error("Could not load templates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadTemplates(search.trim() || undefined), 300);
    return () => clearTimeout(timer);
  }, [search, loadTemplates]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete template "${name}"?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/prescription-templates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success("Template deleted");
    } catch {
      toast.error("Could not delete template");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link href="/templates/new">
          <Button>
            <PlusCircle className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, diagnosis..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11"
        />
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-12">Loading templates...</p>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">
              {search ? "No templates match your search" : "No templates yet"}
            </p>
            {!search && (
              <Link href="/templates/new" className="mt-2 inline-block">
                <Button variant="link">Create your first template</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader className="p-4 pb-2 flex flex-row items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <ClipboardList className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  {template.diagnosis && (
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                      {template.diagnosis}
                    </p>
                  )}
                  <div className="flex gap-2 flex-wrap mt-2">
                    <Badge variant="secondary">
                      {template.medicines.length} medicine
                      {template.medicines.length !== 1 ? "s" : ""}
                    </Badge>
                    {template.followUpDays != null && template.followUpDays > 0 && (
                      <Badge variant="outline">Follow-up +{template.followUpDays}d</Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Link href={`/templates/${template.id}/edit`}>
                    <Button variant="ghost" size="icon" aria-label="Edit template">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    disabled={deletingId === template.id}
                    onClick={() => handleDelete(template.id, template.name)}
                    aria-label="Delete template"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              {template.medicines.length > 0 && (
                <CardContent className="px-4 pb-4 pt-0">
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {template.medicines.map((m) => m.name).filter(Boolean).join(" · ")}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
