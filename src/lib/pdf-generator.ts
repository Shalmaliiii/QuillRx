import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from "pdf-lib";
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

type Color = ReturnType<typeof rgb>;

function drawRoundedRect(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
  color?: Color,
  opts: { radius?: number; borderColor?: Color; borderWidth?: number; opacity?: number } = {}
) {
  const r = Math.max(0, Math.min(opts.radius ?? 5, h / 2, w / 2));
  if (r === 0) {
    page.drawRectangle({
      x,
      y,
      width: w,
      height: h,
      color,
      borderColor: opts.borderColor,
      borderWidth: opts.borderWidth,
      opacity: opts.opacity,
    });
    return;
  }
  const top = y + h;
  const pathDef =
    `M ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} ` +
    `L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h} ` +
    `L ${r} ${h} Q 0 ${h} 0 ${h - r} ` +
    `L 0 ${r} Q 0 0 ${r} 0 Z`;
  page.drawSvgPath(pathDef, {
    x,
    y: top,
    color,
    borderColor: opts.borderColor,
    borderWidth: opts.borderWidth,
    opacity: opts.opacity,
    borderOpacity: opts.opacity,
  });
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
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
  const helveticaBoldOblique = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

  const { width, height } = page.getSize();
  const margin = 40;
  const contentWidth = width - margin * 2;

  // Palette — matches the app's teal/cyan primary (oklch hue 200).
  const primary = rgb(0.055, 0.553, 0.62); // App teal
  const primaryDeep = rgb(0.039, 0.435, 0.494); // Deeper teal (header band)
  const primaryLight = rgb(0.914, 0.969, 0.976); // Light teal tint
  const accent = rgb(0.086, 0.6, 0.674); // Accent teal (labels)
  const textDark = rgb(0.13, 0.15, 0.17);
  const textMuted = rgb(0.42, 0.45, 0.48);
  const textLight = rgb(0.58, 0.61, 0.64);
  const borderColor = rgb(0.88, 0.91, 0.92);
  const white = rgb(1, 1, 1);
  const cardBg = rgb(0.973, 0.984, 0.988);
  const danger = rgb(0.78, 0.27, 0.27);

  const headerTint = rgb(0.84, 0.95, 0.98);

  // ── small text helpers ──────────────────────────────────────────────
  const text = (
    s: string,
    x: number,
    yy: number,
    size: number,
    font: PDFFont,
    color: Color
  ) => page.drawText(s, { x, y: yy, size, font, color });

  const rightText = (
    s: string,
    rightX: number,
    yy: number,
    size: number,
    font: PDFFont,
    color: Color
  ) => {
    const w = font.widthOfTextAtSize(s, size);
    page.drawText(s, { x: rightX - w, y: yy, size, font, color });
  };

  // Section header: teal accent bar + label + hairline rule.
  const sectionHeader = (label: string, yy: number): number => {
    drawRoundedRect(page, margin, yy - 1, 3, 11, primary, { radius: 1.5 });
    text(label, margin + 10, yy, 9, helveticaBold, primary);
    const labelW = helveticaBold.widthOfTextAtSize(label, 9);
    page.drawLine({
      start: { x: margin + 10 + labelW + 10, y: yy + 3.5 },
      end: { x: width - margin, y: yy + 3.5 },
      thickness: 0.5,
      color: borderColor,
    });
    return yy - 18;
  };

  // ── HEADER BAND ─────────────────────────────────────────────────────
  const headerHeight = 94;
  drawRoundedRect(page, 0, height - headerHeight, width, headerHeight, primaryDeep, {
    radius: 0,
  });
  drawRoundedRect(page, 0, height - headerHeight - 3, width, 3, primary, { radius: 0 });

  let textX = margin + 4;
  if (doctor.logoUrl) {
    const logoImage = await embedImage(pdfDoc, doctor.logoUrl);
    if (logoImage) {
      const logoSize = 58;
      const logoX = margin;
      const cx = logoX + logoSize / 2;
      const cy = height - headerHeight / 2;
      page.drawCircle({ x: cx, y: cy, size: logoSize / 2 + 5, color: white, opacity: 0.95 });
      page.drawImage(logoImage, {
        x: logoX,
        y: cy - logoSize / 2,
        width: logoSize,
        height: logoSize,
      });
      textX = logoX + logoSize + 16;
    }
  }

  text(doctor.clinicName || `Dr. ${doctor.fullName}`, textX, height - 38, 23, helveticaBold, white);
  text(`Dr. ${doctor.fullName}`, textX, height - 57, 12, helveticaBold, headerTint);
  text(
    `${doctor.qualification} | ${doctor.specialization}`,
    textX,
    height - 72,
    9,
    helvetica,
    rgb(0.72, 0.88, 0.93)
  );

  // Top-right: "PRESCRIPTION" pill + reg number.
  const tag = "PRESCRIPTION";
  const tagSize = 8.5;
  const tagW = helveticaBold.widthOfTextAtSize(tag, tagSize) + 18;
  drawRoundedRect(page, width - margin - tagW, height - 40, tagW, 18, white, { radius: 9 });
  text(tag, width - margin - tagW + 9, height - 35.5, tagSize, helveticaBold, primaryDeep);
  rightText(
    `Reg. No: ${doctor.registrationNumber}`,
    width - margin,
    height - 58,
    8,
    helvetica,
    rgb(0.78, 0.92, 0.96)
  );

  // ── CONTACT BAR ─────────────────────────────────────────────────────
  const subHeaderH = 24;
  const subHeaderY = height - headerHeight - 3 - subHeaderH;
  drawRoundedRect(page, 0, subHeaderY, width, subHeaderH, primaryLight, { radius: 0 });

  const contactParts: string[] = [];
  if (doctor.clinicAddress) contactParts.push(doctor.clinicAddress);
  if (doctor.clinicPhone) contactParts.push(`Ph: ${doctor.clinicPhone}`);
  if (doctor.consultationTimings) contactParts.push(`Timings: ${doctor.consultationTimings}`);
  if (contactParts.length > 0) {
    text(contactParts.join("   •   "), margin, subHeaderY + 8.5, 8, helvetica, textMuted);
  }

  // ── FAINT Rx WATERMARK (drawn before content so text sits on top) ────
  const wmSize = 230;
  page.drawText("Rx", {
    x: width / 2 - helveticaBoldOblique.widthOfTextAtSize("Rx", wmSize) / 2,
    y: 300,
    size: wmSize,
    font: helveticaBoldOblique,
    color: primary,
    opacity: 0.05,
  });

  let y = subHeaderY - 24;

  // ── PATIENT CARD ────────────────────────────────────────────────────
  const patient = prescription.patient;
  const createdAt = new Date(prescription.createdAt);
  const dateStr = createdAt.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeStr = createdAt.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  if (patient) {
    const cardH = 60;
    drawRoundedRect(page, margin, y - cardH, contentWidth, cardH, white, {
      radius: 10,
      borderColor,
      borderWidth: 1,
    });

    // Avatar with patient initial (mirrors the app's circular initials).
    const avR = 19;
    const avCx = margin + 18 + avR;
    const avCy = y - cardH / 2;
    page.drawCircle({ x: avCx, y: avCy, size: avR, color: primaryLight });
    const initial = (patient.fullName?.trim()?.charAt(0) || "P").toUpperCase();
    const initW = helveticaBold.widthOfTextAtSize(initial, 17);
    text(initial, avCx - initW / 2, avCy - 6, 17, helveticaBold, primary);

    const infoX = avCx + avR + 16;
    text("PATIENT", infoX, y - 15, 7, helveticaBold, accent);
    text(patient.fullName, infoX, y - 31, 12.5, helveticaBold, textDark);
    const detailParts = [`Age: ${patient.age}`, patient.gender];
    if (patient.phone) detailParts.push(`Ph: ${patient.phone}`);
    text(detailParts.join("   •   "), infoX, y - 46, 9, helvetica, textMuted);

    // Date + time, right aligned.
    const dr = width - margin - 14;
    const consultationMode =
      prescription.consultationMode === "ONLINE" ? "Online" : "Offline";
    rightText("DATE", dr, y - 15, 7, helveticaBold, accent);
    rightText(dateStr, dr, y - 31, 11.5, helveticaBold, textDark);
    rightText(`${timeStr} - ${consultationMode}`, dr, y - 46, 9, helvetica, textMuted);

    y -= cardH + 20;
  }

  // ── VITALS (stat cards) ─────────────────────────────────────────────
  if (prescription.vitals) {
    const v = prescription.vitals;
    const entries: { label: string; value: string }[] = [];
    if (v.bp) entries.push({ label: "Blood Pressure", value: v.bp });
    if (v.temperature) entries.push({ label: "Temperature", value: v.temperature });
    if (v.weight) entries.push({ label: "Weight", value: v.weight });
    if (v.pulse) entries.push({ label: "Pulse", value: v.pulse });

    if (entries.length > 0) {
      y = sectionHeader("VITALS", y);
      const gap = 10;
      const n = entries.length;
      const cw = (contentWidth - gap * (n - 1)) / n;
      const ch = 36;
      entries.forEach((e, i) => {
        const cx = margin + i * (cw + gap);
        drawRoundedRect(page, cx, y - ch, cw, ch, primaryLight, { radius: 8 });
        text(e.label.toUpperCase(), cx + 10, y - 14, 6.5, helveticaBold, accent);
        text(e.value, cx + 10, y - 29, 12, helveticaBold, primaryDeep);
      });
      y -= ch + 20;
    }
  }

  // ── SYMPTOMS & DIAGNOSIS (paired cards) ─────────────────────────────
  if (prescription.knownAllergies) {
    y = sectionHeader("KNOWN ALLERGIES", y);
    const lines = wrapText(
      prescription.knownAllergies,
      helvetica,
      10,
      contentWidth - 24
    );
    const ch = 20 + lines.length * 13 + 8;
    drawRoundedRect(page, margin, y - ch, contentWidth, ch, rgb(1, 0.965, 0.965), {
      radius: 9,
      borderColor: rgb(0.95, 0.82, 0.82),
      borderWidth: 1,
    });
    let ly = y - 18;
    for (const line of lines) {
      text(line, margin + 12, ly, 10, helvetica, danger);
      ly -= 13;
    }
    y -= ch + 20;
  }

  if (prescription.symptoms || prescription.diagnosis) {
    const gap = 14;
    const colW = (contentWidth - gap) / 2;
    const innerW = colW - 24;
    const sympLines = prescription.symptoms
      ? wrapText(prescription.symptoms, helvetica, 10, innerW)
      : ["—"];
    const diagLines = prescription.diagnosis
      ? wrapText(prescription.diagnosis, helvetica, 10, innerW)
      : ["—"];
    const bodyLines = Math.max(sympLines.length, diagLines.length);
    const ch = 24 + bodyLines * 13 + 8;

    const drawNote = (
      x: number,
      label: string,
      lines: string[],
      tint: Color
    ) => {
      drawRoundedRect(page, x, y - ch, colW, ch, cardBg, {
        radius: 9,
        borderColor,
        borderWidth: 1,
      });
      // Left accent bar.
      drawRoundedRect(page, x, y - ch, 3.5, ch, tint, { radius: 1.5 });
      text(label, x + 14, y - 16, 7, helveticaBold, accent);
      let ly = y - 32;
      for (const line of lines) {
        text(line, x + 14, ly, 10, helvetica, textDark);
        ly -= 13;
      }
    };

    drawNote(margin, "SYMPTOMS", sympLines, primary);
    drawNote(margin + colW + gap, "DIAGNOSIS", diagLines, accent);
    y -= ch + 20;
  }

  // ── Rx / MEDICATIONS ────────────────────────────────────────────────
  if (prescription.medicines && prescription.medicines.length > 0) {
    // Rx heading.
    const rxH = 22;
    drawRoundedRect(page, margin, y - rxH + 4, 34, rxH, primary, { radius: 6 });
    text("Rx", margin + 8, y - 11, 15, helveticaBold, white);
    text("Medications", margin + 46, y - 10, 12.5, helveticaBold, textDark);
    y -= rxH + 6;

    const colX = [margin, margin + 232, margin + 322, margin + 432];
    const headers = ["Medicine", "Dosage", "Schedule", "Duration"];

    // Header row.
    const hH = 20;
    const tableTop = y + 4;
    drawRoundedRect(page, margin, y - hH + 4, contentWidth, hH, primary, { radius: 6 });
    headers.forEach((h, i) => {
      text(h.toUpperCase(), colX[i] + 8, y - 9, 8, helveticaBold, white);
    });
    y -= hH + 2;
    for (let idx = 0; idx < prescription.medicines.length; idx++) {
      const med = prescription.medicines[idx];
      const hasInstr = !!med.specialInstructions;
      const rowH = hasInstr ? 32 : 24;

      if (idx % 2 === 1) {
        drawRoundedRect(page, margin, y - rowH + 6, contentWidth, rowH, cardBg, { radius: 3 });
      }

      const nameStr = med.strength ? `${med.name} (${med.strength})` : med.name;
      text(
        nameStr.length > 36 ? nameStr.slice(0, 35) + "…" : nameStr,
        colX[0] + 8,
        y - 9,
        9.5,
        helveticaBold,
        textDark
      );
      if (hasInstr) {
        const instr = med.specialInstructions!;
        text(
          instr.length > 44 ? instr.slice(0, 43) + "…" : instr,
          colX[0] + 8,
          y - 21,
          7.5,
          helveticaOblique,
          textLight
        );
      }

      // Dosage in familiar morning-afternoon-night counts (1-0-1).
      const dose = `${med.morning ? 1 : 0}-${med.afternoon ? 1 : 0}-${med.night ? 1 : 0}`;
      text(dose, colX[1] + 8, y - 9, 10, helveticaBold, primaryDeep);

      text(med.beforeFood ? "Before food" : "After food", colX[2] + 8, y - 9, 8.5, helvetica, textMuted);

      if (med.duration) {
        text(med.duration, colX[3] + 8, y - 9, 8.5, helvetica, textDark);
      }

      y -= rowH;
    }

    // Table outline.
    drawRoundedRect(page, margin, y + 6, contentWidth, tableTop - (y + 6), undefined, {
      radius: 6,
      borderColor,
      borderWidth: 1,
    });
    y -= 18;
  }

  // ── LAB TESTS ───────────────────────────────────────────────────────
  if (prescription.labTests) {
    y = sectionHeader("INVESTIGATIONS", y);
    const lines = wrapText(prescription.labTests, helvetica, 10, contentWidth - 4);
    for (const line of lines) {
      text(line, margin, y, 10, helvetica, textDark);
      y -= 13;
    }
    y -= 10;
  }

  // ── ADVICE (accent card) ────────────────────────────────────────────
  if (prescription.advice) {
    const lines = wrapText(prescription.advice, helvetica, 10, contentWidth - 28);
    const ch = 22 + lines.length * 13 + 6;
    drawRoundedRect(page, margin, y - ch, contentWidth, ch, primaryLight, { radius: 9 });
    drawRoundedRect(page, margin, y - ch, 3.5, ch, primary, { radius: 1.5 });
    text("ADVICE", margin + 14, y - 15, 7, helveticaBold, accent);
    let ly = y - 31;
    for (const line of lines) {
      text(line, margin + 14, ly, 10, helvetica, textDark);
      ly -= 13;
    }
    y -= ch + 16;
  }

  // ── FOLLOW-UP ───────────────────────────────────────────────────────
  if (prescription.followUpDate) {
    const followUp = new Date(prescription.followUpDate).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const label = `Follow-up on ${followUp}`;
    const w = helveticaBold.widthOfTextAtSize(label, 9.5) + 26;
    drawRoundedRect(page, margin, y - 16, w, 22, primary, { radius: 11 });
    text(label, margin + 13, y - 10, 9.5, helveticaBold, white);
    y -= 32;
  }

  // ── FEES (highlighted card, right aligned) ──────────────────────────
  if (prescription.totalAmount && prescription.totalAmount > 0) {
    const rows: { label: string; value: string; color: Color }[] = [];
    if (prescription.consultationFee) {
      rows.push({
        label: "Consultation Fee",
        value: `Rs. ${prescription.consultationFee}`,
        color: textDark,
      });
    }
    if (prescription.additionalCharges && prescription.additionalCharges > 0) {
      rows.push({
        label: "Additional Charges",
        value: `Rs. ${prescription.additionalCharges}`,
        color: textDark,
      });
    }
    if (prescription.discount && prescription.discount > 0) {
      rows.push({
        label: "Discount",
        value: `- Rs. ${prescription.discount}`,
        color: danger,
      });
    }

    const feeW = 210;
    const feeX = width - margin - feeW;
    const totalBarH = 28;
    const feeH = 12 + rows.length * 15 + totalBarH;
    const feeTop = Math.max(y, 150); // keep clear of footer

    drawRoundedRect(page, feeX, feeTop - feeH, feeW, feeH, cardBg, {
      radius: 9,
      borderColor,
      borderWidth: 1,
    });

    let ry = feeTop - 18;
    for (const r of rows) {
      text(r.label, feeX + 14, ry, 9, helvetica, textMuted);
      rightText(r.value, feeX + feeW - 14, ry, 9, helvetica, r.color);
      ry -= 15;
    }

    // Total bar.
    drawRoundedRect(page, feeX, feeTop - feeH, feeW, totalBarH, primary, { radius: 9 });
    text("TOTAL", feeX + 14, feeTop - feeH + 10, 11, helveticaBold, white);
    rightText(
      `Rs. ${prescription.totalAmount}`,
      feeX + feeW - 14,
      feeTop - feeH + 10,
      12,
      helveticaBold,
      white
    );
  }

  // ── FOOTER: QR + signature ──────────────────────────────────────────
  const footerY = 55;
  page.drawLine({
    start: { x: margin, y: footerY + 78 },
    end: { x: width - margin, y: footerY + 78 },
    thickness: 0.5,
    color: borderColor,
  });

  // Payment QR (left).
  try {
    const qrContent = prescription.totalAmount
      ? `upi://pay?am=${prescription.totalAmount}&cu=INR&tn=Consultation`
      : "upi://pay?cu=INR&tn=Consultation";
    const qrDataUrl = await QRCode.toDataURL(qrContent, {
      width: 200,
      margin: 1,
      color: { dark: "#0e8c9e", light: "#ffffff" },
    });
    const qrBytes = Buffer.from(qrDataUrl.split(",")[1], "base64");
    const qrImage = await pdfDoc.embedPng(qrBytes);
    const qrSize = 58;
    page.drawImage(qrImage, { x: margin, y: footerY + 8, width: qrSize, height: qrSize });
    text("Scan to Pay", margin + 6, footerY - 2, 7, helveticaBold, accent);
  } catch {
    // QR generation failed — skip silently.
  }

  // Signature (right).
  const sigAreaX = width - margin - 150;
  if (doctor.signatureUrl) {
    const sigImage = await embedImage(pdfDoc, doctor.signatureUrl);
    if (sigImage) {
      const dim = sigImage.scale(1);
      const maxH = 45;
      const maxW = 130;
      const scale = Math.min(maxW / dim.width, maxH / dim.height);
      const sw = dim.width * scale;
      const sh = dim.height * scale;
      page.drawImage(sigImage, {
        x: sigAreaX + (150 - sw) / 2,
        y: footerY + 32,
        width: sw,
        height: sh,
      });
    }
  }
  page.drawLine({
    start: { x: sigAreaX, y: footerY + 30 },
    end: { x: width - margin, y: footerY + 30 },
    thickness: 0.5,
    color: textMuted,
  });
  rightText(`Dr. ${doctor.fullName}`, width - margin, footerY + 16, 9.5, helveticaBold, textDark);
  rightText("Signature", width - margin, footerY + 5, 7, helvetica, textLight);

  // Footer accent bar + generated note.
  drawRoundedRect(page, 0, 0, width, 8, primary, { radius: 0 });
  text(
    "This is a digitally generated prescription.",
    margin,
    16,
    6.5,
    helveticaOblique,
    textLight
  );

  return pdfDoc.save();
}
