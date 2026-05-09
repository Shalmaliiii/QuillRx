import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";

export async function storeBinary(file: File, folder: string) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() || "bin";
  const fileName = `${nanoid(12)}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), buffer);
  return `/uploads/${folder}/${fileName}`;
}
