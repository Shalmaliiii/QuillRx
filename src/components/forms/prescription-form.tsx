"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import QRCode from "qrcode";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { prescriptionSchema } from "@/lib/validations";
import { buildPrescriptionMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

type FormData = z.input<typeof prescriptionSchema>;

export function PrescriptionForm({
  patients,
  clinicName,
  appUrl,
}: {
  patients: Array<{ id: string; fullName: string; phoneNumber: string }>;
  clinicName: string;
  appUrl: string;
}) {
  const [link, setLink] = useState("");
  const [targetPhone, setTargetPhone] = useState("");
  const [targetName, setTargetName] = useState("");
  const [qr, setQr] = useState("");

  const { register, control, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      consultationFee: 500,
      additionalCharges: 0,
      discount: 0,
      medicines: [{ name: "", morning: true, afternoon: false, night: true }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "medicines" });

  const [rawFee = 0, rawExtra = 0, rawDiscount = 0] = useWatch({
    control,
    name: ["consultationFee", "additionalCharges", "discount"],
  });
  const fee = Number(rawFee) || 0;
  const extra = Number(rawExtra) || 0;
  const discount = Number(rawDiscount) || 0;
  const total = Math.max(0, fee + extra - discount);

  const onSubmit = async (data: FormData) => {
    const res = await fetch("/api/prescriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, totalPayable: total }),
    });
    if (!res.ok) return;
    const body = await res.json();
    const selectedPatient = patients.find((p) => p.id === data.patientId);
    setTargetPhone(selectedPatient?.phoneNumber || "");
    setTargetName(selectedPatient?.fullName || "Patient");
    const publicLink = `${appUrl}${body.publicUrl}`;
    setLink(publicLink);
    setQr(await QRCode.toDataURL(publicLink));
  };

  const whatsapp = buildWhatsAppUrl(
    targetPhone,
    buildPrescriptionMessage(targetName, clinicName, link, "Please follow as advised."),
  );

  return (
    <div className="space-y-4">
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <Input list="patients" placeholder="Patient ID" {...register("patientId")} />
        <datalist id="patients">
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.fullName} - {p.phoneNumber}
            </option>
          ))}
        </datalist>
        <Textarea placeholder="Symptoms" {...register("symptoms")} />
        <Textarea placeholder="Diagnosis" {...register("diagnosis")} />
        {fields.map((field, index) => (
          <div key={field.id} className="rounded border p-2">
            <Input placeholder="Medicine name" {...register(`medicines.${index}.name`)} />
            <Input className="mt-2" placeholder="Strength" {...register(`medicines.${index}.strength`)} />
            <div className="mt-2 flex gap-2 text-sm">
              <label><input type="checkbox" {...register(`medicines.${index}.morning`)} /> Morning</label>
              <label><input type="checkbox" {...register(`medicines.${index}.afternoon`)} /> Afternoon</label>
              <label><input type="checkbox" {...register(`medicines.${index}.night`)} /> Night</label>
            </div>
            <Input className="mt-2" placeholder="Duration" {...register(`medicines.${index}.duration`)} />
            <Input className="mt-2" placeholder="Instructions" {...register(`medicines.${index}.instructions`)} />
            <Button className="mt-2" type="button" variant="outline" onClick={() => remove(index)}>
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => append({ name: "", morning: false, afternoon: false, night: false })}
        >
          Add medicine
        </Button>
        <Textarea placeholder="Lab tests" {...register("labTests")} />
        <Textarea placeholder="Advice" {...register("advice")} />
        <Input type="date" {...register("followUpDate")} />
        <div className="grid grid-cols-3 gap-2">
          <Input type="number" placeholder="Consultation fee" {...register("consultationFee", { valueAsNumber: true })} />
          <Input type="number" placeholder="Additional" {...register("additionalCharges", { valueAsNumber: true })} />
          <Input type="number" placeholder="Discount" {...register("discount", { valueAsNumber: true })} />
        </div>
        <p className="text-sm font-semibold">Total payable: INR {total.toFixed(2)}</p>
        <Button>Generate Prescription</Button>
      </form>
      {link && (
        <div className="rounded border bg-white p-3">
          <a className="text-blue-700 underline" href={link} target="_blank" rel="noreferrer">
            Open Prescription
          </a>
          <div className="mt-2 flex gap-2">
            <a className="rounded bg-green-600 px-4 py-2 text-white" href={whatsapp} target="_blank" rel="noreferrer">
              Send on WhatsApp
            </a>
            <Button type="button" variant="outline" onClick={() => navigator.clipboard.writeText(link)}>
              Copy Link
            </Button>
          </div>
          {qr && (
            <Image
              src={qr}
              alt="Prescription QR"
              width={160}
              height={160}
              className="mt-3 rounded border p-1"
            />
          )}
        </div>
      )}
    </div>
  );
}
