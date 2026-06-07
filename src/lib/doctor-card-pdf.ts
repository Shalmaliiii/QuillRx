import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import type { DoctorProfile } from "@/types";
import { readFile } from "fs/promises";
import path from "path";
import { UPLOAD_DIR } from "@/lib/upload";

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 420;

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapText(text: string, maxChars: number) {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function textLines(
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
  attrs = ""
) {
  const [first, ...rest] = lines;
  if (!first) return "";

  return `
    <text x="${x}" y="${y}" ${attrs}>${escapeXml(first)}
      ${rest
        .map((line) => `<tspan x="${x}" dy="${lineHeight}">${escapeXml(line)}</tspan>`)
        .join("")}
    </text>`;
}

async function logoDataUri(filePath?: string | null) {
  if (!filePath) return null;

  try {
    const filename = path.basename(filePath);
    const absolutePath = path.join(UPLOAD_DIR, filename);
    const bytes = await readFile(absolutePath);
    const ext = path.extname(filePath).toLowerCase();
    const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
    return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
  } catch {
    return null;
  }
}

function logoMarkup(dataUri: string | null, initial: string) {
  if (!dataUri) {
    return `
      <rect x="73" y="75" width="88" height="88" rx="22" fill="#ffffff"/>
      <text x="117" y="132" text-anchor="middle" class="logoInitial">${escapeXml(initial)}</text>
    `;
  }

  return `
    <rect x="73" y="75" width="88" height="88" rx="22" fill="#ffffff"/>
    <image href="${dataUri}" x="83" y="85" width="68" height="68" preserveAspectRatio="xMidYMid slice" clip-path="url(#logoClip)"/>
  `;
}

function iconMarkup(kind: "phone" | "mail" | "clock" | "map", cx: number, cy: number) {
  const pathByKind = {
    phone:
      '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.11 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.32 1.77.57 2.61a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.47-1.14a2 2 0 0 1 2.11-.45c.84.25 1.71.45 2.61.57A2 2 0 0 1 22 16.92Z"/>',
    mail:
      '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    map: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  };

  return `
    <g transform="translate(${cx - 22} ${cy - 22})">
      <circle cx="22" cy="22" r="22" fill="#0891a3" opacity="0.22"/>
      <svg x="10" y="10" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0891a3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        ${pathByKind[kind]}
      </svg>
    </g>
  `;
}

async function createDoctorCardSvg(doctor: DoctorProfile) {
  const logo = await logoDataUri(doctor.logoUrl);
  const initial = (doctor.fullName?.trim().charAt(0) || "D").toUpperCase();
  const displayName = doctor.fullName?.startsWith("Dr.")
    ? doctor.fullName
    : `Dr. ${doctor.fullName ?? ""}`.trim();
  const credentialLine = [doctor.qualification, doctor.specialization].filter(Boolean).join(" | ");

  const contactCandidates: Array<{ icon: "phone" | "mail" | "clock" | "map"; value: string }> = [
    { icon: "phone", value: doctor.clinicPhone || doctor.mobileNumber },
    { icon: "mail", value: doctor.email },
    { icon: "clock", value: doctor.consultationTimings || "" },
    { icon: "map", value: doctor.clinicAddress || "" },
  ];
  const contacts = contactCandidates.filter((item) => item.value);

  let contactY = 196;
  const contactRows = contacts
    .map((contact) => {
      const lines = wrapText(contact.value, contact.icon === "map" ? 58 : 42).slice(0, 3);
      const row = `
        ${iconMarkup(contact.icon, 590, contactY - 7)}
        ${textLines(lines, 628, contactY, 29, 'class="contactText"')}
      `;
      contactY += Math.max(50, lines.length * 29 + 18);
      return row;
    })
    .join("");

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">
  <defs>
    <linearGradient id="cardBg" x1="0" y1="0" x2="1200" y2="420" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#020617"/>
      <stop offset="0.5" stop-color="#164e63"/>
      <stop offset="1" stop-color="#0f172a"/>
    </linearGradient>
    <filter id="softBlur" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="34"/>
    </filter>
    <clipPath id="logoClip">
      <rect x="83" y="85" width="68" height="68" rx="17"/>
    </clipPath>
    <style>
      text {
        font-family: Arial, Helvetica, sans-serif;
        dominant-baseline: alphabetic;
      }
      .eyebrow {
        fill: #b8f3ff;
        fill-opacity: 0.72;
        font-size: 18px;
        font-weight: 700;
        letter-spacing: 9px;
      }
      .brandClinic {
        fill: #ffffff;
        fill-opacity: 0.8;
        font-size: 20px;
        font-weight: 700;
      }
      .doctorName {
        fill: #ffffff;
        font-size: 42px;
        font-weight: 700;
      }
      .credentials {
        fill: #b8f3ff;
        font-size: 22px;
        font-weight: 700;
      }
      .clinicLabel {
        fill: #0891a3;
        font-size: 18px;
        font-weight: 700;
        letter-spacing: 11px;
      }
      .clinicTitle {
        fill: #ffffff;
        font-size: 36px;
        font-weight: 700;
      }
      .contactText {
        fill: #ecfeff;
        fill-opacity: 0.9;
        font-size: 21px;
        font-weight: 700;
      }
      .regText {
        fill: #ffffff;
        font-size: 18px;
        font-weight: 700;
      }
      .logoInitial {
        fill: #0891a3;
        font-size: 42px;
        font-weight: 700;
      }
    </style>
  </defs>

  <rect x="0" y="0" width="1200" height="420" rx="22" fill="url(#cardBg)"/>
  <rect x="0.5" y="0.5" width="1199" height="419" rx="21.5" fill="none" stroke="#164e63" stroke-opacity="0.8"/>
  <circle cx="1084" cy="-20" r="176" fill="#0891a3" opacity="0.22" filter="url(#softBlur)"/>
  <circle cx="150" cy="438" r="144" fill="#22d3ee" opacity="0.10" filter="url(#softBlur)"/>

  <rect x="44" y="44" width="492" height="332" rx="24" fill="#ffffff" opacity="0.08" stroke="#ffffff" stroke-opacity="0.10"/>

  ${logoMarkup(logo, initial)}
  <text x="180" y="105" class="eyebrow">QUILLRX</text>
  <text x="180" y="135" class="brandClinic">${escapeXml(doctor.clinicName || "Clinic")}</text>

  ${textLines(wrapText(displayName || "Doctor", 22).slice(0, 2), 74, 255, 48, 'class="doctorName"')}
  ${credentialLine ? textLines(wrapText(credentialLine, 28).slice(0, 2), 74, 302, 28, 'class="credentials"') : ""}

  ${
    doctor.registrationNumber
      ? `
        <rect x="74" y="322" width="134" height="28" rx="14" fill="#ffffff" opacity="0.16"/>
        <text x="90" y="342" class="regText">Reg. ${escapeXml(doctor.registrationNumber)}</text>
      `
      : ""
  }

  <text x="568" y="84" class="clinicLabel">CLINIC</text>
  ${textLines(wrapText(doctor.clinicName || "Clinic", 24).slice(0, 2), 568, 132, 44, 'class="clinicTitle"')}

  ${contactRows}
</svg>
`;
}

export async function generateDoctorCardPDF(doctor: DoctorProfile): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([CARD_WIDTH, CARD_HEIGHT]);
  const svg = await createDoctorCardSvg(doctor);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const cardImage = await pdfDoc.embedPng(png);

  page.drawImage(cardImage, {
    x: 0,
    y: 0,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  });

  return pdfDoc.save();
}
