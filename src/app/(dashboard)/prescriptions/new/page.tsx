"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  PlusCircle,
  Trash2,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { usePageHeader } from "@/contexts/page-header-context";
import { MedicineSearchInput } from "@/components/medicines/medicine-search-input";
import { TemplatePicker } from "@/components/templates/template-picker";
import type { TemplateFormValues } from "@/lib/prescription-template";
import type { PatientData, MedicineData } from "@/types";

const emptyMedicine: MedicineData = {
  name: "",
  strength: "",
  morning: false,
  afternoon: false,
  night: false,
  beforeFood: false,
  duration: "",
  specialInstructions: "",
};

export default function NewPrescriptionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPatientId = searchParams.get("patientId");
  const prefilledSymptoms = searchParams.get("symptoms");
  const queueEntryId = searchParams.get("queueEntryId");

  usePageHeader({ title: "New Prescription", backHref: "/prescriptions" });

  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PatientData[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientData | null>(null);

  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [vitals, setVitals] = useState({ bp: "", temperature: "", weight: "", pulse: "" });
  const [medicines, setMedicines] = useState<MedicineData[]>([{ ...emptyMedicine }]);
  const [labTests, setLabTests] = useState("");
  const [advice, setAdvice] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [consultationFee, setConsultationFee] = useState("");
  const [additionalCharges, setAdditionalCharges] = useState<
    { label: string; amount: string }[]
  >([{ label: "", amount: "" }]);
  const [discount, setDiscount] = useState("");

  const additionalTotal = additionalCharges.reduce(
    (sum, c) => sum + (parseFloat(c.amount) || 0),
    0
  );

  const total = Math.max(
    0,
    (parseFloat(consultationFee) || 0) +
      additionalTotal -
      (parseFloat(discount) || 0)
  );

  useEffect(() => {
    if (preselectedPatientId) {
      fetch(`/api/patients/${preselectedPatientId}`)
        .then((res) => res.json())
        .then(setSelectedPatient)
        .catch(console.error);
    }
  }, [preselectedPatientId]);

  useEffect(() => {
    if (prefilledSymptoms) {
      setSymptoms((prev) => prev || prefilledSymptoms);
    }
  }, [prefilledSymptoms]);

  const searchPatients = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/patients/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults(data);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchPatients(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchPatients]);

  const addMedicine = () => {
    setMedicines((prev) => [...prev, { ...emptyMedicine }]);
  };

  const removeMedicine = (index: number) => {
    setMedicines((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMedicine = (index: number, field: keyof MedicineData, value: string | boolean) => {
    setMedicines((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  };

  const addCharge = () => {
    setAdditionalCharges((prev) => [...prev, { label: "", amount: "" }]);
  };

  const removeCharge = (index: number) => {
    setAdditionalCharges((prev) =>
      prev.length === 1 ? [{ label: "", amount: "" }] : prev.filter((_, i) => i !== index)
    );
  };

  const updateCharge = (
    index: number,
    field: "label" | "amount",
    value: string
  ) => {
    setAdditionalCharges((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  };

  const applyTemplate = (values: Partial<TemplateFormValues>, _name: string) => {
    if (values.diagnosis != null) setDiagnosis(values.diagnosis);
    if (values.medicines) setMedicines(values.medicines);
    if (values.labTests != null) setLabTests(values.labTests);
    if (values.advice != null) setAdvice(values.advice);
    if (values.followUpDate != null) setFollowUpDate(values.followUpDate);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      toast.error("Please select a patient");
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        patientId: selectedPatient.id,
        symptoms: symptoms || undefined,
        diagnosis: diagnosis || undefined,
        vitals: {
          bp: vitals.bp || undefined,
          temperature: vitals.temperature || undefined,
          weight: vitals.weight || undefined,
          pulse: vitals.pulse || undefined,
        },
        medicines: medicines.filter((m) => m.name.trim()),
        labTests: labTests || undefined,
        advice: advice || undefined,
        followUpDate: followUpDate || undefined,
        consultationFee: parseFloat(consultationFee) || 0,
        additionalCharges: additionalTotal,
        discount: parseFloat(discount) || 0,
      };

      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create prescription");
      }

      const prescription = await res.json();
      toast.success("Prescription created!");
      const next = queueEntryId
        ? `/prescriptions/${prescription.id}?queueEntryId=${queueEntryId}`
        : `/prescriptions/${prescription.id}`;
      router.push(next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create prescription");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <TemplatePicker onApply={applyTemplate} />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Patient</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedPatient ? (
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div>
                  <p className="font-medium">{selectedPatient.fullName}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedPatient.age}y / {selectedPatient.gender} &middot; {selectedPatient.phone}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedPatient(null);
                    setSearchQuery("");
                  }}
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search patient by name or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>
                {searching && <p className="text-sm text-muted-foreground">Searching...</p>}
                {searchResults.length > 0 && (
                  <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                    {searchResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors"
                        onClick={() => {
                          setSelectedPatient(p);
                          setSearchQuery("");
                          setSearchResults([]);
                        }}
                      >
                        <p className="font-medium text-sm">{p.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.age}y / {p.gender} &middot; {p.phone}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vitals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vitals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>BP</Label>
                <Input placeholder="120/80" value={vitals.bp} onChange={(e) => setVitals({ ...vitals, bp: e.target.value })} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>Temperature</Label>
                <Input placeholder="98.6°F" value={vitals.temperature} onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>Weight</Label>
                <Input placeholder="70 kg" value={vitals.weight} onChange={(e) => setVitals({ ...vitals, weight: e.target.value })} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>Pulse</Label>
                <Input placeholder="72 bpm" value={vitals.pulse} onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })} className="h-11" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Symptoms & Diagnosis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clinical Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Symptoms</Label>
              <Textarea
                placeholder="Patient complaints and symptoms..."
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Diagnosis</Label>
              <Textarea
                placeholder="Clinical diagnosis..."
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Medicines */}
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
                    <Label className="text-xs">Medicine Name *</Label>
                    <MedicineSearchInput
                      value={med.name}
                      strength={med.strength ?? undefined}
                      onNameChange={(name) => updateMedicine(index, "name", name)}
                      onStrengthChange={(s) => updateMedicine(index, "strength", s)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Strength</Label>
                    <Input
                      placeholder="e.g. 500mg"
                      value={med.strength || ""}
                      onChange={(e) => updateMedicine(index, "strength", e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={med.morning}
                      onCheckedChange={(v) => updateMedicine(index, "morning", !!v)}
                    />
                    <Label className="text-sm font-normal">Morning</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={med.afternoon}
                      onCheckedChange={(v) => updateMedicine(index, "afternoon", !!v)}
                    />
                    <Label className="text-sm font-normal">Afternoon</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={med.night}
                      onCheckedChange={(v) => updateMedicine(index, "night", !!v)}
                    />
                    <Label className="text-sm font-normal">Night</Label>
                  </div>
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
                      placeholder="e.g. 5 days"
                      value={med.duration || ""}
                      onChange={(e) => updateMedicine(index, "duration", e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Special Instructions</Label>
                    <Input
                      placeholder="e.g. Take with warm water"
                      value={med.specialInstructions || ""}
                      onChange={(e) => updateMedicine(index, "specialInstructions", e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Lab Tests & Advice */}
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
                placeholder="Additional advice for patient..."
                value={advice}
                onChange={(e) => setAdvice(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Follow-up Date</Label>
              <Input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="h-11 w-auto"
              />
            </div>
          </CardContent>
        </Card>

        {/* Fees */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fees</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2 sm:max-w-xs">
              <Label>Consultation Fee (₹)</Label>
              <Input
                type="number"
                placeholder="0"
                value={consultationFee}
                onChange={(e) => setConsultationFee(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Additional Charges</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCharge}
                >
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Add charge
                </Button>
              </div>
              <div className="space-y-2">
                {additionalCharges.map((charge, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      placeholder="Description (e.g. Dressing, Injection)"
                      value={charge.label}
                      onChange={(e) => updateCharge(i, "label", e.target.value)}
                      className="h-11 flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="₹ 0"
                      value={charge.amount}
                      onChange={(e) => updateCharge(i, "amount", e.target.value)}
                      className="h-11 w-28 sm:w-32"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 shrink-0 text-muted-foreground"
                      onClick={() => removeCharge(i)}
                      aria-label="Remove charge"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              {additionalTotal > 0 && (
                <p className="text-xs text-muted-foreground">
                  Additional charges subtotal: ₹{additionalTotal.toFixed(2)}
                </p>
              )}
            </div>

            <div className="space-y-2 sm:max-w-xs">
              <Label>Discount (₹)</Label>
              <Input
                type="number"
                placeholder="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
              <span className="font-medium">Total Payable</span>
              <span className="text-2xl font-bold text-primary">₹{total.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full h-14 text-lg" disabled={submitting}>
          {submitting && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
          Create Prescription
        </Button>
      </form>
    </div>
  );
}
