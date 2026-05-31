import { PDFDocument, rgb, StandardFonts, type PDFImage } from "pdf-lib";
import type { DoctorProfile } from "@/types";
import { readFile } from "fs/promises";
import path from "path";
import { UPLOAD_DIR } from "@/lib/upload";

async function embedImage(
  pdfDoc: PDFDocument,
  filePath: string
): Promise<PDFImage | null> {
  try {
    const filename = path.basename(filePath);
    const absolutePath = path.join(UPLOAD_DIR, filename);
    const imageBytes = await readFile(absolutePath);
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".png") return await pdfDoc.embedPng(imageBytes);
    return await pdfDoc.embedJpg(imageBytes);
  } catch {
    return null;
  }
}

export async function generateDoctorCardPDF(
  doctor: DoctorProfile
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const W = 360;
  const H = 210;
  const page = pdfDoc.addPage([W, H]);

  const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const primary = rgb(0.08, 0.4, 0.52);
  const white = rgb(1, 1, 1);
  const textDark = rgb(0.12, 0.12, 0.12);
  const textMuted = rgb(0.4, 0.4, 0.4);
  const border = rgb(0.85, 0.85, 0.85);

  // Background + left accent band
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: white });
  const bandW = 12;
  page.drawRectangle({ x: 0, y: 0, width: bandW, height: H, color: primary });

  const leftX = bandW + 16;
  let textX = leftX;

  // Logo (top-left)
  if (doctor.logoUrl) {
    const logo = await embedImage(pdfDoc, doctor.logoUrl);
    if (logo) {
      const size = 46;
      page.drawImage(logo, {
        x: leftX,
        y: H - 18 - size,
        width: size,
        height: size,
      });
      textX = leftX + size + 14;
    }
  }

  const docName = doctor.fullName?.startsWith("Dr.")
    ? doctor.fullName
    : `Dr. ${doctor.fullName ?? ""}`;

  page.drawText(docName, {
    x: textX,
    y: H - 34,
    size: 18,
    font: bold,
    color: primary,
  });

  const qualLine = [doctor.qualification, doctor.specialization]
    .filter(Boolean)
    .join("  |  ");
  if (qualLine) {
    page.drawText(qualLine, {
      x: textX,
      y: H - 50,
      size: 9,
      font: helv,
      color: textMuted,
    });
  }
  if (doctor.registrationNumber) {
    page.drawText(`Reg. No: ${doctor.registrationNumber}`, {
      x: textX,
      y: H - 63,
      size: 8,
      font: helv,
      color: textMuted,
    });
  }

  // Divider
  const divY = H - 80;
  page.drawLine({
    start: { x: leftX, y: divY },
    end: { x: W - 18, y: divY },
    thickness: 0.7,
    color: border,
  });

  let cy = divY - 18;

  if (doctor.clinicName) {
    page.drawText(doctor.clinicName, {
      x: leftX,
      y: cy,
      size: 13,
      font: bold,
      color: textDark,
    });
    cy -= 17;
  }

  const labelX = leftX;
  const valueX = leftX + 42;
  const drawLine = (label: string, value?: string | null) => {
    if (!value) return;
    page.drawText(label, {
      x: labelX,
      y: cy,
      size: 8,
      font: bold,
      color: primary,
    });
    page.drawText(value, {
      x: valueX,
      y: cy,
      size: 8.5,
      font: helv,
      color: textDark,
    });
    cy -= 13;
  };

  drawLine("Phone", doctor.clinicPhone || doctor.mobileNumber);
  drawLine("Email", doctor.email);
  drawLine("Hours", doctor.consultationTimings);

  if (doctor.clinicAddress) {
    page.drawText("Address", {
      x: labelX,
      y: cy,
      size: 8,
      font: bold,
      color: primary,
    });
    const maxWidth = W - valueX - 18;
    const words = doctor.clinicAddress.split(" ");
    let lineStr = "";
    let ay = cy;
    for (const w of words) {
      const test = lineStr ? `${lineStr} ${w}` : w;
      if (helv.widthOfTextAtSize(test, 8.5) > maxWidth && lineStr) {
        page.drawText(lineStr, { x: valueX, y: ay, size: 8.5, font: helv, color: textDark });
        ay -= 11;
        lineStr = w;
      } else {
        lineStr = test;
      }
    }
    if (lineStr) {
      page.drawText(lineStr, { x: valueX, y: ay, size: 8.5, font: helv, color: textDark });
    }
  }

  // Bottom accent bar
  page.drawRectangle({ x: 0, y: 0, width: W, height: 5, color: primary });

  return pdfDoc.save();
}
