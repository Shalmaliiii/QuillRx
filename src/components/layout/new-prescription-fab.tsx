"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PlusCircle, Minimize2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  readFabPrefs,
  subscribeFabPrefs,
  writeFabPrefs,
  type FabPrefs,
} from "@/lib/prescription-fab-prefs";

const DRAG_THRESHOLD = 6;
const FAB_SIZE = 56;
const EXPANDED_WIDTH = 220;
const EDGE = 16;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function NewPrescriptionFab() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [prefs, setPrefs] = useState<FabPrefs>(() => readFabPrefs());
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    startBottom: 24,
    startRight: 24,
  });
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePrefs = useCallback((patch: Partial<FabPrefs>) => {
    const next = { ...readFabPrefs(), ...patch };
    writeFabPrefs(next);
    setPrefs(next);
  }, []);

  const clampPosition = useCallback(
    (bottom: number, right: number, iconOnly = prefs.collapsed) => {
      const width = iconOnly ? FAB_SIZE : EXPANDED_WIDTH;
      const maxBottom = window.innerHeight - FAB_SIZE - EDGE;
      const maxRight = window.innerWidth - width - EDGE;
      return {
        bottom: clamp(bottom, EDGE, maxBottom),
        right: clamp(right, EDGE, maxRight),
      };
    },
    [prefs.collapsed]
  );

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    if (!localStorage.getItem("quillrx-fab")) {
      writeFabPrefs({ ...readFabPrefs(), collapsed: mobile });
    }
    setPrefs(readFabPrefs());
    setMounted(true);
    return subscribeFabPrefs(() => setPrefs(readFabPrefs()));
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const current = readFabPrefs();
    updatePrefs(clampPosition(current.bottom, current.right));
    // Re-clamp when switching collapsed ↔ expanded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.collapsed, mounted]);

  useEffect(() => {
    return () => {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    dragRef.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      startBottom: prefs.bottom,
      startRight: prefs.right,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      if (!dragRef.current.moved) {
        dragRef.current.moved = true;
        setIsDragging(true);
        if (tapTimerRef.current) {
          clearTimeout(tapTimerRef.current);
          tapTimerRef.current = null;
        }
      }
    }
    if (!dragRef.current.moved) return;
    updatePrefs(
      clampPosition(
        dragRef.current.startBottom - dy,
        dragRef.current.startRight - dx,
        true
      )
    );
  };

  const finishPointer = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const wasDrag = dragRef.current.moved;
    dragRef.current.active = false;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);

    if (wasDrag || !prefs.collapsed) return;

    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => {
      router.push("/prescriptions/new");
      tapTimerRef.current = null;
    }, 220);
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
      tapTimerRef.current = null;
    }
    updatePrefs({ collapsed: false });
  };

  const onCollapse = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updatePrefs({ collapsed: true });
  };

  if (pathname === "/prescriptions/new" || !mounted || !prefs.enabled) return null;

  return (
    <div
      className="fixed z-40 touch-none select-none"
      style={{ bottom: prefs.bottom, right: prefs.right }}
    >
      {prefs.collapsed ? (
        <button
          type="button"
          aria-label="New prescription — drag to move, tap to open, double-tap to expand"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finishPointer}
          onPointerCancel={finishPointer}
          onDoubleClick={onDoubleClick}
          className={cn(
            "flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30",
            "transition-[transform,box-shadow] hover:shadow-xl active:scale-95",
            isDragging ? "cursor-grabbing scale-105 shadow-2xl" : "cursor-grab"
          )}
        >
          <PlusCircle className="h-6 w-6 pointer-events-none" />
        </button>
      ) : (
        <div className="flex items-center gap-1.5">
          <Link
            href="/prescriptions/new"
            className="inline-flex h-14 items-center gap-2 rounded-full bg-primary px-5 font-medium text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-95"
          >
            <PlusCircle className="h-5 w-5" />
            <span>New Prescription</span>
          </Link>
          <button
            type="button"
            aria-label="Minimize to icon"
            onClick={onCollapse}
            className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-md transition-colors hover:bg-muted hover:text-foreground"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
