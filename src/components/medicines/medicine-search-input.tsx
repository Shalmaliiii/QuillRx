"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { medicinePrescriptionName } from "@/lib/medicine-catalog";
import { Loader2, Pill, Plus } from "lucide-react";
import { toast } from "sonner";

export interface MedicineSearchResult {
  id: string;
  genericName: string;
  brandName: string | null;
  strength: string | null;
  form: string | null;
  displayName: string;
  source: string;
}

interface MedicineSearchInputProps {
  value: string;
  strength?: string;
  onNameChange: (name: string) => void;
  onStrengthChange?: (strength: string) => void;
  placeholder?: string;
  className?: string;
}

export function MedicineSearchInput({
  value,
  strength,
  onNameChange,
  onStrengthChange,
  placeholder = "Start typing medicine name…",
  className,
}: MedicineSearchInputProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [results, setResults] = useState<MedicineSearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 1) {
      setResults([]);
      setOpen(false);
      setSearched(false);
      setSearchError(false);
      return;
    }

    const t = setTimeout(async () => {
      setLoading(true);
      setOpen(true);
      setSearchError(false);
      try {
        const res = await fetch(
          `/api/medicines/search?q=${encodeURIComponent(query)}`
        );
        if (!res.ok) {
          setResults([]);
          setSearchError(true);
          return;
        }
        const data = await res.json();
        setResults(data.results ?? []);
        setActiveIndex(0);
      } catch {
        setResults([]);
        setSearchError(true);
      } finally {
        setLoading(false);
        setSearched(true);
      }
    }, 200);

    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const pick = (item: MedicineSearchResult) => {
    onNameChange(medicinePrescriptionName(item));
    if (onStrengthChange && item.strength && !strength?.trim()) {
      onStrengthChange(item.strength);
    }
    setOpen(false);
  };

  const addCustomMedicine = async () => {
    const name = value.trim();
    if (name.length < 2 || adding) return;

    setAdding(true);
    try {
      const res = await fetch("/api/medicines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genericName: name,
          strength: strength?.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add medicine");
      }

      const item = (await res.json()) as MedicineSearchResult & { created?: boolean };
      pick(item);
      toast.success(
        item.created ? `"${name}" added to your medicine list` : `"${name}" selected`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add medicine");
    } finally {
      setAdding(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;

    const hasAddOption = searched && !loading && results.length === 0 && value.trim().length >= 2;
    const totalOptions = results.length + (hasAddOption ? 1 : 0);

    if (totalOptions === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, totalOptions - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (hasAddOption && activeIndex === results.length) {
        addCustomMedicine();
      } else if (results[activeIndex]) {
        pick(results[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const query = value.trim();
  const showAddOption =
    searched && !loading && !searchError && results.length === 0 && query.length >= 2;

  return (
    <div ref={wrapRef} className="relative">
      <Pill className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onNameChange(e.target.value)}
        onFocus={() => value.trim() && setOpen(true)}
        onKeyDown={onKeyDown}
        className={cn("pl-9", className)}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {open && (
        <div className="absolute z-[100] mt-1 max-h-52 w-full overflow-y-auto rounded-md border bg-popover py-1 shadow-md">
          {loading ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Finding medicines…</p>
          ) : results.length > 0 ? (
            results.map((item, i) => (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-accent",
                  i === activeIndex && "bg-accent"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(item);
                }}
              >
                <span className="font-medium">{item.displayName}</span>
                <span className="text-xs text-muted-foreground">
                  {[item.form, item.source === "rxnorm" ? "RxNorm" : item.source === "doctor" ? "Added by you" : null]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </button>
            ))
          ) : showAddOption ? (
            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-accent",
                activeIndex === 0 && "bg-accent"
              )}
              disabled={adding}
              onMouseDown={(e) => {
                e.preventDefault();
                addCustomMedicine();
              }}
            >
              {adding ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
              ) : (
                <Plus className="h-4 w-4 shrink-0 text-primary" />
              )}
              <span>
                Add <span className="font-medium">&quot;{query}&quot;</span> to medicine list
              </span>
            </button>
          ) : searched ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              {searchError
                ? "Could not load suggestions — you can still enter a custom name."
                : query.length < 2
                  ? "Type at least 2 characters to search."
                  : "No matches — you can still enter a custom name."}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
