import crypto from "crypto";

// Symmetric encryption for the `isSecret` values inside client_notes.fields.
// The database stores secret values as "v1:<iv_b64>:<ct_b64>:<tag_b64>";
// plaintext never touches disk. The encryption key lives in the server env
// (Railway) and is never sent to the browser.
//
// Why this exists: Wi-Fi passwords, door codes, and VLAN configs would be a
// serious liability if a DB dump leaked them in plaintext. Encrypting at rest
// means a compromised backup is useless without the separately-held key.

const PREFIX = "v1:";
let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.NOTES_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "NOTES_ENCRYPTION_KEY is required. Generate one with `openssl rand -base64 32` and set it in your environment."
    );
  }
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error(
      `NOTES_ENCRYPTION_KEY must decode to 32 bytes (got ${buf.length}). Generate a new one with \`openssl rand -base64 32\`.`
    );
  }
  cachedKey = buf;
  return cachedKey;
}

export function isEncryptedSecret(value: string): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

export function encryptSecret(plaintext: string): string {
  if (plaintext === "") return "";
  const key = getKey();
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${ciphertext.toString("base64")}:${tag.toString("base64")}`;
}

export function decryptSecret(value: string): string {
  if (value === "") return "";
  // Legacy / un-encrypted values pass through unchanged so existing notes
  // keep working. Next admin edit will re-encrypt them.
  if (!isEncryptedSecret(value)) return value;
  try {
    const [, ivB64, ctB64, tagB64] = value.split(":");
    if (!ivB64 || !ctB64 || !tagB64) throw new Error("malformed");
    const key = getKey();
    const iv = Buffer.from(ivB64, "base64");
    const ciphertext = Buffer.from(ctB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString("utf8");
  } catch {
    // Corrupted blob or wrong key — surface a visible placeholder rather
    // than crashing the whole notes list.
    return "⚠️ decryption failed";
  }
}

interface NoteField {
  label?: string;
  value?: string;
  isSecret?: boolean;
}

// Round-trip helpers so routes can hand off arrays as-is.
export function encryptFieldsArray(fields: unknown): NoteField[] {
  if (!Array.isArray(fields)) return [];
  return fields.map((f) => {
    const field: NoteField = {
      label: typeof f?.label === "string" ? f.label : "",
      value: typeof f?.value === "string" ? f.value : "",
      isSecret: !!f?.isSecret,
    };
    if (field.isSecret && field.value) {
      field.value = encryptSecret(field.value);
    }
    return field;
  });
}

export function decryptFieldsArray(raw: string | null | undefined): NoteField[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((f: NoteField) => {
      if (f?.isSecret && typeof f.value === "string") {
        return { ...f, value: decryptSecret(f.value) };
      }
      return f;
    });
  } catch {
    return [];
  }
}

// Called at startup to fail fast instead of on first encryption attempt.
export function assertNoteCryptoReady(): void {
  getKey();
}
