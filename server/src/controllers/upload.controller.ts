import { Request, Response, NextFunction } from 'express';
import sharp from 'sharp';
import { ValidationError } from '../types/index.js';
import { storeImage, storeDocument } from '../utils/imageStorage.js';

// Re-export so existing consumers (app.ts static serving) keep their import.
export { UPLOAD_DIR } from '../utils/imageStorage.js';

const PDF_MIME = 'application/pdf';
// Mirrors MAX_NAME_LENGTH in utils/messageAttachments.ts.
const MAX_NAME_LENGTH = 200;

// Rotate for EXIF orientation, cap camera images at 2400px wide (retina-friendly)
// without ever upscaling, then encode as a high quality JPEG. Chat images and
// listing photos share this so an attachment costs the same bandwidth as a photo.
async function optimizeToJpeg(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize({ width: 2400, withoutEnlargement: true })
    .jpeg({ quality: 92, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toBuffer();
}

// Optimize each uploaded buffer with sharp, then persist it via the storage
// layer (Cloudinary in production, local disk in dev). Returns the public URLs
// the frontend stores and renders.
export async function uploadImages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length === 0) {
      throw new ValidationError('No image files were uploaded');
    }

    const urls = await Promise.all(
      files.map(async (file) => storeImage(await optimizeToJpeg(file.buffer), 'prop'))
    );

    res.status(201).json({ success: true, data: { urls } });
  } catch (error) {
    next(error);
  }
}

interface StoredAttachment {
  url: string;
  name: string;
  mimeType: string;
  size: number;
}

// The stored name is only a label under the file icon, so it is capped rather
// than rejected, and an empty one gets a readable fallback.
function displayName(originalName: string): string {
  const name = originalName.trim();
  return name ? name.slice(0, MAX_NAME_LENGTH) : 'Attachment';
}

async function storeAttachment(file: Express.Multer.File): Promise<StoredAttachment> {
  const name = displayName(file.originalname);

  if (file.mimetype === PDF_MIME) {
    // Documents are served exactly as received, so the size reported is the
    // size the sender's file has.
    return {
      url: await storeDocument(file.buffer, file.originalname, 'msg'),
      name,
      mimeType: PDF_MIME,
      size: file.buffer.length,
    };
  }

  // The shared image path writes JPEG, so an animated GIF keeps its first frame
  // only (the same trade-off a listing photo makes). The reported type is what is
  // actually served, not what was uploaded.
  let optimized: Buffer;
  try {
    optimized = await optimizeToJpeg(file.buffer);
  } catch {
    // sharp only fails on bytes that are not a decodable image, which is client
    // input rather than a server fault, so it must not surface as a 500.
    throw new ValidationError(`${name} could not be read as an image`);
  }

  return {
    url: await storeImage(optimized, 'msg'),
    name,
    mimeType: 'image/jpeg',
    size: optimized.length,
  };
}

// Chat attachments (images and PDFs). Any signed-in user may upload: guests and
// hosts both send files, so this deliberately skips the host-workspace gate that
// listing photos use.
export async function uploadAttachments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) {
      throw new ValidationError('No files were uploaded');
    }

    const stored = await Promise.all(files.map(storeAttachment));
    res.status(201).json({ success: true, data: { files: stored } });
  } catch (error) {
    next(error);
  }
}
