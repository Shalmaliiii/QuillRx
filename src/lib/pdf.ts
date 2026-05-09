import { PDFDocument, StandardFonts } from "pdf-lib";

export async function generatePrescriptionPdf(data: {
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  doctorName: string;
  qualification: string;
  registrationNumber: string;
  patientName: string;
  age: number;
  gender: string;
  date: string;
  diagnosis?: string;
  symptoms?: string;
  medicines: Array<{ name: string; timing: string; duration?: string; instructions?: string }>;
  advice?: string;
  followUpDate?: string;
  fees: { consultationFee: number; additionalCharges: number; discount: number; totalPayable: number };
}) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = 800;
  page.drawText(data.clinicName, { x: 40, y, font: bold, size: 18 });
  y -= 20;
  page.drawText(`${data.clinicAddress} | ${data.clinicPhone}`, { x: 40, y, font, size: 10 });
  y -= 20;
  page.drawText(`Dr. ${data.doctorName}, ${data.qualification} (Reg: ${data.registrationNumber})`, {
    x: 40,
    y,
    font,
    size: 11,
  });
  y -= 30;
  page.drawText(
    `Patient: ${data.patientName} | Age: ${data.age} | Gender: ${data.gender} | Date: ${data.date}`,
    {
      x: 40,
      y,
      font,
      size: 11,
    },
  );
  y -= 22;
  if (data.symptoms) {
    page.drawText(`Symptoms: ${data.symptoms}`, { x: 40, y, font, size: 11 });
    y -= 18;
  }
  if (data.diagnosis) {
    page.drawText(`Diagnosis: ${data.diagnosis}`, { x: 40, y, font: bold, size: 11 });
    y -= 18;
  }
  y -= 8;
  page.drawText("Rx", { x: 40, y, font: bold, size: 20 });
  y -= 24;
  data.medicines.forEach((med, i) => {
    page.drawText(`${i + 1}. ${med.name} (${med.timing}) ${med.duration ?? ""}`, { x: 45, y, font, size: 11 });
    y -= 16;
    if (med.instructions) {
      page.drawText(`   ${med.instructions}`, { x: 45, y, font, size: 10 });
      y -= 14;
    }
  });
  y -= 8;
  if (data.advice) {
    page.drawText(`Advice: ${data.advice}`, { x: 40, y, font, size: 11 });
    y -= 20;
  }
  page.drawText(`Total Payable: INR ${data.fees.totalPayable.toFixed(2)}`, { x: 40, y, font: bold, size: 12 });
  y -= 20;
  if (data.followUpDate) page.drawText(`Follow-up: ${data.followUpDate}`, { x: 40, y, font, size: 11 });
  page.drawText("Doctor Signature", { x: 450, y: 70, font, size: 10 });

  return Buffer.from(await pdf.save());
}
