import { RegisterForm } from "@/components/forms/register-form";

export default function RegisterPage() {
  return (
    <main className="mx-auto max-w-3xl p-4 md:p-8">
      <h1 className="mb-4 text-2xl font-semibold">Doctor Onboarding</h1>
      <RegisterForm />
    </main>
  );
}
