import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-4">
      <h1 className="text-4xl font-bold tracking-tight">QuillRx</h1>
      <p className="mt-4 text-lg text-slate-600">
        Fast, modern and mobile-friendly online prescription management for clinics.
      </p>
      <div className="mt-8 flex gap-3">
        <Link className="rounded-md bg-slate-900 px-4 py-2 text-white" href="/register">
          Doctor Setup
        </Link>
        <Link className="rounded-md border px-4 py-2" href="/login">
          Login
        </Link>
      </div>
    </main>
  );
}
