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

// The SDK auto-parses CLOUDINARY_URL from the environment; we just flip on
// https delivery. cloudinaryEnabled gates the disk fallback.
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
    } catch {
      /* old file may already be gone */
    }
    return;
  }

  if (cloudinaryEnabled && url.includes('res.cloudinary.com')) {
    const publicId = cloudinaryPublicId(url);
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch {
        /* best effort - leave orphan rather than fail the request */
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
