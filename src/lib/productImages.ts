// Map database image paths to imported assets
import fanWhite from '@/assets/products/fan-white.jpg';
import fanBlue from '@/assets/products/fan-blue.png';
import fanGreen from '@/assets/products/fan-green.jpg';
import dockArt from '@/assets/aerial/dock-after.png';
import treesArt from '@/assets/aerial/trees-after.png';
import creekArt from '@/assets/aerial/creek-after.png';

const imageMap: Record<string, string> = {
  '/assets/products/fan-white.jpg': fanWhite,
  '/assets/products/fan-blue.png': fanBlue,
  '/assets/products/fan-green.jpg': fanGreen,
  '/assets/aerial/dock-after.png': dockArt,
  '/assets/aerial/trees-after.png': treesArt,
  '/assets/aerial/creek-after.png': creekArt,
};

/**
 * Resolves a database image path to the actual bundled asset URL.
 * Falls back to the original path if not found in the map.
 */
export function getProductImage(dbPath: string): string {
  return imageMap[dbPath] || dbPath;
}
