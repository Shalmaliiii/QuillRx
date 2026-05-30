import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { PrescriptionData, DoctorProfile } from "@/types";
import { readFile } from "fs/promises";
import path from "path";
import QRCode from "qrcode";
import { UPLOAD_DIR } from "@/lib/upload";

async function embedImage(pdfDoc: PDFDocument, filePath: string) {
  try {
    const filename = path.basename(filePath);
    const absolutePath = path.join(UPLOAD_DIR, filename);
    const imageBytes = await readFile(absolutePath);
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".png") {
      return await pdfDoc.embedPng(imageBytes);
    }
    return await pdfDoc.embedJpg(imageBytes);
  } catch {
    return null;
  }
}

function drawRoundedRect(
  page: ReturnType<PDFDocument["addPage"]>,
  x: number,
  y: number,
  w: number,
  h: number,
  color: ReturnType<typeof rgb>
) {
  page.drawRectangle({ x, y, width: w, height: h, color });
}

export async function generatePrescriptionPDF(
  prescription: PrescriptionData,
  doctor: DoctorProfile
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const { width, height } = page.getSize();
  const margin = 40;
  const contentWidth = width - margin * 2;
  let y = height - margin;

  // Color palette
  const primary = rgb(0.08, 0.40, 0.52);      // Deep teal
  const primaryLight = rgb(0.91, 0.96, 0.98);  // Light teal bg
  const accent = rgb(0.18, 0.60, 0.72);        // Accent teal
  const textDark = rgb(0.12, 0.12, 0.12);
  const textMuted = rgb(0.40, 0.40, 0.40);
  const textLight = rgb(0.55, 0.55, 0.55);
  const borderColor = rgb(0.85, 0.85, 0.85);
  const white = rgb(1, 1, 1);
  const tableBg = rgb(0.96, 0.97, 0.98);

  // ──────────────────────────────────────
  //  HEADER BAND
  // ──────────────────────────────────────
  const headerHeight = 80;
  drawRoundedRect(page, 0, height - headerHeight, width, headerHeight, primary);

  // Embed logo if available
  let logoEndX = margin + 10;
  if (doctor.logoUrl) {
    const logoImage = await embedImage(pdfDoc, doctor.logoUrl);
    if (logoImage) {
      const logoDim = logoImage.scale(1);
      const maxH = 50;
      const maxW = 50;
      const scale = Math.min(maxW / logoDim.width, maxH / logoDim.height);
      const lw = logoDim.width * scale;
      const lh = logoDim.height * scale;
      const logoX = margin + 10;
      const logoY = height - headerHeight / 2 - lh / 2;

      // White circle background for logo
      page.drawCircle({
        x: logoX + lw / 2,
        y: logoY + lh / 2,
        size: Math.max(lw, lh) / 2 + 5,
        color: white,
        opacity: 0.2,
      });

      page.drawImage(logoImage, {
        x: logoX,
        y: logoY,
        width: lw,
        height: lh,
      });
      logoEndX = logoX + lw + 15;
    }
  }

  // Clinic name in header
  const clinicTextX = logoEndX;
  if (doctor.clinicName) {
    page.drawText(doctor.clinicName, {
      x: clinicTextX,
      y: height - 35,
      size: 22,
      font: helveticaBold,
      color: white,
    });
  }

  // Doctor name + qualification below clinic name
  page.drawText(`Dr. ${doctor.fullName}`, {
    x: clinicTextX,
    y: height - 55,
    size: 12,
    font: helveticaBold,
    color: rgb(0.85, 0.95, 1),
  });

  const qualLine = `${doctor.qualification} | ${doctor.specialization}`;
  page.drawText(qualLine, {
    x: clinicTextX,
    y: height - 68,
    size: 9,
    font: helvetica,
    color: rgb(0.75, 0.90, 0.95),
  });

  // Right side of header — reg number
  const regText = `Reg. No: ${doctor.registrationNumber}`;
  const regWidth = helvetica.widthOfTextAtSize(regText, 8);
  page.drawText(regText, {
    x: width - margin - regWidth - 5,
    y: height - 35,
    size: 8,
    font: helvetica,
    color: rgb(0.75, 0.90, 0.95),
  });

  // ──────────────────────────────────────
  //  SUB-HEADER — Contact info bar
  // ──────────────────────────────────────
  const subHeaderH = 22;
  const subHeaderY = height - headerHeight - subHeaderH;
  drawRoundedRect(page, 0, subHeaderY, width, subHeaderH, primaryLight);

  const contactParts: string[] = [];
  if (doctor.clinicAddress) contactParts.push(doctor.clinicAddress);
  if (doctor.clinicPhone) contactParts.push(`Ph: ${doctor.clinicPhone}`);
  if (doctor.consultationTimings) contactParts.push(`Timings: ${doctor.consultationTimings}`);

  if (contactParts.length > 0) {
    page.drawText(contactParts.join("  |  "), {
      x: margin + 10,
      y: subHeaderY + 7,
      size: 7.5,
      font: helvetica,
      color: textMuted,
    });
  }

  y = subHeaderY - 18;

  // ──────────────────────────────────────
  //  PATIENT INFO + DATE ROW
  // ──────────────────────────────────────
  const patient = prescription.patient;
  const dateStr = new Date(prescription.createdAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // Patient info box
  const patientBoxH = patient ? 52 : 0;
  if (patient && patientBoxH > 0) {
    drawRoundedRect(page, margin, y - patientBoxH, contentWidth, patientBoxH, tableBg);

    page.drawText("PATIENT", {
      x: margin + 10,
      y: y - 14,
      size: 7,
      font: helveticaBold,
      color: accent,
    });

    page.drawText(patient.fullName, {
      x: margin + 10,
      y: y - 28,
      size: 11,
      font: helveticaBold,
      color: textDark,
    });

    const details = `Age: ${patient.age}  |  Gender: ${patient.gender}`;
    page.drawText(details, {
      x: margin + 10,
      y: y - 42,
      size: 9,
      font: helvetica,
      color: textMuted,
    });

    if (patient.phone) {
      page.drawText(`Ph: ${patient.phone}`, {
        x: margin + 10,
        y: y - 52,
        size: 9,
        font: helvetica,
        color: textMuted,
      });
    }

    // Date on right side
    page.drawText("DATE", {
      x: width - margin - 90,
      y: y - 14,
      size: 7,
      font: helveticaBold,
      color: accent,
    });
    page.drawText(dateStr, {
      x: width - margin - 90,
      y: y - 28,
      size: 11,
      font: helveticaBold,
      color: textDark,
    });

    y -= patientBoxH + 15;
  }

  // ──────────────────────────────────────
  //  VITALS — pill-style badges
  // ──────────────────────────────────────
  if (prescription.vitals) {
    const vitals = prescription.vitals;
    const vitalEntries: { label: string; value: string }[] = [];
    if (vitals.bp) vitalEntries.push({ label: "BP", value: vitals.bp });
    if (vitals.temperature) vitalEntries.push({ label: "Temp", value: vitals.temperature });
    if (vitals.weight) vitalEntries.push({ label: "Weight", value: vitals.weight });
    if (vitals.pulse) vitalEntries.push({ label: "Pulse", value: vitals.pulse });

    if (vitalEntries.length > 0) {
      let vx = margin;
      for (const v of vitalEntries) {
        const text = `${v.label}: ${v.value}`;
        const tw = helvetica.widthOfTextAtSize(text, 8) + 16;
        drawRoundedRect(page, vx, y - 14, tw, 18, primaryLight);
        page.drawText(text, {
          x: vx + 8,
          y: y - 10,
          size: 8,
          font: helveticaBold,
          color: primary,
        });
        vx += tw + 8;
      }
      y -= 28;
    }
  }

  // ──────────────────────────────────────
  //  SYMPTOMS & DIAGNOSIS — side by side
  // ──────────────────────────────────────
  if (prescription.symptoms || prescription.diagnosis) {
    const colWidth = (contentWidth - 15) / 2;

    if (prescription.symptoms) {
      page.drawText("SYMPTOMS", {
        x: margin,
        y,
        size: 7,
        font: helveticaBold,
        color: accent,
      });
      y -= 13;
      page.drawText(prescription.symptoms, {
        x: margin,
        y,
        size: 10,
        font: helvetica,
        color: textDark,
      });
    }

    if (prescription.diagnosis) {
      const diagX = prescription.symptoms ? margin + colWidth + 15 : margin;
      const diagLabelY = prescription.symptoms ? y + 13 : y;
      page.drawText("DIAGNOSIS", {
        x: diagX,
        y: diagLabelY,
        size: 7,
        font: helveticaBold,
        color: accent,
      });
      page.drawText(prescription.diagnosis, {
        x: diagX,
        y: diagLabelY - 13,
        size: 10,
        font: helvetica,
        color: textDark,
      });
    }
    y -= 22;
  }

  // ──────────────────────────────────────
  //  Rx SEPARATOR
  // ──────────────────────────────────────
  y -= 5;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: primary,
  });

  // Rx badge
  const rxBadgeW = 36;
  const rxBadgeH = 20;
  const rxX = margin;
  drawRoundedRect(page, rxX, y - rxBadgeH + 3, rxBadgeW, rxBadgeH, primary);
  page.drawText("Rx", {
    x: rxX + 8,
    y: y - 13,
    size: 14,
    font: helveticaBold,
    color: white,
  });
  y -= 30;

  // ──────────────────────────────────────
  //  MEDICINES TABLE
  // ──────────────────────────────────────
  if (prescription.medicines && prescription.medicines.length > 0) {
    const colX = [margin, margin + 170, margin + 280, margin + 370];
    const headers = ["Medicine", "Dosage", "Duration", "Instructions"];

    // Table header row
    drawRoundedRect(page, margin, y - 14, contentWidth, 18, primary);
    headers.forEach((header, i) => {
      page.drawText(header, {
        x: colX[i] + 6,
        y: y - 10,
        size: 8,
        font: helveticaBold,
        color: white,
      });
    });
    y -= 20;

    // Table rows
    for (let idx = 0; idx < prescription.medicines.length; idx++) {
      const med = prescription.medicines[idx];
      const rowH = 20;

      // Alternating row bg
      if (idx % 2 === 0) {
        drawRoundedRect(page, margin, y - rowH + 6, contentWidth, rowH, tableBg);
      }

      const nameStr = med.strength ? `${med.name} (${med.strength})` : med.name;
      page.drawText(nameStr.substring(0, 28), {
        x: colX[0] + 6,
        y: y - 8,
        size: 9,
        font: helvetica,
        color: textDark,
      });

      const dosageParts: string[] = [];
      if (med.morning) dosageParts.push("M");
      if (med.afternoon) dosageParts.push("A");
      if (med.night) dosageParts.push("N");
      const timing = med.beforeFood ? "Before food" : "After food";
      page.drawText(`${dosageParts.join("-")} (${timing})`, {
        x: colX[1] + 6,
        y: y - 8,
        size: 9,
        font: helvetica,
        color: textDark,
      });

      if (med.duration) {
        page.drawText(med.duration, {
          x: colX[2] + 6,
          y: y - 8,
          size: 9,
          font: helvetica,
          color: textDark,
        });
      }

      if (med.specialInstructions) {
        page.drawText(med.specialInstructions.substring(0, 20), {
          x: colX[3] + 6,
          y: y - 8,
          size: 8,
          font: helveticaOblique,
          color: textLight,
        });
      }

      y -= rowH;
    }

    // Bottom border of table
    page.drawLine({
      start: { x: margin, y: y + 6 },
      end: { x: width - margin, y: y + 6 },
      thickness: 0.5,
      color: borderColor,
    });
  }

  y -= 15;

  // ──────────────────────────────────────
  //  LAB TESTS
  // ──────────────────────────────────────
  if (prescription.labTests) {
    page.drawText("LAB TESTS", {
      x: margin,
      y,
      size: 7,
      font: helveticaBold,
      color: accent,
    });
    y -= 13;
    page.drawText(prescription.labTests, {
      x: margin,
      y,
      size: 10,
      font: helvetica,
      color: textDark,
    });
    y -= 18;
  }

  // ──────────────────────────────────────
  //  ADVICE
  // ──────────────────────────────────────
  if (prescription.advice) {
    page.drawText("ADVICE", {
      x: margin,
      y,
      size: 7,
      font: helveticaBold,
      color: accent,
    });
    y -= 13;
    page.drawText(prescription.advice, {
      x: margin,
      y,
      size: 10,
      font: helvetica,
      color: textDark,
    });
    y -= 18;
  }

  // ──────────────────────────────────────
  //  FOLLOW-UP
  // ──────────────────────────────────────
  if (prescription.followUpDate) {
    const followUp = new Date(prescription.followUpDate).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const fuBoxW = helveticaBold.widthOfTextAtSize(`Follow-up: ${followUp}`, 9) + 20;
    drawRoundedRect(page, margin, y - 14, fuBoxW, 20, primaryLight);
    page.drawText(`Follow-up: ${followUp}`, {
      x: margin + 10,
      y: y - 9,
      size: 9,
      font: helveticaBold,
      color: primary,
    });
    y -= 30;
  }

  // ──────────────────────────────────────
  //  FEES SECTION
  // ──────────────────────────────────────
  if (prescription.totalAmount && prescription.totalAmount > 0) {
    y -= 5;
    const feeX = width - margin - 180;
    page.drawLine({
      start: { x: feeX, y },
      end: { x: width - margin, y },
      thickness: 0.5,
      color: borderColor,
    });
    y -= 14;

    if (prescription.consultationFee) {
      page.drawText("Consultation Fee", {
        x: feeX,
        y,
        size: 8,
        font: helvetica,
        color: textMuted,
      });
      const feeVal = `Rs. ${prescription.consultationFee}`;
      const feeValW = helvetica.widthOfTextAtSize(feeVal, 8);
      page.drawText(feeVal, {
        x: width - margin - feeValW,
        y,
        size: 8,
        font: helvetica,
        color: textDark,
      });
      y -= 12;
    }
    if (prescription.additionalCharges && prescription.additionalCharges > 0) {
      page.drawText("Additional", {
        x: feeX,
        y,
        size: 8,
        font: helvetica,
        color: textMuted,
      });
      const addVal = `Rs. ${prescription.additionalCharges}`;
      const addValW = helvetica.widthOfTextAtSize(addVal, 8);
      page.drawText(addVal, {
        x: width - margin - addValW,
        y,
        size: 8,
        font: helvetica,
        color: textDark,
      });
      y -= 12;
    }
    if (prescription.discount && prescription.discount > 0) {
      page.drawText("Discount", {
        x: feeX,
        y,
        size: 8,
        font: helvetica,
        color: textMuted,
      });
      const discVal = `-Rs. ${prescription.discount}`;
      const discValW = helvetica.widthOfTextAtSize(discVal, 8);
      page.drawText(discVal, {
        x: width - margin - discValW,
        y,
        size: 8,
        font: helvetica,
        color: rgb(0.7, 0.2, 0.2),
      });
      y -= 12;
    }

    page.drawLine({
      start: { x: feeX, y: y + 4 },
      end: { x: width - margin, y: y + 4 },
      thickness: 0.5,
      color: borderColor,
    });
    y -= 4;

    const totalLabel = "Total";
    page.drawText(totalLabel, {
      x: feeX,
      y,
      size: 10,
      font: helveticaBold,
      color: primary,
    });
    const totalVal = `Rs. ${prescription.totalAmount}`;
    const totalValW = helveticaBold.widthOfTextAtSize(totalVal, 10);
    page.drawText(totalVal, {
      x: width - margin - totalValW,
      y,
      size: 10,
      font: helveticaBold,
      color: primary,
    });
  }

  // ──────────────────────────────────────
  //  FOOTER: QR Code + Signature
  // ──────────────────────────────────────
  const footerY = 55;

  // Thin accent line above footer
  page.drawLine({
    start: { x: margin, y: footerY + 75 },
    end: { x: width - margin, y: footerY + 75 },
    thickness: 0.5,
    color: borderColor,
  });

  // ── Payment QR Code (left side) ──
  try {
    const qrContent = prescription.totalAmount
      ? `upi://pay?am=${prescription.totalAmount}&cu=INR&tn=Consultation`
      : "upi://pay?cu=INR&tn=Consultation";
    const qrDataUrl = await QRCode.toDataURL(qrContent, {
      width: 200,
      margin: 1,
      color: { dark: "#1a6684", light: "#ffffff" },
    });
    const qrBase64 = qrDataUrl.split(",")[1];
    const qrBytes = Buffer.from(qrBase64, "base64");
    const qrImage = await pdfDoc.embedPng(qrBytes);
    const qrSize = 60;
    page.drawImage(qrImage, {
      x: margin,
      y: footerY + 5,
      width: qrSize,
      height: qrSize,
    });
    page.drawText("Scan to Pay", {
      x: margin + 8,
      y: footerY - 4,
      size: 7,
      font: helveticaBold,
      color: accent,
    });
  } catch {
    // QR generation failed — skip silently
  }

  // ── Signature (right side) ──
  const sigAreaX = width - margin - 140;

  if (doctor.signatureUrl) {
    const sigImage = await embedImage(pdfDoc, doctor.signatureUrl);
    if (sigImage) {
      const sigDim = sigImage.scale(1);
      const maxSigH = 45;
      const maxSigW = 120;
      const sigScale = Math.min(maxSigW / sigDim.width, maxSigH / sigDim.height);
      const sw = sigDim.width * sigScale;
      const sh = sigDim.height * sigScale;
      page.drawImage(sigImage, {
        x: sigAreaX + (140 - sw) / 2,
        y: footerY + 30,
        width: sw,
        height: sh,
      });
    }
  }

  // Signature line
  page.drawLine({
    start: { x: sigAreaX, y: footerY + 28 },
    end: { x: width - margin, y: footerY + 28 },
    thickness: 0.5,
    color: textMuted,
  });

  page.drawText(`Dr. ${doctor.fullName}`, {
    x: sigAreaX + 10,
    y: footerY + 15,
    size: 9,
    font: helveticaBold,
    color: textDark,
  });

  page.drawText("Signature", {
    x: sigAreaX + 40,
    y: footerY + 4,
    size: 7,
    font: helvetica,
    color: textLight,
  });

  // ── Footer accent bar ──
  drawRoundedRect(page, 0, 0, width, 8, primary);

  return pdfDoc.save();
}
