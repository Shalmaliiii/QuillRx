import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "QuillRx",
  description: "Online Prescription & Clinic Management for Indian physicians",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className={`${geist.className} min-h-full bg-slate-50 text-slate-900`}>{children}</body>
    </html>
  );
}
