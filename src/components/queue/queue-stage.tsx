"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2, Stethoscope, DoorOpen, DoorClosed, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { reasonLabel, reasonChipClasses } from "@/lib/queue-options";
import type { QueueEntryData } from "@/types";

/** Extra offset so the front doll clears the in-room name board when occupied. */
const OCCUPIED_LANE_OFFSET = 96;

function queueSlot(index: number, occupied = false) {
  const depth = index;
  const laneOffset = occupied ? OCCUPIED_LANE_OFFSET : 0;
  return {
    right: 118 + depth * 76 + laneOffset,
    scale: Math.max(0.62, 1 - depth * 0.11),
    lift: depth * 10,
    opacity: Math.max(0.72, 1 - depth * 0.1),
    zIndex: 30 - depth,
  };
}

interface QueueStageProps {
  waiting: QueueEntryData[];
  inProgress: QueueEntryData[];
  busy: boolean;
  exiting: QueueEntryData | null;
  onCallNext: (entry: QueueEntryData) => Promise<void>;
  onExitFinished: (entry: QueueEntryData) => Promise<void>;
  onConsultationEnded?: () => void;
}

export function QueueStage({
  waiting,
  inProgress,
  busy,
  exiting,
  onCallNext,
  onExitFinished,
  onConsultationEnded,
}: QueueStageProps) {
  const [walkingId, setWalkingId] = useState<string | null>(null);
  const [shuffling, setShuffling] = useState(false);
  const [exitPhase, setExitPhase] = useState<"idle" | "leaving" | "available">("idle");
  const [showExitDoll, setShowExitDoll] = useState(false);
  const exitRunRef = useRef<string | null>(null);

  const visible = waiting.slice(0, 7);
  const overflow = waiting.length - visible.length;
  const occupied = inProgress.length > 0 && !exiting;
  const doorAvailable = !occupied && exitPhase !== "leaving";
  const canCall =
    waiting.length > 0 && !busy && !walkingId && !occupied && exitPhase === "idle";

  useEffect(() => {
    if (!exiting) {
      exitRunRef.current = null;
      return;
    }
    if (exitRunRef.current === exiting.id) return;
    exitRunRef.current = exiting.id;

    let cancelled = false;
    (async () => {
      setShowExitDoll(true);
      setExitPhase("leaving");
      await new Promise((r) => setTimeout(r, 1600));
      if (cancelled) return;
      setShowExitDoll(false);
      setExitPhase("available");
      onConsultationEnded?.();
      await new Promise((r) => setTimeout(r, 700));
      if (cancelled) return;
      setExitPhase("idle");
      exitRunRef.current = null;
      await onExitFinished(exiting);
    })();

    return () => {
      cancelled = true;
    };
  }, [exiting, onExitFinished, onConsultationEnded]);

  const handleNext = async () => {
    const next = waiting[0];
    if (!next || walkingId) return;

    setWalkingId(next.id);
    await new Promise((r) => setTimeout(r, 1300));

    try {
      await onCallNext(next);
      setShuffling(true);
      await new Promise((r) => setTimeout(r, 600));
    } finally {
      setWalkingId(null);
      setShuffling(false);
    }
  };

  const activeInRoom = exiting ? null : inProgress[0] ?? null;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-b from-muted/50 via-card to-muted/70 shadow-lg dark:from-card dark:via-card dark:to-muted/40">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_85%_55%,color-mix(in_oklch,var(--primary)_22%,transparent),transparent_55%)] dark:bg-[radial-gradient(ellipse_at_85%_55%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_50%)]" />

        <div className="relative mx-auto h-[360px] max-w-3xl px-4 pt-5 sm:px-8">
          <p className="relative z-10 text-xs font-semibold uppercase tracking-widest text-foreground/65 dark:text-muted-foreground">
            Waiting room · {waiting.length} in line
          </p>

          <div className="pointer-events-none absolute inset-x-6 bottom-12 h-32">
            <div
              className="absolute inset-x-0 bottom-0 h-24 origin-bottom rounded-t-[50%] border-t border-primary/45 bg-gradient-to-t from-primary/30 via-primary/12 to-transparent dark:border-primary/25 dark:from-primary/15 dark:via-transparent"
              style={{ transform: "perspective(500px) rotateX(58deg)" }}
            />
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="absolute bottom-6 h-px bg-primary/40 dark:bg-primary/20"
                style={{
                  right: `${80 + i * 70}px`,
                  left: `${40 + i * 28}px`,
                  transform: `translateY(${-i * 6}px)`,
                  opacity: 1 - i * 0.12,
                }}
              />
            ))}
            <p className="absolute bottom-1 left-8 text-[9px] font-semibold uppercase tracking-wider text-foreground/50 dark:text-muted-foreground/60">
              Back of line
            </p>
            <p
              className={cn(
                "absolute bottom-1 text-[9px] font-semibold uppercase tracking-wider text-primary transition-[right] duration-500 dark:text-primary/70",
                occupied ? "right-52" : "right-28"
              )}
            >
              Next →
            </p>
          </div>

          <div className="absolute inset-x-4 bottom-[4.5rem] top-16 sm:inset-x-8">
            {visible.length === 0 && !showExitDoll ? (
              <div className="flex h-full items-end pb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-5 w-5 opacity-40" />
                  <span>Queue is empty — waiting for check-ins</span>
                </div>
              </div>
            ) : (
              visible.map((entry, index) => {
                const slot = queueSlot(index, occupied);
                const isFront = index === 0;
                const isWalking = walkingId === entry.id;
                return (
                  <PatientFigure
                    key={entry.id}
                    entry={entry}
                    slot={slot}
                    isFront={isFront}
                    isWalking={isWalking}
                    shuffling={shuffling && index > 0}
                    idleDelay={index * 0.18}
                    walkX={slot.right - 118}
                  />
                );
              })
            )}
            {overflow > 0 && (
              <div
                className="absolute bottom-2 flex h-12 w-12 items-center justify-center rounded-full border border-dashed bg-muted/60 text-xs font-semibold text-muted-foreground"
                style={{ right: queueSlot(7, occupied).right, opacity: 0.6, transform: "scale(0.7)" }}
              >
                +{overflow}
              </div>
            )}
          </div>

          <div className="absolute bottom-14 right-4 sm:right-8">
            <ConsultationDoor
              inProgress={activeInRoom}
              doorAvailable={doorAvailable}
              occupied={occupied}
            />
            {showExitDoll && exiting && (
              <ExitingPatientFigure entry={exiting} phase={exitPhase === "leaving" ? "leaving" : "idle"} />
            )}
          </div>
        </div>

        <div className="relative border-t bg-card/80 px-4 py-4 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-3xl flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              {activeInRoom ? (
                <p className="text-sm">
                  <span className="font-semibold text-destructive">In consultation:</span>{" "}
                  #{activeInRoom.tokenNumber} {activeInRoom.name}
                  <span className="ml-2 text-muted-foreground">
                    — {reasonLabel(activeInRoom.reason)}
                  </span>
                </p>
              ) : doorAvailable && waiting[0] ? (
                <p className="text-sm text-muted-foreground">
                  Next up:{" "}
                  <span className="font-medium text-foreground">
                    #{waiting[0].tokenNumber} {waiting[0].name}
                  </span>
                </p>
              ) : exitPhase === "available" ? (
                <p className="text-sm font-medium text-chart-2">Room available</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Share your clinic QR so patients can join the queue
                </p>
              )}
            </div>
            <Button
              size="lg"
              className="gap-2 shadow-md shadow-primary/20"
              disabled={!canCall}
              onClick={handleNext}
            >
              {busy || walkingId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <DoorOpen className="h-4 w-4" />
              )}
              Call next patient
            </Button>
          </div>
          {occupied && waiting.length > 0 && (
            <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-muted-foreground">
              Mark the current patient as done before calling the next
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function PatientFigure({
  entry,
  slot,
  isFront,
  isWalking,
  shuffling,
  idleDelay,
  walkX,
}: {
  entry: QueueEntryData;
  slot: ReturnType<typeof queueSlot>;
  isFront: boolean;
  isWalking: boolean;
  shuffling: boolean;
  idleDelay: number;
  walkX: number;
}) {
  return (
    <div
      className={cn(
        "absolute bottom-0 flex w-[64px] flex-col items-center transition-[right,opacity,transform] duration-500 ease-out",
        isWalking && "animate-queue-walk",
        shuffling && "animate-queue-shuffle-forward"
      )}
      style={{
        right: slot.right,
        zIndex: slot.zIndex,
        opacity: isWalking ? 1 : slot.opacity,
        ["--walk-x" as string]: `${Math.max(40, walkX + 20)}px`,
        ["--slot-scale" as string]: String(slot.scale),
        animationDelay: shuffling ? `${(slot.zIndex % 10) * 0.05}s` : undefined,
        transform: isWalking || shuffling ? undefined : `translateY(${slot.lift}px) scale(${slot.scale})`,
      }}
    >
      <div
        className={cn(
          "mb-1 rounded-full border bg-card px-2 py-0.5 text-[10px] font-bold shadow-sm",
          isFront ? "border-primary text-primary" : "border-border text-foreground"
        )}
      >
        #{entry.tokenNumber}
      </div>

      <div
        className={cn(!isWalking && !shuffling && "animate-queue-idle")}
        style={{ animationDelay: `${idleDelay}s` }}
      >
        <DollBody />
      </div>

      {isFront && !isWalking && (
        <p className="mt-0.5 max-w-[68px] truncate text-center text-[10px] font-semibold text-foreground">
          {entry.name.split(" ")[0]}
        </p>
      )}
    </div>
  );
}

function ExitingPatientFigure({
  entry,
  phase,
}: {
  entry: QueueEntryData;
  phase: "idle" | "leaving";
}) {
  return (
    <div
      className={cn(
        "absolute bottom-6 left-full ml-3 flex flex-col items-center",
        phase === "leaving" && "animate-queue-exit-right"
      )}
      style={{ zIndex: 40 }}
    >
      <div className="mb-1 rounded-full border border-chart-2/50 bg-card px-2 py-0.5 text-[10px] font-bold text-chart-2">
        #{entry.tokenNumber}
      </div>
      <DollBody small />
    </div>
  );
}

function DollBody({ small }: { small?: boolean }) {
  return (
    <div className={cn("relative flex flex-col items-center", small && "scale-90")}>
      <div
        className={cn(
          "relative z-10 rounded-full border-2 border-white/70 bg-primary shadow-md shadow-black/15 dark:border-background",
          small ? "h-6 w-6" : "h-7 w-7"
        )}
      >
        <div className="absolute left-1.5 top-2 h-1 w-1 rounded-full bg-black/50 dark:bg-background/80" />
        <div className="absolute right-1.5 top-2 h-1 w-1 rounded-full bg-black/50 dark:bg-background/80" />
      </div>
      <div
        className={cn(
          "-mt-1 rounded-t-2xl rounded-b-lg border-2 border-white/60 bg-primary shadow-lg shadow-black/20 brightness-90 dark:border-background dark:brightness-100",
          small ? "h-8 w-7" : "h-10 w-9"
        )}
      />
      <div
        className={cn(
          "mt-1 rounded-full blur-[1px] bg-foreground/25 dark:bg-foreground/15",
          small ? "h-1 w-6" : "h-1.5 w-8"
        )}
      />
    </div>
  );
}

function ConsultationDoor({
  inProgress,
  doorAvailable,
  occupied,
}: {
  inProgress: QueueEntryData | null;
  doorAvailable: boolean;
  occupied: boolean;
}) {
  return (
    <div className="relative flex flex-col items-center">
      <div
        className={cn(
          "mb-2 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider",
          occupied
            ? "bg-destructive/15 text-destructive"
            : doorAvailable
              ? "bg-chart-2/15 text-chart-2"
              : "bg-muted text-muted-foreground"
        )}
      >
        {occupied ? "In consultation" : doorAvailable ? "Consultation room · Available" : "Consultation room"}
      </div>

      <div className="relative flex items-end">
        <div
          className={cn(
            "absolute -left-[5.5rem] bottom-4 flex h-28 w-24 flex-col items-center justify-center rounded-lg border p-2 text-center shadow-sm transition-all duration-500",
            occupied
              ? "animate-room-glow-red border-destructive/50 bg-destructive/15 dark:border-destructive/40 dark:bg-destructive/10"
              : doorAvailable
                ? "border-chart-2/45 bg-chart-2/12 dark:border-chart-2/30 dark:bg-chart-2/5"
                : "border-border bg-muted/50 dark:bg-muted/30"
          )}
        >
          {inProgress ? (
            <>
              <Stethoscope className="mb-1 h-5 w-5 text-destructive" />
              <p className="text-[10px] font-bold text-destructive">#{inProgress.tokenNumber}</p>
              <p className="max-w-full truncate text-[9px] font-medium">{inProgress.name.split(" ")[0]}</p>
              <span
                className={cn(
                  "mt-1 rounded-full px-1.5 py-px text-[8px]",
                  reasonChipClasses(inProgress.reason)
                )}
              >
                {reasonLabel(inProgress.reason)}
              </span>
            </>
          ) : doorAvailable ? (
            <>
              <DoorOpen className="mb-1 h-5 w-5 text-chart-2" />
              <p className="text-[9px] font-medium text-chart-2">Ready</p>
            </>
          ) : (
            <p className="text-[9px] text-muted-foreground">Please wait</p>
          )}
        </div>

        <div
          className={cn(
            "relative z-10 flex h-36 w-[4.5rem] flex-col items-center justify-end rounded-t-xl border-2 pb-2 shadow-sm transition-all duration-500",
            occupied
              ? "animate-door-aura-red border-destructive/55 bg-gradient-to-b from-destructive/25 to-muted dark:border-destructive/50 dark:from-destructive/20"
              : doorAvailable
                ? "animate-door-aura-green border-chart-2/55 bg-gradient-to-b from-chart-2/20 to-muted dark:border-chart-2/50 dark:from-chart-2/15"
                : "border-border bg-gradient-to-b from-muted to-muted/80 dark:from-muted/80"
          )}
        >
          <div
            className={cn(
              "absolute inset-x-1 top-2 bottom-2 origin-left rounded-sm border bg-card/95 transition-all duration-700 ease-out",
              doorAvailable ? "scale-x-[0.2] border-chart-2/30 opacity-70" : "scale-x-100 border-border opacity-95"
            )}
          />
          <div
            className={cn(
              "relative z-10 mb-1 rounded-full p-1.5",
              occupied ? "bg-destructive/20" : doorAvailable ? "bg-chart-2/20" : "bg-muted"
            )}
          >
            {doorAvailable ? (
              <DoorOpen className="h-4 w-4 text-chart-2" />
            ) : (
              <DoorClosed className="h-4 w-4 text-destructive" />
            )}
          </div>
          <span
            className={cn(
              "relative z-10 text-[9px] font-semibold uppercase tracking-wide",
              occupied ? "text-destructive" : doorAvailable ? "text-chart-2" : "text-muted-foreground"
            )}
          >
            {doorAvailable ? "Open" : "Closed"}
          </span>
        </div>
      </div>
    </div>
  );
}
