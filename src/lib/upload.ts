import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";

export const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

export async function saveFile(file: File, type?: string): Promise<string> {
  const bytes = await file.arrayBuffer();
  let buffer = Buffer.from(bytes);

  let ext = path.extname(file.name) || ".png";

  if (type === "logo") {
    buffer = Buffer.from(await cropToCircle(buffer));
    ext = ".png";
  }

  const filename = `${uuidv4()}${ext}`;
  const uploadPath = path.join(UPLOAD_DIR, filename);

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(uploadPath, buffer);

  return `/uploads/${filename}`;
}

async function cropToCircle(input: Buffer): Promise<Buffer> {
  const image = sharp(input);
  const metadata = await image.metadata();
  const w = metadata.width || 256;
  const h = metadata.height || 256;
  const size = Math.min(w, h);

  const circleMask = Buffer.from(
    `<svg width="${size}" height="${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/>
    </svg>`
  );

  return image
    .resize(size, size, { fit: "cover", position: "centre" })
    .composite([{ input: circleMask, blend: "dest-in" }])
    .png()
    .toBuffer();
}
