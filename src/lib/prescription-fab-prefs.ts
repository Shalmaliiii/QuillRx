export const FAB_PREFS_EVENT = "quillrx-fab-prefs-change";
export const FAB_STORAGE_KEY = "quillrx-fab";

export type FabPrefs = {
  enabled: boolean;
  collapsed: boolean;
  bottom: number;
  right: number;
};

const DEFAULT_PREFS: FabPrefs = {
  enabled: true,
  collapsed: false,
  bottom: 24,
  right: 24,
};

export function readFabPrefs(): FabPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(FAB_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<FabPrefs & { hidden?: boolean }>;
    return {
      enabled:
        parsed.enabled ??
        (typeof parsed.hidden === "boolean" ? !parsed.hidden : DEFAULT_PREFS.enabled),
      collapsed: parsed.collapsed ?? DEFAULT_PREFS.collapsed,
      bottom: parsed.bottom ?? DEFAULT_PREFS.bottom,
      right: parsed.right ?? DEFAULT_PREFS.right,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function writeFabPrefs(prefs: FabPrefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(FAB_STORAGE_KEY, JSON.stringify(prefs));
  window.dispatchEvent(new CustomEvent(FAB_PREFS_EVENT));
}

export function setFabEnabled(enabled: boolean) {
  writeFabPrefs({ ...readFabPrefs(), enabled });
}

export function subscribeFabPrefs(onChange: () => void) {
  const handler = () => onChange();
  window.addEventListener(FAB_PREFS_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(FAB_PREFS_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
