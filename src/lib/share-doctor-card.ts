export type ShareDoctorCardResult = "shared" | "downloaded";

export async function shareDoctorCardPdf(options: {
  pdfUrl: string;
  fileName: string;
  title: string;
  text?: string;
}): Promise<ShareDoctorCardResult> {
  const res = await fetch(options.pdfUrl);
  if (!res.ok) {
    throw new Error("Failed to generate visiting card");
  }

  const blob = await res.blob();
  const file = new File([blob], options.fileName, { type: "application/pdf" });

  if (typeof navigator !== "undefined" && navigator.share) {
    const canShareFiles =
      !navigator.canShare || navigator.canShare({ files: [file] });

    if (canShareFiles) {
      try {
        await navigator.share({
          files: [file],
          title: options.title,
          text: options.text,
        });
        return "shared";
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw error;
        }
      }
    }
  }

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = options.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);

  const message = encodeURIComponent(
    [
      options.text || options.title,
      "",
      "Please attach the visiting card PDF from your downloads.",
    ].join("\n")
  );
  window.open(`https://wa.me/?text=${message}`, "_blank", "noopener,noreferrer");

  return "downloaded";
}
