export function buildWhatsAppUrl(phone: string, message: string) {
  const sanitized = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${sanitized}?text=${encodeURIComponent(message)}`;
}

export function buildPrescriptionMessage(
  patientName: string,
  clinicName: string,
  pdfUrl: string,
  summary: string,
) {
  return `Hello ${patientName}, your prescription from ${clinicName} is ready.\n\nSummary: ${summary}\n\nDownload here:\n${pdfUrl}\n\nTake medicines as advised by the doctor.`;
}
