export const NEW_PRESCRIPTION_FAB_VISIBLE_KEY =
  "quillrx-new-prescription-fab-visible";
export const NEW_PRESCRIPTION_FAB_VISIBILITY_EVENT =
  "quillrx-new-prescription-fab-visibility-change";

export function readNewPrescriptionFabVisible() {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(NEW_PRESCRIPTION_FAB_VISIBLE_KEY) !== "false";
}

export function subscribeNewPrescriptionFabVisible(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === NEW_PRESCRIPTION_FAB_VISIBLE_KEY) onStoreChange();
  };
  const handleVisibilityChange = () => onStoreChange();

  window.addEventListener("storage", handleStorage);
  window.addEventListener(
    NEW_PRESCRIPTION_FAB_VISIBILITY_EVENT,
    handleVisibilityChange
  );

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(
      NEW_PRESCRIPTION_FAB_VISIBILITY_EVENT,
      handleVisibilityChange
    );
  };
}

export function writeNewPrescriptionFabVisible(visible: boolean) {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    NEW_PRESCRIPTION_FAB_VISIBLE_KEY,
    visible ? "true" : "false"
  );
  window.dispatchEvent(
    new CustomEvent(NEW_PRESCRIPTION_FAB_VISIBILITY_EVENT, {
      detail: { visible },
    })
  );
}
