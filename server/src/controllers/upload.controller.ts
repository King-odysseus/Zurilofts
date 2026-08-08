import { Request, Response, NextFunction } from 'express';
import sharp from 'sharp';
import { ValidationError } from '../types/index.js';
import { storeImage } from '../utils/imageStorage.js';

// Re-export so existing consumers (app.ts static serving) keep their import.
export { UPLOAD_DIR } from '../utils/imageStorage.js';

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
      files.map(async (file) => {
        const buffer = await sharp(file.buffer)
          .rotate() // respect EXIF orientation
          // Cap very large camera images at 2400px wide (retina-friendly) but
          // never upscale. High quality + no chroma subsampling keeps photos
          // crisp; mozjpeg still trims file size noticeably.
          .resize({ width: 2400, withoutEnlargement: true })
          .jpeg({ quality: 92, mozjpeg: true, chromaSubsampling: '4:4:4' })
          .toBuffer();
        return storeImage(buffer, 'prop');
      })
    );

    res.status(201).json({ success: true, data: { urls } });
  } catch (error) {
    next(error);
  }
}
