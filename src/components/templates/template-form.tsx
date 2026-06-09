"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { MedicineSearchInput } from "@/components/medicines/medicine-search-input";
import { emptyMedicine, templateToApiBody } from "@/lib/prescription-template";
import type { MedicineData } from "@/types";
import { toast } from "@/lib/toast";

type TemplateFormProps = {
  initial?: {
    name?: string;
    diagnosis?: string;
    medicines?: MedicineData[];
    labTests?: string;
    advice?: string;
    followUpDays?: string;
  };
  submitLabel: string;
  onSubmit: (body: ReturnType<typeof templateToApiBody>) => Promise<void>;
};

export function TemplateForm({ initial, submitLabel, onSubmit }: TemplateFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [diagnosis, setDiagnosis] = useState(initial?.diagnosis ?? "");
  const [medicines, setMedicines] = useState<MedicineData[]>(
    initial?.medicines?.length ? initial.medicines : [{ ...emptyMedicine }]
  );
  const [labTests, setLabTests] = useState(initial?.labTests ?? "");
  const [advice, setAdvice] = useState(initial?.advice ?? "");
  const [followUpDays, setFollowUpDays] = useState(initial?.followUpDays ?? "");

  const addMedicine = () => setMedicines((prev) => [...prev, { ...emptyMedicine }]);
  const removeMedicine = (index: number) =>
    setMedicines((prev) => prev.filter((_, i) => i !== index));
  const updateMedicine = (index: number, field: keyof MedicineData, value: string | boolean) =>
    setMedicines((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(
        templateToApiBody({
          name,
          diagnosis,
          medicines,
          labTests,
          advice,
          followUpDays,
        })
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save template");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Template Name *</Label>
            <Input
              placeholder="e.g. URTI – Adult, Hypertension follow-up"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label>Diagnosis</Label>
            <Textarea
              placeholder="Default diagnosis for this condition..."
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Medicines (Rx)</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addMedicine}>
            <PlusCircle className="h-4 w-4 mr-1" />
            Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {medicines.map((med, index) => (
            <div key={index} className="p-4 rounded-lg border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Medicine #{index + 1}
                </span>
                {medicines.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeMedicine(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Medicine Name</Label>
                  <MedicineSearchInput
                    value={med.name}
                    strength={med.strength ?? undefined}
                    onNameChange={(n) => updateMedicine(index, "name", n)}
                    onStrengthChange={(s) => updateMedicine(index, "strength", s)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Strength</Label>
                  <Input
                    value={med.strength || ""}
                    onChange={(e) => updateMedicine(index, "strength", e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-4 items-center">
                {(["morning", "afternoon", "night"] as const).map((slot) => (
                  <div key={slot} className="flex items-center gap-2">
                    <Checkbox
                      checked={med[slot]}
                      onCheckedChange={(v) => updateMedicine(index, slot, !!v)}
                    />
                    <Label className="text-sm font-normal capitalize">{slot}</Label>
                  </div>
                ))}
                <Separator orientation="vertical" className="h-5" />
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={med.beforeFood}
                    onCheckedChange={(v) => updateMedicine(index, "beforeFood", !!v)}
                  />
                  <Label className="text-sm font-normal">Before Food</Label>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Duration</Label>
                  <Input
                    value={med.duration || ""}
                    onChange={(e) => updateMedicine(index, "duration", e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Special Instructions</Label>
                  <Input
                    value={med.specialInstructions || ""}
                    onChange={(e) =>
                      updateMedicine(index, "specialInstructions", e.target.value)
                    }
                    className="h-10"
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Additional Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Lab Tests</Label>
            <Textarea
              placeholder="Recommended lab tests..."
              value={labTests}
              onChange={(e) => setLabTests(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Advice</Label>
            <Textarea
              placeholder="Patient advice for this condition..."
              value={advice}
              onChange={(e) => setAdvice(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2 sm:max-w-xs">
            <Label>Follow-up (days from visit)</Label>
            <Input
              type="number"
              min={0}
              placeholder="e.g. 7"
              value={followUpDays}
              onChange={(e) => setFollowUpDays(e.target.value)}
              className="h-11"
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full h-12" disabled={submitting}>
        {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  );
}
