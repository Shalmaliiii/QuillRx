export interface DoctorProfile {
  id: string;
  email: string;
  fullName: string;
  qualification: string;
  registrationNumber: string;
  specialization: string;
  mobileNumber: string;
  clinicName: string | null;
  clinicAddress: string | null;
  consultationTimings: string | null;
  clinicPhone: string | null;
  signatureUrl: string | null;
  logoUrl: string | null;
}

export interface PatientData {
  id: string;
  doctorId: string;
  fullName: string;
  age: number;
  gender: string;
  phone: string;
  weight: string | null;
  bp: string | null;
  diabetesStatus: string | null;
  allergies: string | null;
  existingConditions: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VitalData {
  bp?: string | null;
  temperature?: string | null;
  weight?: string | null;
  pulse?: string | null;
}

export interface MedicineData {
  name: string;
  strength?: string | null;
  morning: boolean;
  afternoon: boolean;
  night: boolean;
  beforeFood: boolean;
  duration?: string | null;
  specialInstructions?: string | null;
}

export interface PrescriptionData {
  id: string;
  doctorId: string;
  patientId: string;
  symptoms: string | null;
  diagnosis: string | null;
  vitals: VitalData | null;
  medicines: MedicineData[];
  labTests: string | null;
  advice: string | null;
  followUpDate: string | null;
  consultationFee: number | null;
  additionalCharges: number | null;
  discount: number | null;
  totalAmount: number | null;
  pdfUrl: string | null;
  createdAt: string;
  updatedAt: string;
  patient?: PatientData;
  doctor?: DoctorProfile;
}

export type QueueStatus =
  | "WAITING"
  | "IN_PROGRESS"
  | "DONE"
  | "NO_SHOW"
  | "CANCELLED";

export interface QueueEntryData {
  id: string;
  doctorId: string;
  patientId: string | null;
  name: string;
  age: number | null;
  gender: string | null;
  phone: string | null;
  reason: string;
  duration: string | null;
  severity: string | null;
  notes: string | null;
  tokenNumber: number;
  status: QueueStatus;
  source: string;
  calledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  todayPatients: number;
  totalConsultations: number;
  pendingFollowUps: number;
  recentPrescriptions: PrescriptionData[];
}
