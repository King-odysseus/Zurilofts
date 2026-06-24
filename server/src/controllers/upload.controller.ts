import { Request, Response, NextFunction } from 'express';
import sharp from 'sharp';
import { randomBytes } from 'crypto';
import path from 'path';
import fs from 'fs';
import { ValidationError } from '../types/index.js';

// Uploaded images are optimized and written here. cwd is the server/ package
// root in every run mode (npm run dev, node dist/index.js), so this resolves
// consistently across dev and production.
export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Optimize each uploaded buffer with sharp and write it to UPLOAD_DIR.
// Returns the public paths the frontend stores and renders.
export async function uploadImages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length === 0) {
      throw new ValidationError('No image files were uploaded');
    }

    const urls = await Promise.all(
      files.map(async (file) => {
        const name = `prop-${Date.now()}-${randomBytes(4).toString('hex')}.jpg`;
        await sharp(file.buffer)
          .rotate() // respect EXIF orientation
          // Cap very large camera images at 2400px wide (retina-friendly) but
          // never upscale. High quality + no chroma subsampling keeps photos
          // crisp; mozjpeg still trims file size noticeably.
          .resize({ width: 2400, withoutEnlargement: true })
          .jpeg({ quality: 92, mozjpeg: true, chromaSubsampling: '4:4:4' })
          .toFile(path.join(UPLOAD_DIR, name));
        return `/uploads/${name}`;
      })
    );

    res.status(201).json({ success: true, data: { urls } });
  } catch (error) {
    next(error);
  }
}
