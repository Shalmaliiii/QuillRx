// Seeds demo patients + prescriptions for a given doctor so the dashboard
// charts (daily / weekly / monthly) and panels have data to render.
//
// Usage:
//   node scripts/seed-demo.mjs [email]
// Defaults to sujaidev55555@gmail.com.
//
// Demo records are tagged (patient.existingConditions === "DEMO_SEED") so the
// script is safe to re-run: it clears its own previous demo data first.

import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
import { PrismaClient } from "@prisma/client";

dotenvExpand.expand(dotenv.config());

const prisma = new PrismaClient();

const DEMO_TAG = "DEMO_SEED";
const email = process.argv[2] || "sujaidev55555@gmail.com";

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];
const round50 = (n) => Math.round(n / 50) * 50;

const PATIENTS = [
  { fullName: "Ananya Sharma", age: 34, gender: "Female", phone: "9876543210" },
  { fullName: "Rohan Mehta", age: 45, gender: "Male", phone: "9876543211" },
  { fullName: "Priya Iyer", age: 28, gender: "Female", phone: "9876543212" },
  { fullName: "Arjun Nair", age: 52, gender: "Male", phone: "9876543213" },
  { fullName: "Sneha Reddy", age: 39, gender: "Female", phone: "9876543214" },
  { fullName: "Vikram Singh", age: 61, gender: "Male", phone: "9876543215" },
  { fullName: "Meera Joshi", age: 23, gender: "Female", phone: "9876543216" },
  { fullName: "Karthik Rao", age: 48, gender: "Male", phone: "9876543217" },
  { fullName: "Divya Menon", age: 31, gender: "Female", phone: "9876543218" },
  { fullName: "Aditya Gupta", age: 56, gender: "Male", phone: "9876543219" },
];

const DIAGNOSES = [
  "Viral fever",
  "Hypertension follow-up",
  "Type 2 diabetes review",
  "Acute bronchitis",
  "Migraine",
  "Gastritis",
  "Seasonal allergic rhinitis",
  "Lower back pain",
  "Anemia",
  "Routine health check",
];

const SYMPTOMS = [
  "Fever, body ache",
  "Headache, dizziness",
  "Cough, sore throat",
  "Abdominal pain, nausea",
  "Fatigue, breathlessness",
  "Joint pain",
];

const MEDICINES = [
  { name: "Paracetamol", strength: "650mg", duration: "5 days" },
  { name: "Amoxicillin", strength: "500mg", duration: "7 days" },
  { name: "Metformin", strength: "500mg", duration: "30 days" },
  { name: "Amlodipine", strength: "5mg", duration: "30 days" },
  { name: "Pantoprazole", strength: "40mg", duration: "10 days" },
  { name: "Cetirizine", strength: "10mg", duration: "5 days" },
  { name: "Azithromycin", strength: "500mg", duration: "3 days" },
];

function buildMedicines() {
  const count = rand(1, 3);
  const chosen = [];
  const used = new Set();
  while (chosen.length < count) {
    const m = pick(MEDICINES);
    if (used.has(m.name)) continue;
    used.add(m.name);
    chosen.push({
      name: m.name,
      strength: m.strength,
      morning: Math.random() > 0.3,
      afternoon: Math.random() > 0.6,
      night: Math.random() > 0.4,
      beforeFood: Math.random() > 0.5,
      duration: m.duration,
      specialInstructions: null,
    });
  }
  return chosen;
}

async function main() {
  console.log(`Seeding demo data for: ${email}`);

  const doctor = await prisma.doctor.findUnique({ where: { email } });
  if (!doctor) {
    console.error(
      `No doctor found with email "${email}". Register/login with this email first, then re-run.`
    );
    process.exit(1);
  }

  // Clear previous demo data so re-runs don't pile up.
  const existingDemo = await prisma.patient.findMany({
    where: { doctorId: doctor.id, existingConditions: DEMO_TAG },
    select: { id: true },
  });
  if (existingDemo.length) {
    const ids = existingDemo.map((p) => p.id);
    const del = await prisma.prescription.deleteMany({
      where: { patientId: { in: ids } },
    });
    await prisma.patient.deleteMany({ where: { id: { in: ids } } });
    console.log(
      `Cleared ${existingDemo.length} demo patients and ${del.count} prescriptions.`
    );
  }

  // Create demo patients.
  const patients = [];
  for (const p of PATIENTS) {
    const created = await prisma.patient.create({
      data: {
        doctorId: doctor.id,
        fullName: p.fullName,
        age: p.age,
        gender: p.gender,
        phone: p.phone,
        weight: `${rand(50, 95)} kg`,
        bp: `${rand(110, 140)}/${rand(70, 90)}`,
        existingConditions: DEMO_TAG,
      },
    });
    patients.push(created);
  }
  console.log(`Created ${patients.length} demo patients.`);

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const prescriptions = [];

  // Spread prescriptions across the last 365 days (covers monthly view), with
  // denser activity in the recent weeks (covers daily/weekly views).
  for (let daysAgo = 365; daysAgo >= 0; daysAgo--) {
    const recent = daysAgo <= 30;
    const countPool = recent ? [0, 1, 1, 2, 3] : [0, 0, 0, 1, 2];
    const count = pick(countPool);

    for (let j = 0; j < count; j++) {
      const date = new Date(today);
      date.setDate(date.getDate() - daysAgo);
      date.setHours(rand(9, 19), rand(0, 59), 0, 0);

      const consultationFee = round50(rand(300, 800));
      const additionalCharges = Math.random() > 0.6 ? round50(rand(100, 600)) : 0;
      const discount = Math.random() > 0.8 ? round50(rand(50, 200)) : 0;
      const totalAmount = Math.max(0, consultationFee + additionalCharges - discount);

      // Follow-ups: a slice of recent visits get an upcoming follow-up date.
      let followUpDate = null;
      if (daysAgo <= 14 && Math.random() > 0.55) {
        const f = new Date(today);
        f.setDate(f.getDate() + rand(1, 21));
        followUpDate = f;
      }

      prescriptions.push({
        doctorId: doctor.id,
        patientId: pick(patients).id,
        symptoms: pick(SYMPTOMS),
        diagnosis: pick(DIAGNOSES),
        vitals: {
          bp: `${rand(110, 140)}/${rand(70, 90)}`,
          temperature: `${rand(97, 102)}.${rand(0, 9)} F`,
          weight: `${rand(50, 95)} kg`,
          pulse: `${rand(64, 96)}`,
        },
        medicines: buildMedicines(),
        advice: "Stay hydrated, adequate rest. Return if symptoms worsen.",
        followUpDate,
        consultationFee,
        additionalCharges,
        discount,
        totalAmount,
        createdAt: date,
        updatedAt: date,
      });
    }
  }

  // createMany doesn't support composite types on MongoDB reliably, so loop.
  let inserted = 0;
  for (const data of prescriptions) {
    await prisma.prescription.create({ data });
    inserted++;
  }

  console.log(`Created ${inserted} demo prescriptions.`);
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
