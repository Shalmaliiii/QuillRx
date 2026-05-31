"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Printer, QrCode, ExternalLink, Check } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";

export function QueueQRCard() {
  const { doctor } = useAuth();
  const [qr, setQr] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!doctor?.id) return;
    const link = `${window.location.origin}/q/${doctor.id}`;
    setUrl(link);
    QRCode.toDataURL(link, { width: 480, margin: 1, color: { dark: "#0e8c9e", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [doctor?.id]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Queue link copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const print = () => {
    if (!qr) return;
    const clinic = doctor?.clinicName || doctor?.fullName || "Our Clinic";
    const w = window.open("", "_blank", "width=600,height=800");
    if (!w) return;
    w.document.write(`
      <html><head><title>Queue QR — ${clinic}</title>
      <style>
        body{font-family:system-ui,sans-serif;text-align:center;padding:48px;color:#0f172a}
        h1{font-size:24px;margin:0 0 4px}
        p{color:#475569;margin:4px 0}
        img{width:320px;height:320px;margin:28px auto}
        .tag{margin-top:8px;font-size:18px;font-weight:600;color:#0e8c9e}
      </style></head>
      <body>
        <h1>${clinic}</h1>
        <p>Scan to join the queue</p>
        <img src="${qr}" alt="Queue QR" />
        <p class="tag">No app needed — just scan & check in</p>
        <script>window.onload=function(){window.print();}</script>
      </body></html>
    `);
    w.document.close();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <QrCode className="h-4 w-4 text-primary" />
          Clinic Queue QR
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Display this at your clinic. Patients scan it to check in — no app or
          login needed — and you&apos;ll see them in your live Queue.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        <div className="flex size-44 shrink-0 items-center justify-center rounded-xl border bg-white p-3">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="Queue QR code" className="size-full" />
          ) : (
            <QrCode className="h-10 w-10 text-muted-foreground/40" />
          )}
        </div>
        <div className="w-full space-y-3">
          <div className="rounded-lg bg-muted px-3 py-2 text-sm break-all text-muted-foreground">
            {url || "…"}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={print} className="gap-2" disabled={!qr}>
              <Printer className="h-4 w-4" />
              Print QR
            </Button>
            <Button variant="outline" onClick={copyLink} className="gap-2" disabled={!url}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              Copy link
            </Button>
            {url && (
              <a href={url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Preview
                </Button>
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
