// Optimiza los recursos de marca y las portadas de los juegos.
//
// Se ejecuta a mano (`npm run optimize:assets`) cuando cambian los originales.
// Los archivos generados se guardan junto a los que usa la app:
//   - src/assets/logo.webp ................ logo de la cabecera (360 px)
//   - public/Logo.png ...................... icono PWA y favicon (512 px)
//   - public/PideTietar_logo_animado.webp .. placeholder animado (240 px)
//   - public/og-image.jpg .................. imagen social 1200x630
//   - public/assets/games/<id>/*.webp ...... portadas de los juegos
//
// Los originales pesados viven en src/assets/brand/ para poder regenerarlos
// sin que Vite los copie a dist/.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const resolve = (...parts) => path.join(ROOT, ...parts);

const exists = async (file) => {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
};

const optimizeHeaderLogo = async () => {
  const source = resolve('src/assets/logo.png');
  if (!(await exists(source))) return;
  const target = resolve('src/assets/logo.webp');
  await sharp(source)
    .resize({ width: 360, withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toFile(target);
  console.log('logo.webp generado');
};

const optimizePwaLogo = async () => {
  const target = resolve('public/Logo.png');
  if (!(await exists(target))) return;
  const buffer = await sharp(target)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
  await fs.writeFile(target, buffer);
  console.log(`Logo.png optimizado (${(buffer.length / 1024).toFixed(1)} KB)`);
};

const optimizeAnimatedPlaceholder = async () => {
  const source = resolve('src/assets/brand/PideTietar_logo_animado.gif');
  if (!(await exists(source))) return;
  const target = resolve('public/PideTietar_logo_animado.webp');
  const buffer = await sharp(source, { animated: true })
    .resize({ width: 240, withoutEnlargement: true })
    .webp({ quality: 50, effort: 5 })
    .toBuffer();
  await fs.writeFile(target, buffer);
  console.log(`PideTietar_logo_animado.webp generado (${(buffer.length / 1024).toFixed(1)} KB)`);
};

const optimizeOgImage = async () => {
  const source = resolve('src/assets/brand/og-image.svg');
  if (!(await exists(source))) return;
  const target = resolve('public/og-image.jpg');
  const buffer = await sharp(source)
    .resize(1200, 630, { fit: 'cover' })
    .flatten({ background: '#fffaf5' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  await fs.writeFile(target, buffer);
  console.log(`og-image.jpg generado (${(buffer.length / 1024).toFixed(1)} KB)`);
};

const optimizeGameImages = async () => {
  const sourceRoot = resolve('src/assets/brand/games');
  const targetRoot = resolve('public/assets/games');
  const entries = await fs.readdir(sourceRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const sourceFolder = path.join(sourceRoot, entry.name);
    const targetFolder = path.join(targetRoot, entry.name);
    await fs.mkdir(targetFolder, { recursive: true });
    const files = await fs.readdir(sourceFolder);
    for (const file of files) {
      if (!/\.(png|jpe?g)$/i.test(file)) continue;
      const source = path.join(sourceFolder, file);
      const base = file.replace(/\.(png|jpe?g)$/i, '');
      const target = path.join(targetFolder, `${base}.webp`);
      const isCover = /cover/i.test(base);
      const buffer = await sharp(source)
        .resize(isCover ? { width: 720, withoutEnlargement: true } : { height: 640, withoutEnlargement: true })
        .webp({ quality: 80, effort: 4 })
        .toBuffer();
      await fs.writeFile(target, buffer);
      console.log(`${path.relative(ROOT, target)} (${(buffer.length / 1024).toFixed(1)} KB)`);
    }
  }
};

const main = async () => {
  await optimizeHeaderLogo();
  await optimizePwaLogo();
  await optimizeAnimatedPlaceholder();
  await optimizeOgImage();
  await optimizeGameImages();
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
