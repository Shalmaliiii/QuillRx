import { NextResponse } from "next/server";
import {
  consoleForbiddenResponse,
  consoleUnauthorizedResponse,
  isConsoleIpAllowed,
  verifyConsoleRequest,
} from "@/lib/console-auth";
import {
  FIELD_ENCRYPTION_CONTROLS,
  getDataPrivacySettings,
  updateDataPrivacySettings,
  type FieldEncryptionId,
} from "@/lib/platform-settings";

export async function GET(request: Request) {
  if (!isConsoleIpAllowed(request)) {
    return consoleForbiddenResponse();
  }

  if (!verifyConsoleRequest(request)) {
    return consoleUnauthorizedResponse();
  }

  return NextResponse.json({
    settings: await getDataPrivacySettings(),
    fieldDefinitions: FIELD_ENCRYPTION_CONTROLS,
  });
}

export async function PATCH(request: Request) {
  if (!isConsoleIpAllowed(request)) {
    return consoleForbiddenResponse();
  }

  if (!verifyConsoleRequest(request)) {
    return consoleUnauthorizedResponse();
  }

  const body = await request.json();
  const currentSettings = await getDataPrivacySettings();
  const fieldEncryption = { ...currentSettings.fieldEncryption };

  if (body?.fieldEncryption && typeof body.fieldEncryption === "object") {
    for (const control of FIELD_ENCRYPTION_CONTROLS) {
      const value = (body.fieldEncryption as Partial<Record<FieldEncryptionId, boolean>>)[
        control.id
      ];
      if (typeof value === "boolean") {
        fieldEncryption[control.id] = value;
      }
    }
  } else if (typeof body?.encryptClinicalPrescriptionData === "boolean") {
    for (const control of FIELD_ENCRYPTION_CONTROLS) {
      if (control.id.startsWith("prescription.")) {
        fieldEncryption[control.id] = body.encryptClinicalPrescriptionData;
      }
    }
  }

  const settings = await updateDataPrivacySettings({ fieldEncryption });

  return NextResponse.json(settings);
}
