"use client";

import Link from "next/link";
import { Pill, FileText, Users, Send, Shield, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const features = [
  {
    icon: FileText,
    title: "Digital Prescriptions",
    description: "Create professional prescriptions in under 2 minutes with smart forms.",
  },
  {
    icon: Send,
    title: "WhatsApp Sharing",
    description: "Send prescriptions directly to patients via WhatsApp with one tap.",
  },
  {
    icon: Users,
    title: "Patient Records",
    description: "Maintain complete patient history and past prescriptions.",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "HTTPS-ready with encrypted authentication and data protection.",
  },
  {
    icon: Smartphone,
    title: "Mobile Friendly",
    description: "Works beautifully on desktop, tablet, and phone during consultations.",
  },
  {
    icon: Pill,
    title: "Smart Medicine Entry",
    description: "Fast medicine entry with dosage, timing, and duration fields.",
  },
];

export default function LandingPage() {
  const { doctor, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && doctor) {
      router.push("/dashboard");
    }
  }, [doctor, loading, router]);

  return (
    <div className="min-h-screen">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Pill className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold tracking-tight">QuillRx</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto leading-tight">
              Digital Prescriptions,{" "}
              <span className="text-primary">Simplified</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              The modern prescription platform for Indian physicians. Create, manage,
              and share professional prescriptions — fast, secure, and mobile-friendly.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="h-12 px-8 text-base">
                  Start Free
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
              Everything you need for your clinic
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="bg-card rounded-xl border p-6 hover:shadow-md transition-shadow"
                >
                  <feature.icon className="h-10 w-10 text-primary mb-4" />
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} QuillRx. Built for Indian physicians.</p>
        </div>
      </footer>
    </div>
  );
}
