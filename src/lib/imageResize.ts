/**
 * Resizes an image file to fit within max dimensions while preserving aspect ratio.
 * Used to prepare images for QA analysis - Gemini API has ~20MB limit.
 * 
 * @param file - The original image file
 * @param maxWidth - Maximum width (default 4000)
 * @param maxHeight - Maximum height (default 4000)
 * @param quality - JPEG quality 0-1 (default 0.85)
 * @returns Resized file if needed, otherwise original file
 */
export async function resizeImageForQA(
    file: File,
    maxWidth = 4000,
    maxHeight = 4000,
    quality = 0.85
): Promise<File> {
    // Only resize images, not videos or RAW files
    if (!file.type.startsWith('image/') || file.type === 'image/gif') {
        return file;
    }

    // Skip if file is already small enough (< 8MB)
    if (file.size < 8 * 1024 * 1024) {
        return file;
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        img.onload = () => {
            let { width, height } = img;

            // Calculate new dimensions
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            } else {
                // Image dimensions are fine, but file is still large
                // Reduce quality to compress
            }

            canvas.width = width;
            canvas.height = height;

            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('Failed to compress image'));
                        return;
                    }

                    // Create new file with same name but .jpg extension
                    const newName = file.name.replace(/\.[^.]+$/, '.jpg');
                    const resizedFile = new File([blob], newName, {
                        type: 'image/jpeg',
                        lastModified: file.lastModified
                    });

                    console.log(`Resized ${file.name}: ${(file.size / 1024 / 1024).toFixed(1)}MB → ${(resizedFile.size / 1024 / 1024).toFixed(1)}MB (${width}x${height})`);
                    resolve(resizedFile);
                },
                'image/jpeg',
                quality
            );
        };

        img.onerror = () => {
            // If we can't load the image, return original
            console.warn('Could not load image for resizing, using original');
            resolve(file);
        };

        // Load image from file
        img.src = URL.createObjectURL(file);
    });
}
