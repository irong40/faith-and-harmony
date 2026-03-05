/**
 * Generate watermark tile PNG for Sentinel Aerial preview images.
 * Creates a 1200x800 transparent PNG with diagonal tiled "SENTINEL AERIAL" text.
 *
 * Usage: node scripts/generate-watermark.js
 * Output: assets/watermark-tile.png
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const WIDTH = 1200;
const HEIGHT = 800;
const TEXT = 'SENTINEL AERIAL';
const FONT_SIZE = 48;
const ROTATION = -35 * (Math.PI / 180); // 35 degrees diagonal
const H_SPACING = 300;
const V_SPACING = 200;

const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext('2d');

// Transparent background (default for canvas)
ctx.clearRect(0, 0, WIDTH, HEIGHT);

ctx.font = `bold ${FONT_SIZE}px sans-serif`;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';

// Expand grid range to cover corners after rotation
const diagonal = Math.sqrt(WIDTH * WIDTH + HEIGHT * HEIGHT);
const startX = -diagonal / 2;
const startY = -diagonal / 2;
const endX = WIDTH + diagonal / 2;
const endY = HEIGHT + diagonal / 2;

for (let y = startY; y < endY; y += V_SPACING) {
  for (let x = startX; x < endX; x += H_SPACING) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ROTATION);

    // Drop shadow for visibility on light areas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillText(TEXT, 2, 2);

    // Main text with 35% opacity white
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillText(TEXT, 0, 0);

    ctx.restore();
  }
}

const outputPath = path.join(__dirname, '..', 'assets', 'watermark-tile.png');
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(outputPath, buffer);

const stats = fs.statSync(outputPath);
console.log(`Watermark tile generated: ${outputPath}`);
console.log(`File size: ${(stats.size / 1024).toFixed(1)} KB`);
console.log(`Dimensions: ${WIDTH}x${HEIGHT}`);
