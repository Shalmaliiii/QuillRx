import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { PrescriptionData, DoctorProfile } from "@/types";

export async function generatePrescriptionPDF(
  prescription: PrescriptionData,
  doctor: DoctorProfile
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;

  const primaryColor = rgb(0.1, 0.45, 0.55);
  const textColor = rgb(0.1, 0.1, 0.1);
  const mutedColor = rgb(0.4, 0.4, 0.4);

  // Header - Clinic Name
  if (doctor.clinicName) {
    page.drawText(doctor.clinicName, {
      x: margin,
      y,
      size: 20,
      font: helveticaBold,
      color: primaryColor,
    });
    y -= 25;
  }

  // Doctor details
  page.drawText(`Dr. ${doctor.fullName}`, {
    x: margin,
    y,
    size: 14,
    font: helveticaBold,
    color: textColor,
  });
  y -= 18;

  page.drawText(`${doctor.qualification} | ${doctor.specialization}`, {
    x: margin,
    y,
    size: 10,
    font: helvetica,
    color: mutedColor,
  });
  y -= 15;

  page.drawText(`Reg. No: ${doctor.registrationNumber}`, {
    x: margin,
    y,
    size: 9,
    font: helvetica,
    color: mutedColor,
  });
  y -= 15;

  if (doctor.clinicAddress) {
    page.drawText(doctor.clinicAddress, {
      x: margin,
      y,
      size: 9,
      font: helvetica,
      color: mutedColor,
    });
    y -= 15;
  }

  if (doctor.clinicPhone) {
    page.drawText(`Phone: ${doctor.clinicPhone}`, {
      x: margin,
      y,
      size: 9,
      font: helvetica,
      color: mutedColor,
    });
    y -= 15;
  }

  // Divider
  y -= 5;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1.5,
    color: primaryColor,
  });
  y -= 20;

  // Patient details
  const patient = prescription.patient;
  if (patient) {
    page.drawText("Patient Details", {
      x: margin,
      y,
      size: 12,
      font: helveticaBold,
      color: textColor,
    });
    y -= 18;

    const patientInfo = `Name: ${patient.fullName}    Age: ${patient.age}    Gender: ${patient.gender}`;
    page.drawText(patientInfo, {
      x: margin,
      y,
      size: 10,
      font: helvetica,
      color: textColor,
    });
    y -= 15;

    if (patient.phone) {
      page.drawText(`Phone: ${patient.phone}`, {
        x: margin,
        y,
        size: 10,
        font: helvetica,
        color: textColor,
      });
      y -= 15;
    }
  }

  // Date
  const dateStr = new Date(prescription.createdAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  page.drawText(`Date: ${dateStr}`, {
    x: width - margin - 120,
    y: y + 15,
    size: 10,
    font: helvetica,
    color: textColor,
  });
  y -= 10;

  // Divider
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });
  y -= 20;

  // Vitals
  if (prescription.vitals) {
    const vitals = prescription.vitals;
    const vitalParts: string[] = [];
    if (vitals.bp) vitalParts.push(`BP: ${vitals.bp}`);
    if (vitals.temperature) vitalParts.push(`Temp: ${vitals.temperature}`);
    if (vitals.weight) vitalParts.push(`Weight: ${vitals.weight}`);
    if (vitals.pulse) vitalParts.push(`Pulse: ${vitals.pulse}`);

    if (vitalParts.length > 0) {
      page.drawText("Vitals:", {
        x: margin,
        y,
        size: 11,
        font: helveticaBold,
        color: textColor,
      });
      y -= 15;
      page.drawText(vitalParts.join("   |   "), {
        x: margin,
        y,
        size: 10,
        font: helvetica,
        color: textColor,
      });
      y -= 20;
    }
  }

  // Symptoms
  if (prescription.symptoms) {
    page.drawText("Symptoms:", {
      x: margin,
      y,
      size: 11,
      font: helveticaBold,
      color: textColor,
    });
    y -= 15;
    page.drawText(prescription.symptoms, {
      x: margin,
      y,
      size: 10,
      font: helvetica,
      color: textColor,
    });
    y -= 20;
  }

  // Diagnosis
  if (prescription.diagnosis) {
    page.drawText("Diagnosis:", {
      x: margin,
      y,
      size: 11,
      font: helveticaBold,
      color: textColor,
    });
    y -= 15;
    page.drawText(prescription.diagnosis, {
      x: margin,
      y,
      size: 10,
      font: helvetica,
      color: textColor,
    });
    y -= 20;
  }

  // Rx Symbol
  page.drawText("Rx", {
    x: margin,
    y,
    size: 18,
    font: helveticaBold,
    color: primaryColor,
  });
  y -= 25;

  // Medicines table
  if (prescription.medicines && prescription.medicines.length > 0) {
    const colX = [margin, margin + 180, margin + 280, margin + 370];
    const headers = ["Medicine", "Dosage", "Duration", "Instructions"];

    headers.forEach((header, i) => {
      page.drawText(header, {
        x: colX[i],
        y,
        size: 9,
        font: helveticaBold,
        color: mutedColor,
      });
    });
    y -= 5;
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.85),
    });
    y -= 15;

    for (const med of prescription.medicines) {
      const nameStr = med.strength ? `${med.name} (${med.strength})` : med.name;
      page.drawText(nameStr.substring(0, 30), {
        x: colX[0],
        y,
        size: 10,
        font: helvetica,
        color: textColor,
      });

      const dosageParts: string[] = [];
      if (med.morning) dosageParts.push("M");
      if (med.afternoon) dosageParts.push("A");
      if (med.night) dosageParts.push("N");
      const timing = med.beforeFood ? "Before food" : "After food";
      page.drawText(`${dosageParts.join("-")} (${timing})`, {
        x: colX[1],
        y,
        size: 10,
        font: helvetica,
        color: textColor,
      });

      if (med.duration) {
        page.drawText(med.duration, {
          x: colX[2],
          y,
          size: 10,
          font: helvetica,
          color: textColor,
        });
      }

      if (med.specialInstructions) {
        page.drawText(med.specialInstructions.substring(0, 20), {
          x: colX[3],
          y,
          size: 9,
          font: helvetica,
          color: mutedColor,
        });
      }

      y -= 18;
    }
  }

  y -= 10;

  // Lab Tests
  if (prescription.labTests) {
    page.drawText("Lab Tests:", {
      x: margin,
      y,
      size: 11,
      font: helveticaBold,
      color: textColor,
    });
    y -= 15;
    page.drawText(prescription.labTests, {
      x: margin,
      y,
      size: 10,
      font: helvetica,
      color: textColor,
    });
    y -= 20;
  }

  // Advice
  if (prescription.advice) {
    page.drawText("Advice:", {
      x: margin,
      y,
      size: 11,
      font: helveticaBold,
      color: textColor,
    });
    y -= 15;
    page.drawText(prescription.advice, {
      x: margin,
      y,
      size: 10,
      font: helvetica,
      color: textColor,
    });
    y -= 20;
  }

  // Follow-up
  if (prescription.followUpDate) {
    const followUp = new Date(prescription.followUpDate).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    page.drawText(`Follow-up: ${followUp}`, {
      x: margin,
      y,
      size: 10,
      font: helveticaBold,
      color: primaryColor,
    });
    y -= 25;
  }

  // Fees section
  if (prescription.totalAmount && prescription.totalAmount > 0) {
    y -= 10;
    page.drawLine({
      start: { x: width - margin - 200, y },
      end: { x: width - margin, y },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.85),
    });
    y -= 15;

    const feeX = width - margin - 200;
    if (prescription.consultationFee) {
      page.drawText(`Consultation Fee: Rs.${prescription.consultationFee}`, {
        x: feeX,
        y,
        size: 9,
        font: helvetica,
        color: textColor,
      });
      y -= 13;
    }
    if (prescription.additionalCharges && prescription.additionalCharges > 0) {
      page.drawText(`Additional: Rs.${prescription.additionalCharges}`, {
        x: feeX,
        y,
        size: 9,
        font: helvetica,
        color: textColor,
      });
      y -= 13;
    }
    if (prescription.discount && prescription.discount > 0) {
      page.drawText(`Discount: -Rs.${prescription.discount}`, {
        x: feeX,
        y,
        size: 9,
        font: helvetica,
        color: textColor,
      });
      y -= 13;
    }
    page.drawText(`Total: Rs.${prescription.totalAmount}`, {
      x: feeX,
      y,
      size: 11,
      font: helveticaBold,
      color: primaryColor,
    });
  }

  // Footer with signature area
  const footerY = 60;
  page.drawLine({
    start: { x: width - margin - 150, y: footerY + 30 },
    end: { x: width - margin, y: footerY + 30 },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });
  page.drawText(`Dr. ${doctor.fullName}`, {
    x: width - margin - 130,
    y: footerY + 15,
    size: 10,
    font: helveticaBold,
    color: textColor,
  });
  page.drawText("Signature", {
    x: width - margin - 100,
    y: footerY,
    size: 8,
    font: helvetica,
    color: mutedColor,
  });

  return pdfDoc.save();
}
