import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from "node:crypto";

const CIPHER = "aes-256-gcm";
const VERSION = 1;
const MASTER_KEY_ENV = "ENVELOPE_ENCRYPTION_MASTER_KEY";
const LEGACY_MASTER_KEY_ENV = "FIELD_ENCRYPTION_MASTER_KEY";

type EncryptionPurpose = "patient" | "prescription";
type AADKind = "payload" | "dek";

export type EnvelopeEncryptionContext = {
  purpose: EncryptionPurpose;
  doctorId: string;
  recordId: string;
};

export type EncryptedEnvelope = {
  version: 1;
  algorithm: "AES-256-GCM";
  keyWrapAlgorithm: "AES-256-GCM";
  keyId: string;
  iv: string;
  ciphertext: string;
  authTag: string;
  wrappedDek: {
    iv: string;
    ciphertext: string;
    authTag: string;
  };
};

let cachedMasterKey: Buffer | null = null;
let cachedMasterKeyInput: string | null = null;
let warnedAboutDevKey = false;

function readMasterKey() {
  const configuredKey =
    process.env[MASTER_KEY_ENV]?.trim() ||
    process.env[LEGACY_MASTER_KEY_ENV]?.trim() ||
    "";

  if (cachedMasterKey && cachedMasterKeyInput === configuredKey) {
    return cachedMasterKey;
  }

  if (!configuredKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`${MASTER_KEY_ENV} must be set in production`);
    }

    if (!warnedAboutDevKey) {
      console.warn(
        `${MASTER_KEY_ENV} is not set; using a development-only derived encryption key.`
      );
      warnedAboutDevKey = true;
    }

    cachedMasterKeyInput = configuredKey;
    cachedMasterKey = createHash("sha256")
      .update(`quillrx-dev-envelope:${process.env.JWT_SECRET ?? ""}`)
      .digest();
    return cachedMasterKey;
  }

  const base64Key = Buffer.from(configuredKey, "base64");
  if (base64Key.length === 32) {
    cachedMasterKeyInput = configuredKey;
    cachedMasterKey = base64Key;
    return cachedMasterKey;
  }

  if (/^[a-f0-9]{64}$/i.test(configuredKey)) {
    const hexKey = Buffer.from(configuredKey, "hex");
    if (hexKey.length === 32) {
      cachedMasterKeyInput = configuredKey;
      cachedMasterKey = hexKey;
      return cachedMasterKey;
    }
  }

  throw new Error(
    `${MASTER_KEY_ENV} must be a base64-encoded or hex-encoded 32-byte key`
  );
}

function encode(value: Buffer) {
  return value.toString("base64");
}

function decode(value: string) {
  return Buffer.from(value, "base64");
}

function authenticatedContext(
  context: EnvelopeEncryptionContext,
  kind: AADKind
) {
  return Buffer.from(
    JSON.stringify({
      version: VERSION,
      kind,
      purpose: context.purpose,
      doctorId: context.doctorId,
      recordId: context.recordId,
    }),
    "utf8"
  );
}

function encryptBuffer(plaintext: Buffer, key: Buffer, aad: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(CIPHER, key, iv);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  return {
    iv: encode(iv),
    ciphertext: encode(ciphertext),
    authTag: encode(cipher.getAuthTag()),
  };
}

function decryptBuffer(
  encrypted: { iv: string; ciphertext: string; authTag: string },
  key: Buffer,
  aad: Buffer
) {
  const decipher = createDecipheriv(CIPHER, key, decode(encrypted.iv));
  decipher.setAAD(aad);
  decipher.setAuthTag(decode(encrypted.authTag));
  return Buffer.concat([
    decipher.update(decode(encrypted.ciphertext)),
    decipher.final(),
  ]);
}

function assertEnvelope(value: unknown): asserts value is EncryptedEnvelope {
  if (
    !value ||
    typeof value !== "object" ||
    (value as EncryptedEnvelope).version !== VERSION ||
    (value as EncryptedEnvelope).algorithm !== "AES-256-GCM" ||
    (value as EncryptedEnvelope).keyWrapAlgorithm !== "AES-256-GCM" ||
    typeof (value as EncryptedEnvelope).iv !== "string" ||
    typeof (value as EncryptedEnvelope).ciphertext !== "string" ||
    typeof (value as EncryptedEnvelope).authTag !== "string" ||
    !(value as EncryptedEnvelope).wrappedDek
  ) {
    throw new Error("Invalid encrypted data envelope");
  }
}

export function isEncryptedEnvelope(value: unknown): value is EncryptedEnvelope {
  try {
    assertEnvelope(value);
    return true;
  } catch {
    return false;
  }
}

export function encryptJson(
  value: unknown,
  context: EnvelopeEncryptionContext
): EncryptedEnvelope {
  const dek = randomBytes(32);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const payload = encryptBuffer(
    plaintext,
    dek,
    authenticatedContext(context, "payload")
  );
  const wrappedDek = encryptBuffer(
    dek,
    readMasterKey(),
    authenticatedContext(context, "dek")
  );

  return {
    version: VERSION,
    algorithm: "AES-256-GCM",
    keyWrapAlgorithm: "AES-256-GCM",
    keyId: process.env.ENVELOPE_ENCRYPTION_KEY_ID ?? "local-v1",
    ...payload,
    wrappedDek,
  };
}

export function decryptJson<T>(
  encryptedValue: unknown,
  context: EnvelopeEncryptionContext
): T {
  assertEnvelope(encryptedValue);

  const dek = decryptBuffer(
    encryptedValue.wrappedDek,
    readMasterKey(),
    authenticatedContext(context, "dek")
  );
  const plaintext = decryptBuffer(
    encryptedValue,
    dek,
    authenticatedContext(context, "payload")
  );

  return JSON.parse(plaintext.toString("utf8")) as T;
}

export function generateObjectId() {
  return randomBytes(12).toString("hex");
}

export function blindIndex(scope: string, value: string) {
  return createHmac("sha256", readMasterKey())
    .update(`${scope}\0${value}`)
    .digest("base64url");
}
