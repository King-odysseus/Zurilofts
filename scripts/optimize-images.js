import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, '..', 'src', 'assets');
const destDir = path.join(__dirname, '..', 'public', 'images');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const files = fs.readdirSync(srcDir).filter(f => /\.(jpg|jpeg)$/i.test(f));

console.log(`Optimizing ${files.length} images to ${destDir}...\n`);

for (const file of files) {
  const srcPath = path.join(srcDir, file);
  const destPath = path.join(destDir, file.replace(/\.jpe?g$/i, '.jpg'));

  const info = await sharp(srcPath)
    .resize({ width: 1200, withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true })
    .toFile(destPath);

  const origSize = (fs.statSync(srcPath).size / 1024 / 1024).toFixed(1);
  const newSize = (info.size / 1024).toFixed(1);

  console.log(`${file}: ${origSize} MB → ${newSize} KB (${((1 - info.size / fs.statSync(srcPath).size) * 100).toFixed(0)}% smaller)`);
}

console.log('\n✅ Done!');
