import { LoginForm } from "@/components/forms/login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md p-4 md:p-8">
      <h1 className="mb-4 text-2xl font-semibold">Doctor Login</h1>
      <LoginForm />
    </main>
  );
}
