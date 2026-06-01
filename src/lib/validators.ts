import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Full name is required"),
  qualification: z.string().min(2, "Qualification is required"),
  registrationNumber: z.string().min(1, "Registration number is required"),
  specialization: z.string().min(2, "Specialization is required"),
  mobileNumber: z.string().min(10, "Valid mobile number is required"),
  clinicName: z.string().optional(),
  clinicAddress: z.string().optional(),
  consultationTimings: z.string().optional(),
  clinicPhone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const patientSchema = z.object({
  fullName: z.string().min(2, "Patient name is required"),
  age: z.number().min(0).max(150, "Invalid age"),
  gender: z.enum(["Male", "Female", "Other"]),
  phone: z.string().min(10, "Valid phone number is required"),
  weight: z.string().optional(),
  bp: z.string().optional(),
  diabetesStatus: z.string().optional(),
  allergies: z.string().optional(),
  existingConditions: z.string().optional(),
});

export const queueIntakeSchema = z.object({
  name: z.string().min(2, "Please enter your name"),
  age: z.coerce.number().min(0).max(150, "Invalid age"),
  gender: z.enum(["Male", "Female", "Other"]),
  phone: z.string().min(10, "Valid phone number is required"),
  reason: z.string().min(1, "Please select a reason for your visit"),
  duration: z.string().optional(),
  severity: z.string().optional(),
  notes: z.string().max(500, "Please keep notes brief").optional(),
});

export const medicineSchema = z.object({
  name: z.string().min(1, "Medicine name is required"),
  strength: z.string().optional(),
  morning: z.boolean().default(false),
  afternoon: z.boolean().default(false),
  night: z.boolean().default(false),
  beforeFood: z.boolean().default(false),
  duration: z.string().optional(),
  specialInstructions: z.string().optional(),
});

export const prescriptionSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  symptoms: z.string().optional(),
  diagnosis: z.string().optional(),
  vitals: z
    .object({
      bp: z.string().optional(),
      temperature: z.string().optional(),
      weight: z.string().optional(),
      pulse: z.string().optional(),
    })
    .optional(),
  medicines: z.array(medicineSchema).default([]),
  labTests: z.string().optional(),
  advice: z.string().optional(),
  followUpDate: z.string().optional(),
  consultationFee: z.coerce.number().min(0).default(0),
  additionalCharges: z.coerce.number().min(0).default(0),
  discount: z.coerce.number().min(0).default(0),
});

export const doctorProfileSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  qualification: z.string().min(2, "Qualification is required"),
  registrationNumber: z.string().min(1, "Registration number is required"),
  specialization: z.string().min(2, "Specialization is required"),
  mobileNumber: z.string().min(10, "Valid mobile number is required"),
  clinicName: z.string().optional(),
  clinicAddress: z.string().optional(),
  consultationTimings: z.string().optional(),
  clinicPhone: z.string().optional(),
});

export type QueueIntakeInput = z.infer<typeof queueIntakeSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PatientInput = z.infer<typeof patientSchema>;
export type PrescriptionInput = z.infer<typeof prescriptionSchema>;
export type DoctorProfileInput = z.infer<typeof doctorProfileSchema>;
