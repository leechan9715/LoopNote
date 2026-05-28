import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

const files = [
  'abstract_growth.png',
  'abstract_lightbulb.png', 
  'abstract_settings.png',
];

// Threshold for "dark" pixels - anything below this RGB sum is considered black background
const DARK_THRESHOLD = 45;

async function removeBlackBackground(filePath) {
  const image = sharp(filePath);
  const { width, height, channels } = await image.metadata();
  
  // Get raw pixel data with alpha channel
  const rawBuffer = await image
    .ensureAlpha()
    .raw()
    .toBuffer();
  
  const pixelCount = width * height;
  const outputBuffer = Buffer.alloc(pixelCount * 4);
  
  for (let i = 0; i < pixelCount; i++) {
    const offset = i * 4;
    const r = rawBuffer[offset];
    const g = rawBuffer[offset + 1];
    const b = rawBuffer[offset + 2];
    const a = rawBuffer[offset + 3];
    
    // Calculate brightness
    const brightness = (r + g + b);
    
    if (brightness < DARK_THRESHOLD) {
      // Very dark pixel → make fully transparent
      outputBuffer[offset] = r;
      outputBuffer[offset + 1] = g;
      outputBuffer[offset + 2] = b;
      outputBuffer[offset + 3] = 0;
    } else if (brightness < DARK_THRESHOLD * 3) {
      // Semi-dark pixel → partial transparency for smooth edge blending
      const factor = (brightness - DARK_THRESHOLD) / (DARK_THRESHOLD * 2);
      outputBuffer[offset] = r;
      outputBuffer[offset + 1] = g;
      outputBuffer[offset + 2] = b;
      outputBuffer[offset + 3] = Math.round(a * Math.min(1, factor));
    } else {
      // Normal pixel → keep as-is
      outputBuffer[offset] = r;
      outputBuffer[offset + 1] = g;
      outputBuffer[offset + 2] = b;
      outputBuffer[offset + 3] = a;
    }
  }
  
  await sharp(outputBuffer, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(filePath + '.tmp');
  
  // Replace original
  const fs = await import('fs/promises');
  await fs.rename(filePath + '.tmp', filePath);
  
  console.log(`✓ Processed: ${path.basename(filePath)} (${width}x${height})`);
}

async function main() {
  console.log('Removing black backgrounds from PNG icons...\n');
  
  for (const file of files) {
    const filePath = path.join(publicDir, file);
    try {
      await removeBlackBackground(filePath);
    } catch (err) {
      console.error(`✗ Failed: ${file} - ${err.message}`);
    }
  }
  
  console.log('\nDone! All icons now have transparent backgrounds.');
}

main();
