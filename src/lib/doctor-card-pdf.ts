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

function wrapText(
  text: string,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  size: number,
  maxWidth: number
) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function generateDoctorCardPDF(
  doctor: DoctorProfile
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const W = 420;
  const H = 240;
  const page = pdfDoc.addPage([W, H]);

  const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const ink = rgb(0.09, 0.11, 0.14);
  const muted = rgb(0.42, 0.46, 0.52);
  const panel = rgb(0.1, 0.42, 0.52);
  const panelDeep = rgb(0.07, 0.32, 0.42);
  const white = rgb(1, 1, 1);
  const surface = rgb(0.98, 0.99, 0.99);
  const accent = rgb(0.72, 0.9, 0.94);

  const pad = 14;
  const panelW = 148;

  page.drawRectangle({
    x: pad - 2,
    y: pad - 3,
    width: W - pad * 2 + 4,
    height: H - pad * 2 + 6,
    color: rgb(0.88, 0.9, 0.92),
  });
  page.drawRectangle({
    x: pad,
    y: pad,
    width: W - pad * 2,
    height: H - pad * 2,
    color: surface,
  });

  page.drawRectangle({
    x: pad,
    y: pad,
    width: panelW,
    height: H - pad * 2,
    color: panel,
  });
  page.drawRectangle({
    x: pad,
    y: pad + (H - pad * 2) * 0.55,
    width: panelW,
    height: (H - pad * 2) * 0.45,
    color: panelDeep,
  });

  page.drawCircle({
    x: pad + panelW - 18,
    y: H - pad - 22,
    size: 36,
    color: accent,
    opacity: 0.22,
  });
  page.drawCircle({
    x: pad + 24,
    y: pad + 28,
    size: 18,
    color: white,
    opacity: 0.08,
  });

  const docName = doctor.fullName?.startsWith("Dr.")
    ? doctor.fullName
    : `Dr. ${doctor.fullName ?? ""}`;

  let logoBottom = H - pad - 24;
  if (doctor.logoUrl) {
    const logo = await embedImage(pdfDoc, doctor.logoUrl);
    if (logo) {
      const size = 44;
      page.drawRectangle({
        x: pad + 18,
        y: H - pad - 18 - size,
        width: size,
        height: size,
        color: white,
        opacity: 0.95,
      });
      page.drawImage(logo, {
        x: pad + 20,
        y: H - pad - 16 - size,
        width: size - 4,
        height: size - 4,
      });
      logoBottom = H - pad - 18 - size - 12;
    }
  }

  const nameLines = wrapText(docName, bold, 13, panelW - 36);
  let nameY = logoBottom - 14;
  for (const line of nameLines.slice(0, 2)) {
    page.drawText(line, {
      x: pad + 18,
      y: nameY,
      size: 13,
      font: bold,
      color: white,
    });
    nameY -= 15;
  }

  const qualLine = [doctor.qualification, doctor.specialization]
    .filter(Boolean)
    .join(" · ");
  if (qualLine) {
    page.drawText(qualLine, {
      x: pad + 18,
      y: nameY - 2,
      size: 8.5,
      font: helv,
      color: rgb(0.82, 0.93, 0.96),
    });
    nameY -= 14;
  }

  if (doctor.registrationNumber) {
    const regLabel = `Reg. ${doctor.registrationNumber}`;
    page.drawRectangle({
      x: pad + 18,
      y: pad + 22,
      width: Math.min(helv.widthOfTextAtSize(regLabel, 7) + 16, panelW - 36),
      height: 16,
      color: white,
      opacity: 0.14,
    });
    page.drawText(regLabel, {
      x: pad + 24,
      y: pad + 27,
      size: 7,
      font: helv,
      color: white,
    });
  }

  const rx = pad + panelW + 22;
  const rw = W - rx - pad - 8;
  let cy = H - pad - 28;

  if (doctor.clinicName) {
    page.drawText("CLINIC", {
      x: rx,
      y: cy,
      size: 7,
      font: bold,
      color: muted,
    });
    cy -= 10;
    page.drawText(doctor.clinicName, {
      x: rx,
      y: cy - 2,
      size: 15,
      font: bold,
      color: ink,
    });
    cy -= 28;
  }

  const drawContact = (value?: string | null) => {
    if (!value) return;
    page.drawCircle({
      x: rx + 3,
      y: cy + 3,
      size: 3,
      color: panel,
    });
    const lines = wrapText(value, helv, 9, rw - 14);
    for (const line of lines.slice(0, 2)) {
      page.drawText(line, {
        x: rx + 12,
        y: cy,
        size: 9,
        font: helv,
        color: ink,
      });
      cy -= 12;
    }
    cy -= 4;
  };

  drawContact(doctor.clinicPhone || doctor.mobileNumber);
  drawContact(doctor.email);
  drawContact(doctor.consultationTimings);
  drawContact(doctor.clinicAddress);

  page.drawText("QuillRx", {
    x: rx,
    y: pad + 16,
    size: 7,
    font: bold,
    color: rgb(0.7, 0.75, 0.8),
  });

  return pdfDoc.save();
}
