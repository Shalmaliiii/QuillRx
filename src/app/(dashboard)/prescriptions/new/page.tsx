"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  MapPin,
  Monitor,
  PlusCircle,
  Trash2,
  Search,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { usePageHeader } from "@/contexts/page-header-context";
import { MedicineSearchInput } from "@/components/medicines/medicine-search-input";
import { TemplatePicker } from "@/components/templates/template-picker";
import type { TemplateFormValues } from "@/lib/prescription-template";
import type { PatientData, MedicineData } from "@/types";
import { format } from "date-fns";

type VitalsState = {
  bp: string;
  temperature: string;
  weight: string;
  pulse: string;
};

type VitalField = keyof VitalsState;
type ConsultationMode = "OFFLINE" | "ONLINE";
type PatientGender = "Male" | "Female" | "Other";

type NewPatientForm = {
  fullName: string;
  phone: string;
  age: string;
  gender: PatientGender;
};

type LatestPrescriptionVitals = {
  createdAt: string;
  vitals: Partial<Record<VitalField, string | null>> | null;
};

const emptyVitals: VitalsState = {
  bp: "",
  temperature: "",
  weight: "",
  pulse: "",
};

const emptyNewPatientForm: NewPatientForm = {
  fullName: "",
  phone: "",
  age: "",
  gender: "Male",
};

const vitalFields: VitalField[] = ["bp", "temperature", "weight", "pulse"];
const vitalUnits: Record<VitalField, string> = {
  bp: "mmHg",
  temperature: "\u00b0F",
  weight: "kg",
  pulse: "bpm",
};

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
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [creatingPatient, setCreatingPatient] = useState(false);
  const searchRequestRef = useRef(0);
  const [newPatient, setNewPatient] = useState<NewPatientForm>({
    ...emptyNewPatientForm,
  });

  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [knownAllergies, setKnownAllergies] = useState("");
  const [consultationMode, setConsultationMode] =
    useState<ConsultationMode>("OFFLINE");
  const [vitals, setVitals] = useState<VitalsState>({ ...emptyVitals });
  const [vitalHistoryLabels, setVitalHistoryLabels] = useState<
    Partial<Record<VitalField, string>>
  >({});
  const [lastVitals, setLastVitals] = useState<VitalsState | null>(null);
  const [lastVitalsDate, setLastVitalsDate] = useState<string | null>(null);
  const vitalsRef = useRef<VitalsState>({ ...emptyVitals });
  const autoFilledVitalsRef = useRef<Set<VitalField>>(new Set());
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

  const updateVital = (field: VitalField, value: string) => {
    autoFilledVitalsRef.current.delete(field);
    setVitalHistoryLabels((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setVitals((prev) => {
      const next = { ...prev, [field]: value };
      vitalsRef.current = next;
      return next;
    });
  };

  const vitalHint = (field: VitalField) =>
    vitalHistoryLabels[field] ? (
      <span className="text-[10px] font-normal text-muted-foreground">
        {vitalHistoryLabels[field]}
      </span>
    ) : null;

  const reuseLastVitals = () => {
    if (!lastVitals || !lastVitalsDate) return;

    const nextVitals = { ...vitalsRef.current };
    const nextLabels: Partial<Record<VitalField, string>> = {};
    const filledFields = new Set<VitalField>();

    for (const field of vitalFields) {
      const previousValue = lastVitals[field].trim();
      if (!previousValue) continue;

      nextVitals[field] = previousValue;
      nextLabels[field] = lastVitalsDate;
      filledFields.add(field);
    }

    autoFilledVitalsRef.current = filledFields;
    vitalsRef.current = nextVitals;
    setVitals(nextVitals);
    setVitalHistoryLabels(nextLabels);
  };

  useEffect(() => {
    if (preselectedPatientId) {
      fetch(`/api/patients/${preselectedPatientId}`)
        .then((res) => res.json())
        .then((patient: PatientData) => {
          setSelectedPatient(patient);
          setKnownAllergies(patient.allergies?.trim() ?? "");
        })
        .catch(console.error);
    }
  }, [preselectedPatientId]);

  useEffect(() => {
    if (!prefilledSymptoms) return;

    const timer = window.setTimeout(() => {
      setSymptoms((prev) => prev || prefilledSymptoms);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [prefilledSymptoms]);

  useEffect(() => {
    const controller = new AbortController();
    const patientId = selectedPatient?.id;

    const timer = window.setTimeout(async () => {
      const previouslyAutoFilled = new Set(autoFilledVitalsRef.current);
      autoFilledVitalsRef.current.clear();
      setVitalHistoryLabels({});
      setLastVitals(null);
      setLastVitalsDate(null);

      if (previouslyAutoFilled.size > 0) {
        const nextVitals = { ...vitalsRef.current };
        previouslyAutoFilled.forEach((field) => {
          nextVitals[field] = "";
        });
        vitalsRef.current = nextVitals;
        setVitals(nextVitals);
      }

      if (!patientId) return;

      try {
        const params = new URLSearchParams({
          patientId,
          limit: "1",
        });
        const res = await fetch(`/api/prescriptions?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) return;

        const data = await res.json();
        const latest = data.prescriptions?.[0] as
          | LatestPrescriptionVitals
          | undefined;
        if (!latest?.vitals) return;

        const label = `Last recorded on ${format(
          new Date(latest.createdAt),
          "d MMM yyyy"
        )}`;
        const previousVitals: VitalsState = {
          bp: latest.vitals.bp?.trim() ?? "",
          temperature: latest.vitals.temperature?.trim() ?? "",
          weight: latest.vitals.weight?.trim() ?? "",
          pulse: latest.vitals.pulse?.trim() ?? "",
        };
        const hasPreviousVitals = vitalFields.some(
          (field) => previousVitals[field].length > 0
        );
        if (hasPreviousVitals) {
          setLastVitals(previousVitals);
          setLastVitalsDate(label);
        }

        const nextLabels: Partial<Record<VitalField, string>> = {};
        const filledFields = new Set<VitalField>();
        const nextVitals = { ...vitalsRef.current };

        for (const field of vitalFields) {
          const previousValue = previousVitals[field];
          if (!previousValue || nextVitals[field].trim()) continue;

          nextVitals[field] = previousValue;
          nextLabels[field] = label;
          filledFields.add(field);
        }

        autoFilledVitalsRef.current = filledFields;
        if (filledFields.size > 0) {
          vitalsRef.current = nextVitals;
          setVitals(nextVitals);
        }
        setVitalHistoryLabels(nextLabels);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error(error);
        }
      }
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [selectedPatient?.id]);

  const searchPatients = useCallback(async (rawQuery: string) => {
    const q = rawQuery.trim();
    const requestId = searchRequestRef.current + 1;
    searchRequestRef.current = requestId;

    setSearchResults([]);

    if (q.length < 2) {
      setSearching(false);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/patients/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (searchRequestRef.current === requestId) {
        setSearchResults(data);
      }
    } catch {
      if (searchRequestRef.current === requestId) {
        setSearchResults([]);
      }
    } finally {
      if (searchRequestRef.current === requestId) {
        setSearching(false);
      }
    }
  }, []);

  const updateNewPatient = <K extends keyof NewPatientForm>(
    field: K,
    value: NewPatientForm[K]
  ) => {
    setNewPatient((prev) => ({ ...prev, [field]: value }));
  };

  const openNewPatientForm = () => {
    setShowNewPatientForm(true);
    setSearchResults([]);
    setSearching(false);

    const query = searchQuery.trim();
    if (!query) return;

    setNewPatient((prev) => {
      const next = { ...prev };
      const looksLikePhone = /^[+\d\s()-]+$/.test(query);

      if (looksLikePhone && !next.phone.trim()) {
        next.phone = query;
      } else if (!looksLikePhone && !next.fullName.trim()) {
        next.fullName = query;
      }

      return next;
    });
  };

  const createPatient = async () => {
    const fullName = newPatient.fullName.trim();
    const phone = newPatient.phone.trim();
    const age = Number(newPatient.age);

    if (fullName.length < 2) {
      toast.error("Patient name is required");
      return;
    }
    if (phone.length < 10) {
      toast.error("Valid phone number is required");
      return;
    }
    if (!Number.isFinite(age) || age < 0 || age > 150) {
      toast.error("Valid age is required");
      return;
    }

    setCreatingPatient(true);
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone,
          age,
          gender: newPatient.gender,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add patient");
      }

      const patient = (await res.json()) as PatientData;
      setSelectedPatient(patient);
      setKnownAllergies(patient.allergies?.trim() ?? "");
      setSearchQuery("");
      setSearchResults([]);
      setShowNewPatientForm(false);
      setNewPatient({ ...emptyNewPatientForm });
      toast.success("Patient added and selected");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add patient");
    } finally {
      setCreatingPatient(false);
    }
  };

  useEffect(() => {
    if (showNewPatientForm) {
      return;
    }

    const timer = setTimeout(() => searchPatients(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchPatients, showNewPatientForm]);

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

  const applyTemplate = (values: Partial<TemplateFormValues>) => {
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
      knownAllergies: knownAllergies || undefined,
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
        consultationMode,
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
                    setKnownAllergies("");
                    setSearchQuery("");
                    setShowNewPatientForm(false);
                  }}
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative min-w-0 flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search patient by name or phone..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setSearchResults([]);
                      }}
                      className="pl-10 h-11"
                    />
                  </div>
                  <Button
                    type="button"
                    variant={showNewPatientForm ? "secondary" : "outline"}
                    className="h-11 shrink-0 gap-2"
                    onClick={() => {
                      if (showNewPatientForm) {
                        setShowNewPatientForm(false);
                      } else {
                        openNewPatientForm();
                      }
                    }}
                  >
                    {showNewPatientForm ? (
                      <X className="h-4 w-4" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                    {showNewPatientForm ? "Cancel" : "New patient"}
                  </Button>
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
                          setKnownAllergies(p.allergies?.trim() ?? "");
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
                {showNewPatientForm && (
                  <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Full Name *</Label>
                        <Input
                          placeholder="Patient name"
                          value={newPatient.fullName}
                          onChange={(e) => updateNewPatient("fullName", e.target.value)}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Phone *</Label>
                        <Input
                          placeholder="+91 98765 43210"
                          value={newPatient.phone}
                          onChange={(e) => updateNewPatient("phone", e.target.value)}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Age *</Label>
                        <Input
                          type="number"
                          placeholder="Age"
                          value={newPatient.age}
                          onChange={(e) => updateNewPatient("age", e.target.value)}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Gender *</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {(["Male", "Female", "Other"] as PatientGender[]).map(
                            (gender) => (
                              <Button
                                key={gender}
                                type="button"
                                variant={
                                  newPatient.gender === gender ? "default" : "outline"
                                }
                                size="sm"
                                className="h-10 px-2"
                                onClick={() => updateNewPatient("gender", gender)}
                              >
                                {gender}
                              </Button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        onClick={createPatient}
                        disabled={creatingPatient}
                        className="gap-2"
                      >
                        {creatingPatient ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserPlus className="h-4 w-4" />
                        )}
                        Add and select patient
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Consultation Mode */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Consultation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={consultationMode === "OFFLINE" ? "default" : "outline"}
                className="h-14 justify-start gap-3 px-4"
                onClick={() => setConsultationMode("OFFLINE")}
              >
                <MapPin className="h-4 w-4" />
                Offline
              </Button>
              <Button
                type="button"
                variant={consultationMode === "ONLINE" ? "default" : "outline"}
                className="h-14 justify-start gap-3 px-4"
                onClick={() => setConsultationMode("ONLINE")}
              >
                <Monitor className="h-4 w-4" />
                Online
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Vitals */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <CardTitle className="text-base">Vitals</CardTitle>
            {lastVitals && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={reuseLastVitals}
                className="h-8 shrink-0"
              >
                Use last vitals
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="flex min-h-5 items-center justify-between gap-2">
                  <Label>BP</Label>
                  {vitalHint("bp")}
                </div>
                <div className="flex items-center gap-2">
                  <Input placeholder="120/80" value={vitals.bp} onChange={(e) => updateVital("bp", e.target.value)} className="h-11 min-w-0 flex-1" />
                  <span className="w-10 shrink-0 text-xs text-muted-foreground">{vitalUnits.bp}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex min-h-5 items-center justify-between gap-2">
                  <Label>Temperature</Label>
                  {vitalHint("temperature")}
                </div>
                <div className="flex items-center gap-2">
                  <Input placeholder="98.6" value={vitals.temperature} onChange={(e) => updateVital("temperature", e.target.value)} className="h-11 min-w-0 flex-1" />
                  <span className="w-10 shrink-0 text-xs text-muted-foreground">{vitalUnits.temperature}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex min-h-5 items-center justify-between gap-2">
                  <Label>Weight</Label>
                  {vitalHint("weight")}
                </div>
                <div className="flex items-center gap-2">
                  <Input placeholder="70" value={vitals.weight} onChange={(e) => updateVital("weight", e.target.value)} className="h-11 min-w-0 flex-1" />
                  <span className="w-10 shrink-0 text-xs text-muted-foreground">{vitalUnits.weight}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex min-h-5 items-center justify-between gap-2">
                  <Label>Pulse</Label>
                  {vitalHint("pulse")}
                </div>
                <div className="flex items-center gap-2">
                  <Input placeholder="72" value={vitals.pulse} onChange={(e) => updateVital("pulse", e.target.value)} className="h-11 min-w-0 flex-1" />
                  <span className="w-10 shrink-0 text-xs text-muted-foreground">{vitalUnits.pulse}</span>
                </div>
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
            <div className="space-y-2">
              <Label>Known Allergies</Label>
              <Textarea
                placeholder="Known allergies from previous prescriptions..."
                value={knownAllergies}
                onChange={(e) => setKnownAllergies(e.target.value)}
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
                      strength={med.strength || undefined}
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
