import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

export async function saveFile(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = path.extname(file.name) || ".png";
  const filename = `${uuidv4()}${ext}`;
  const uploadPath = path.join(UPLOAD_DIR, filename);

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(uploadPath, buffer);

  return `/uploads/${filename}`;
}
