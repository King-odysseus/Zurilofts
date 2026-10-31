import { v2 as cloudinary } from 'cloudinary';
import { randomBytes } from 'crypto';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env.js';

// Local fallback directory - used only when Cloudinary is NOT configured
// (e.g. local development). In production on Railway the filesystem is
// ephemeral, so CLOUDINARY_URL must be set and uploads go to Cloudinary.
export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// The SDK auto-parses CLOUDINARY_URL from the environment (env.ts loads it into
// process.env), so only https delivery is set here. cloudinaryEnabled gates the
// disk fallback in storeImage and storeDocument.
export const cloudinaryEnabled = Boolean(env.CLOUDINARY_URL);
if (cloudinaryEnabled) {
  cloudinary.config({ secure: true });
}

const CLOUD_FOLDER = 'zurilofts';

/**
 * Persist an already-optimized JPEG buffer and return its public URL.
 * Uploads to Cloudinary when configured; otherwise writes to local disk
 * and returns a /uploads/* path (dev fallback).
 *
 * @param prefix short label baked into the asset name, e.g. "prop" or "avatar"
 */
export async function storeImage(buffer: Buffer, prefix: string): Promise<string> {
  const baseName = `${prefix}-${Date.now()}-${randomBytes(4).toString('hex')}`;

  if (cloudinaryEnabled) {
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder: CLOUD_FOLDER, public_id: baseName, resource_type: 'image', format: 'jpg' },
          (err, res) =>
            err || !res ? reject(err ?? new Error('Cloudinary upload failed')) : resolve(res)
        )
        .end(buffer);
    });
    return result.secure_url;
  }

  const name = `${baseName}.jpg`;
  await fs.promises.writeFile(path.join(UPLOAD_DIR, name), buffer);
  return `/uploads/${name}`;
}

// Keep only a plausible extension from a client filename ("Invoice.PDF" ->
// "pdf"). The name itself is untrusted, so anything unusual becomes "bin"
// rather than becoming part of a path.
function safeExtension(filename: string): string {
  const ext = path.extname(filename).slice(1).toLowerCase();
  return /^[a-z0-9]{1,8}$/.test(ext) ? ext : 'bin';
}

/**
 * Persist a document (PDFs today) byte for byte and return its public URL.
 *
 * A re-encode would break signatures and pagination, so the buffer is never
 * touched. Cloudinary is given resource_type "raw" because "auto" files a PDF as
 * an image and can rewrite it. Local dev writes into the same /uploads directory
 * that app.ts serves statically.
 *
 * @param prefix short label baked into the asset name, e.g. "msg"
 */
export async function storeDocument(buffer: Buffer, filename: string, prefix: string): Promise<string> {
  const baseName = `${prefix}-${Date.now()}-${randomBytes(4).toString('hex')}`;
  const ext = safeExtension(filename);

  if (cloudinaryEnabled) {
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder: CLOUD_FOLDER, public_id: baseName, resource_type: 'raw' },
          (err, res) =>
            err || !res ? reject(err ?? new Error('Cloudinary upload failed')) : resolve(res)
        )
        .end(buffer);
    });
    return result.secure_url;
  }

  // Raw Cloudinary uploads keep the extension in the public id, so the local
  // copy carries it too and express.static answers with the right content type.
  const name = `${baseName}.${ext}`;
  await fs.promises.writeFile(path.join(UPLOAD_DIR, name), buffer);
  return `/uploads/${name}`;
}

/**
 * Delete a previously-stored image by its public URL. Best-effort - handles
 * both local /uploads/* paths and Cloudinary delivery URLs. External avatars
 * (e.g. Google OAuth) are left untouched.
 */
export async function deleteImage(url: string | null | undefined): Promise<void> {
  if (!url) return;

  if (url.startsWith('/uploads/')) {
    try {
      await fs.promises.unlink(path.join(UPLOAD_DIR, path.basename(url)));
    } catch (err) {
      console.error('Failed to delete local image:', err);
    }
    return;
  }

  if (cloudinaryEnabled && url.includes('res.cloudinary.com')) {
    const publicId = cloudinaryPublicId(url);
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.error('Failed to delete Cloudinary image:', err);
      }
    }
  }
}

// Extract the "folder/public_id" from a Cloudinary delivery URL so it can be
// deleted. e.g. .../upload/v123/zurilofts/avatar-1-ab.jpg -> zurilofts/avatar-1-ab
function cloudinaryPublicId(url: string): string | null {
  const m = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z]+$/);
  return m ? m[1] : null;
}
