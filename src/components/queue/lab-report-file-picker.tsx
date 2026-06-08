"use client";

import type { RefObject } from "react";
import { FileText, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type LabReportFilePickerProps = {
  id: string;
  inputRef: RefObject<HTMLInputElement | null>;
  selectedFiles: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
  multiple?: boolean;
};

export function LabReportFilePicker({
  id,
  inputRef,
  selectedFiles,
  onFilesChange,
  disabled,
  multiple,
}: LabReportFilePickerProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-border bg-muted/20 p-3",
        disabled && "opacity-60"
      )}
    >
      <Input
        ref={inputRef}
        id={id}
        type="file"
        multiple={multiple}
        accept="application/pdf,image/png,image/jpeg,image/webp"
        disabled={disabled}
        className="sr-only"
        onChange={(event) =>
          onFilesChange(Array.from(event.currentTarget.files ?? []))
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {selectedFiles.length > 0
              ? `${selectedFiles.length} file${selectedFiles.length === 1 ? "" : "s"} selected`
              : "No reports selected"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            PDF, PNG, JPEG, or WebP up to 10MB each.
          </p>
        </div>

        <Label
          htmlFor={id}
          className={cn(
            "inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-input bg-background px-3 text-sm font-semibold transition-colors hover:bg-accent",
            disabled && "pointer-events-none cursor-not-allowed"
          )}
        >
          <Upload className="h-4 w-4" />
          Choose {multiple ? "reports" : "report"}
        </Label>
      </div>

      {selectedFiles.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedFiles.map((file, index) => (
            <span
              key={`${file.name}-${file.size}-${index}`}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="max-w-48 truncate">{file.name}</span>
              <span className="shrink-0 text-primary/70">
                {formatFileSize(file.size)}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 100 ? 0 : 1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb >= 10 ? 1 : 2)} MB`;
}
