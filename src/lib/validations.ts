import { z } from "zod";

export const registerSchema = z.object({
  fullName: z.string().min(3),
  qualification: z.string().min(2),
  registrationNumber: z.string().min(3),
  specialization: z.string().min(2),
  mobileNumber: z.string().min(10),
  email: z.email(),
  password: z.string().min(8),
  clinicName: z.string().min(2),
  clinicAddress: z.string().min(10),
  consultationTiming: z.string().min(3),
  clinicPhone: z.string().min(10),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export const patientSchema = z.object({
  fullName: z.string().min(2),
  age: z.coerce.number().int().min(0).max(130),
  gender: z.string().min(1),
  phoneNumber: z.string().min(10),
  weight: z.string().optional(),
  bloodPressure: z.string().optional(),
  diabetesStatus: z.string().optional(),
  allergies: z.string().optional(),
  existingConditions: z.string().optional(),
});

export const medicineSchema = z.object({
  name: z.string().min(1),
  strength: z.string().optional(),
  morning: z.boolean().default(false),
  afternoon: z.boolean().default(false),
  night: z.boolean().default(false),
  foodRelation: z.string().optional(),
  duration: z.string().optional(),
  instructions: z.string().optional(),
});

export const prescriptionSchema = z.object({
  patientId: z.string().min(1),
  symptoms: z.string().optional(),
  diagnosis: z.string().optional(),
  bp: z.string().optional(),
  temperature: z.string().optional(),
  weight: z.string().optional(),
  pulse: z.string().optional(),
  advice: z.string().optional(),
  labTests: z.string().optional(),
  followUpDate: z.string().optional(),
  consultationFee: z.coerce.number().min(0),
  additionalCharges: z.coerce.number().min(0),
  discount: z.coerce.number().min(0),
  medicines: z.array(medicineSchema).min(1),
});
